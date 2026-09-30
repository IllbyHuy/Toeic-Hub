import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Users, User, Info, Settings, LogOut, UserMinus, Shield, Paperclip, FileText, Music, Image as ImageIcon, CornerDownRight, MoreVertical, Pin, Copy, Reply, Share } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { formatTimeAgo } from '../utils/formatDate';

const GroupDetail = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [groupInfo, setGroupInfo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupData, setEditGroupData] = useState({ name: '', description: '', privacy: '' });
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [vaultTab, setVaultTab] = useState('TIPS');
  const [replyTo, setReplyTo] = useState(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const { socket, onlineUsers } = useSocket();
  const messagesEndRef = useRef(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchGroupInfo();
    fetchMessages();
    
    if (socket) {
      socket.emit('join_group', id); 
      
      const handleNewMessage = (msg) => {
        if (msg.groupId === id) {
          setMessages(prev => [...prev, msg]);
          api.put(`/groups/${id}/read`).catch(() => {});
        }
      };

      const handlePinned = (msg) => {
        if (msg.groupId === id) {
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
        }
      };

      const handleMessageDeleted = (deletedMsg) => {
        if (deletedMsg.groupId === id) {
          setMessages(prev => prev.map(m => m.id === deletedMsg.id ? { ...m, isDeleted: true, content: '', fileUrl: null, fileName: null } : m));
        }
      };

      socket.on('new_group_message', handleNewMessage);
      socket.on('message_pinned', handlePinned);
      socket.on('message_unpinned', handlePinned);
      socket.on('message_deleted', handleMessageDeleted);

      return () => {
        socket.emit('leave_group', id);
        socket.off('new_group_message', handleNewMessage);
        socket.off('message_pinned', handlePinned);
        socket.off('message_unpinned', handlePinned);
        socket.off('message_deleted', handleMessageDeleted);
      };
    }
  }, [id, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroupInfo = async () => {
    try {
      const res = await api.get(`/groups/${id}`);
      setGroupInfo(res.data || res);
      const data = res.data || res;
      setEditGroupData({ name: data.name, description: data.description || '', privacy: data.privacy });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải thông tin nhóm');
      window.location.href = '/groups';
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/groups/${id}/messages`);
      setMessages(res.data || []);
      setIsLoading(false);
      api.put(`/groups/${id}/read`).catch(() => {});
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', editGroupData.name);
      formData.append('description', editGroupData.description);
      formData.append('privacy', editGroupData.privacy);
      if (editAvatarFile) {
        formData.append('avatar', editAvatarFile);
      }
      
      const res = await api.put(`/groups/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGroupInfo(prev => ({ ...prev, ...(res.data || res) }));
      setIsEditingGroup(false);
      setEditAvatarFile(null);
      toast.success('Cập nhật nhóm thành công');
    } catch (err) {
      toast.error('Lỗi khi cập nhật nhóm');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    setIsSending(true);
    try {
      const formData = new FormData();
      if (newMessage.trim()) formData.append('content', newMessage.trim());
      if (selectedFile) formData.append('file', selectedFile);
      if (replyTo) formData.append('parentId', replyTo.id);

      await api.post(`/groups/${id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewMessage('');
      setSelectedFile(null);
      setReplyTo(null);
    } catch (error) {
      toast.error('Lỗi khi gửi tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const sharedTips = messages.reduce((acc, msg) => {
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.type === 'SHARED_TIP') {
        acc.push({ ...parsed, createdAt: msg.createdAt, id: msg.id });
      }
    } catch (e) {}
    return acc;
  }, []);

  const sharedPosts = messages.reduce((acc, msg) => {
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.type === 'SHARED_POST') {
        acc.push({ ...parsed, createdAt: msg.createdAt, id: msg.id, authorName: parsed.authorName || 'Người dùng' });
      }
    } catch (e) {}
    return acc;
  }, []);

  const handlePin = async (msgId, type) => {
    try {
      await api.put(`/groups/${id}/messages/${msgId}/pin`, { pinType: type });
      toast.success('Đã ghim tin nhắn');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi ghim');
    }
  };

  const handleUnpin = async (msgId) => {
    try {
      await api.put(`/groups/${id}/messages/${msgId}/unpin`);
      toast.success('Đã bỏ ghim');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi bỏ ghim');
    }
  };

  const handleForward = (msg) => {
    toast.success('Tính năng đang phát triển'); // Replace with modal later
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await api.delete(`/groups/${id}/messages/${msgId}`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true, content: '', fileUrl: null, fileName: null } : m));
      toast.success('Đã thu hồi tin nhắn');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi thu hồi tin nhắn');
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6">
      
      {/* Left Pane - Boxchat */}
      <div className="flex-1 bg-white rounded-3xl flex flex-col overflow-hidden border border-slate-200/60 shadow-xl h-full relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="bg-white/80 border-b border-slate-100 p-4 px-6 flex justify-between items-center z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-100 to-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden border border-slate-200 shadow-sm">
              {groupInfo?.avatar ? <img src={groupInfo.avatar} className="w-full h-full object-cover" /> : <Users size={24} />}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 leading-tight">{groupInfo?.name || 'Phòng Thảo Luận'}</h2>
              <p className="text-[13px] font-medium flex items-center gap-1 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shadow-sm"></span> {groupInfo?._count?.members || 1} thành viên
              </p>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-full transition-colors focus:ring-2 focus:ring-primary/20 outline-none">
            {showSettings ? <Info size={20} /> : <Settings size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center mt-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <Send size={24} className="text-slate-400 ml-1" />
              </div>
              <span className="text-base font-medium">Chưa có tin nhắn nào. Gửi lời chào đi!</span>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.userId === user.id;
              const showAvatar = !isMe && (idx === 0 || messages[idx - 1].userId !== msg.userId);

              const isAudioFile = msg.fileName?.match(/\.(mp3|wav|m4a|ogg|aac|flac|wma|amr|opus)$/i) || msg.fileUrl?.match(/\.(mp3|wav|m4a|ogg|aac|flac|wma|amr|opus)$/i);

              if (msg.isSystem) {
                return (
                  <div key={msg.id || idx} className="flex justify-center w-full my-4">
                    <span className="bg-slate-100 text-slate-500 text-xs px-4 py-1.5 rounded-full font-medium shadow-sm border border-slate-200">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group gap-3`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1">
                      {showAvatar ? (
                        msg.user?.avatarUrl ? (
                          <img src={msg.user.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover shadow-sm border border-slate-200 cursor-pointer" onClick={() => window.location.href = `/users/${msg.user?.id}`} />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-100 to-primary/20 flex items-center justify-center text-primary font-bold text-xs shadow-sm cursor-pointer" onClick={() => window.location.href = `/users/${msg.user?.id}`}>
                            {msg.user?.fullName?.charAt(0) || '?'}
                          </div>
                        )
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                    {!isMe && showAvatar && (
                      <span className="text-[10px] font-semibold text-slate-500 ml-1 mb-1">{msg.user?.fullName}</span>
                    )}
                    
                    {msg.isPinned && (
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${isMe ? 'text-blue-500 justify-end' : 'text-blue-500 justify-start'} mb-1`}>
                        <Pin size={10} />
                        Đã ghim ({msg.pinType === 'GENERAL' ? 'Thường' : msg.pinType === 'TIP' ? 'Tips' : 'Từ vựng'})
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 w-full relative group/msg">
                      
                      {msg.parent && (
                        <div className={`text-xs p-2 rounded-lg mb-1 opacity-80 border-l-2 ${isMe ? 'bg-white/20 border-white text-white' : 'bg-slate-100 border-primary text-slate-600'}`}>
                          <div className="font-bold flex items-center gap-1"><Reply size={10}/> {msg.parent.user?.fullName}</div>
                          <div className="truncate max-w-[200px]">{msg.parent.content || 'Đính kèm'}</div>
                        </div>
                      )}

                      {msg.isDeleted ? (
                        <div className={`rounded-2xl shadow-sm italic text-slate-400 ${
                          isMe 
                            ? 'bg-gradient-to-br from-indigo-100 to-blue-50 border border-indigo-100 rounded-tr-sm' 
                            : 'bg-slate-50 border border-slate-100 rounded-tl-sm'
                        }`}>
                          <p className="text-[13px] p-3">Tin nhắn đã bị thu hồi</p>
                        </div>
                      ) : msg.content && msg.content.trim() !== '' && (
                        <div className={`rounded-2xl shadow-sm ${
                          isMe 
                            ? 'bg-gradient-to-br from-indigo-600 to-blue-500 text-white rounded-tr-sm' 
                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                        }`}>
                          {(() => {
                            try {
                              const parsed = JSON.parse(msg.content);
                              if (parsed.type === 'SHARED_TIP') {
                                return (
                                  <div className="p-1 w-64 md:w-72">
                                    <div className={`flex flex-col gap-2 p-3 rounded-xl ${isMe ? 'bg-white text-slate-800 shadow-sm' : 'bg-slate-50 text-slate-800 border border-slate-200'}`}>
                                      <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                                        Tip được chia sẻ
                                      </div>
                                      <h4 className="font-bold text-sm line-clamp-2 leading-tight">{parsed.title}</h4>
                                      <div className="text-xs p-2 rounded-lg bg-orange-50 text-orange-800 border border-orange-100 font-medium">
                                        💡 {parsed.structure}
                                      </div>
                                      {parsed.description && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{parsed.description}</p>}
                                      <a href={`/tips`} className="mt-1 text-xs block text-center font-bold py-2 rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100">
                                        Xem chi tiết Tip
                                      </a>
                                    </div>
                                  </div>
                                );
                              }
                              if (parsed.type === 'SHARED_POST') {
                                return (
                                  <div className="p-1 w-64 md:w-72">
                                    <div className={`flex flex-col gap-2 p-3 rounded-xl ${isMe ? 'bg-white text-slate-800 shadow-sm' : 'bg-slate-50 text-slate-800 border border-slate-200'}`}>
                                      <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1">
                                        <FileText size={12} />
                                        Bài viết được chia sẻ
                                      </div>
                                      <h4 className="font-bold text-sm line-clamp-2 leading-tight">{parsed.title}</h4>
                                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{parsed.content}</p>
                                      <a href={`/posts/${parsed.id}`} className="mt-1 text-xs block text-center font-bold py-2 rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100">
                                        Xem bài viết
                                      </a>
                                    </div>
                                  </div>
                                );
                              }
                            } catch (e) {
                              // Not a JSON or normal message
                            }
                            return <p className="text-sm p-3 whitespace-pre-wrap leading-relaxed">{msg.content}</p>;
                          })()}
                        </div>
                      )}

                      {/* File Rendering */}
                      {msg.fileUrl && (
                        <div className={`overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white text-slate-700 ${isAudioFile ? 'w-full min-w-[250px] sm:w-[400px] lg:w-[550px]' : 'max-w-[200px] md:max-w-[250px]'}`}>
                          {msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                              <img src={msg.fileUrl} alt="attachment" className="w-full h-auto object-cover hover:opacity-90 transition-opacity" />
                            </a>
                          ) : msg.fileName?.match(/\.(mp3|wav|m4a|ogg|aac|flac|wma|amr|opus)$/i) || msg.fileUrl.match(/\.(mp3|wav|m4a|ogg|aac|flac|wma|amr|opus)$/i) ? (
                            <div className="p-3 bg-indigo-50/50 flex flex-col gap-2 border-b border-indigo-100/50">
                              <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-700 truncate px-1">
                                🎵 {msg.fileName || 'Âm thanh'}
                              </div>
                              <audio controls src={msg.fileUrl} className="w-full h-10 rounded-full outline-none"></audio>
                            </div>
                          ) : msg.fileName?.match(/\.(mp4|webm)$/i) || msg.fileUrl.endsWith('.mp4') ? (
                            <video controls className="w-full h-auto max-h-48 outline-none bg-black">
                              <source src={msg.fileUrl} type="video/mp4" />
                            </video>
                          ) : (
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-indigo-600">
                              <FileText size={20} className="flex-shrink-0" />
                              <span className="text-sm font-semibold truncate">{msg.fileName || 'Tệp đính kèm'}</span>
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Message Actions Menu */}
                      <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-10' : '-right-10'} opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col gap-1`}>
                        <button onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200 bg-white">
                          <MoreVertical size={14} />
                        </button>
                        
                        {activeMessageMenu === msg.id && (
                          <div className={`absolute top-0 ${isMe ? '-left-32' : 'left-8'} z-50 bg-white border border-slate-200 shadow-lg rounded-xl w-32 py-1 text-xs font-semibold text-slate-700`}>
                            <button onClick={() => { setReplyTo(msg); setActiveMessageMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors">
                              <Reply size={14} /> Trả lời
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Đã sao chép'); setActiveMessageMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors">
                              <Copy size={14} /> Sao chép
                            </button>
                            <button onClick={() => { handleForward(msg); setActiveMessageMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors">
                              <Share size={14} /> Chuyển tiếp
                            </button>
                            
                            {/* Pin Options for All Members */}
                            <div className="h-px bg-slate-100 my-1"></div>
                            {msg.isPinned ? (
                              <button onClick={() => { handleUnpin(msg.id); setActiveMessageMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors">
                                <Pin size={14} /> Bỏ ghim
                              </button>
                            ) : (
                              <div className="relative group/pin">
                                <button className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-2"><Pin size={14} /> Ghim</div>
                                  <CornerDownRight size={12} className="text-slate-400" />
                                </button>
                                <div className={`absolute top-0 ${isMe ? '-left-32' : 'left-full'} hidden group-hover/pin:block bg-white border border-slate-200 shadow-lg rounded-xl w-32 py-1`}>
                                  <button onClick={() => { handlePin(msg.id, 'GENERAL'); setActiveMessageMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">Thường</button>
                                  <button onClick={() => { handlePin(msg.id, 'TIP'); setActiveMessageMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">Tips</button>
                                  <button onClick={() => { handlePin(msg.id, 'VOCABULARY'); setActiveMessageMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">Từ vựng</button>
                                </div>
                              </div>
                            )}

                            {(isMe || groupInfo?.creatorId === user.id) && (
                              <>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <button onClick={() => { handleDeleteMessage(msg.id); setActiveMessageMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                  Thu hồi
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTimeAgo(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white/80 border-t border-slate-100 backdrop-blur-md">
          {replyTo && (
            <div className="flex items-center justify-between bg-slate-50 p-2 px-4 border-l-4 border-primary text-sm mb-2 rounded-r-lg">
              <div>
                <div className="font-bold text-primary flex items-center gap-1"><Reply size={14}/> Đang trả lời {replyTo.user?.fullName}</div>
                <div className="text-slate-600 truncate max-w-md">{replyTo.content || 'Đính kèm'}</div>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-red-500 bg-white rounded-full p-1 shadow-sm">✕</button>
            </div>
          )}
          {selectedFile && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
              <Paperclip size={14} />
              <span className="font-semibold truncate max-w-[200px]">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="ml-auto text-indigo-400 hover:text-indigo-600 font-bold px-2 py-0.5 rounded-md hover:bg-indigo-100">✕</button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <label className="cursor-pointer p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors">
              <input type="file" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
              <Paperclip size={20} />
            </label>
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              className="flex-1 bg-slate-100 border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              placeholder="Nhập tin nhắn..."
            />
            <button 
              type="submit"
              disabled={(!newMessage.trim() && !selectedFile) || isSending}
              className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md"
            >
              {isSending ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> : <Send size={18} className="ml-1" />}
            </button>
          </form>
        </div>
      </div>

      {/* Right Pane - Info / Feed / Settings */}
      <div className="w-full md:w-1/3 glass-card rounded-2xl flex flex-col overflow-hidden border border-slate-200/60 shadow-lg h-full">
        {showSettings ? (
          <>
            <div className="p-4 border-b border-slate-100 bg-white/50">
              <h3 className="font-bold text-lg text-slate-800">Thông tin nhóm</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                {isEditingGroup ? (
                  <form onSubmit={handleUpdateGroup} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Tên nhóm</label>
                      <input type="text" value={editGroupData.name} onChange={e => setEditGroupData({...editGroupData, name: e.target.value})} className="w-full text-sm border rounded px-2 py-1" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Mô tả</label>
                      <textarea value={editGroupData.description} onChange={e => setEditGroupData({...editGroupData, description: e.target.value})} className="w-full text-sm border rounded px-2 py-1 resize-none" rows="2" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Quyền riêng tư</label>
                      <select value={editGroupData.privacy} onChange={e => setEditGroupData({...editGroupData, privacy: e.target.value})} className="w-full text-sm border rounded px-2 py-1">
                        <option value="PUBLIC">Công khai</option>
                        <option value="PRIVATE">Kín</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Đổi ảnh đại diện</label>
                      <input type="file" accept="image/*" onChange={e => setEditAvatarFile(e.target.files[0])} className="w-full text-xs border rounded p-1" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setIsEditingGroup(false)} className="text-xs px-3 py-1 bg-slate-100 rounded">Hủy</button>
                      <button type="submit" className="text-xs px-3 py-1 bg-indigo-600 text-white rounded font-bold">Lưu</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm text-slate-600">{groupInfo?.description || 'Chưa có mô tả'}</p>
                      {groupInfo?.creatorId === user.id && (
                        <button onClick={() => setIsEditingGroup(true)} className="text-indigo-600 text-xs font-bold bg-indigo-50 px-2 py-1 rounded">Sửa</button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
                        {groupInfo?.privacy === 'PUBLIC' ? 'Công khai' : 'Kín'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {groupInfo?.creatorId === user.id && groupInfo?.requests?.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-1">
                    <Shield size={16} /> Yêu cầu tham gia ({groupInfo.requests.length})
                  </h4>
                  <div className="space-y-2 mb-4">
                    {groupInfo.requests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = `/users/${req.userId}`}>
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold overflow-hidden shadow-sm">
                            {req.user?.avatarUrl ? <img src={req.user.avatarUrl} className="w-full h-full object-cover" /> : req.user?.fullName?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{req.user?.fullName}</p>
                            <p className="text-[10px] text-amber-600 font-medium">Chờ duyệt</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={async () => {
                              try {
                                await api.put(`/groups/${id}/requests/${req.userId}/accept`);
                                setGroupInfo(prev => ({ 
                                  ...prev, 
                                  requests: prev.requests.filter(r => r.userId !== req.userId),
                                  members: [...prev.members, { userId: req.userId, role: 'MEMBER', user: req.user }] 
                                }));
                                toast.success('Đã duyệt thành viên');
                              } catch (e) { toast.error('Lỗi khi duyệt'); }
                            }}
                            className="text-[11px] font-bold text-white bg-primary hover:bg-primary-hover px-2 py-1 rounded shadow-sm"
                          >
                            Duyệt
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                await api.put(`/groups/${id}/requests/${req.userId}/reject`);
                                setGroupInfo(prev => ({ 
                                  ...prev, 
                                  requests: prev.requests.filter(r => r.userId !== req.userId)
                                }));
                                toast.success('Đã từ chối');
                              } catch (e) { toast.error('Lỗi khi từ chối'); }
                            }}
                            className="text-[11px] font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-1">
                  <Users size={16} /> Thành viên ({groupInfo?.members?.length || 0})
                </h4>
                <div className="space-y-2">
                  {groupInfo?.members?.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-lg">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = `/users/${member.userId}`}>
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shadow-sm">
                            {member.user?.avatarUrl ? <img src={member.user.avatarUrl} className="w-full h-full object-cover" /> : member.user?.fullName?.charAt(0)}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${onlineUsers?.has(member.userId) ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{member.user?.fullName}</p>
                          <p className="text-[10px] text-slate-500">{member.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}</p>
                        </div>
                      </div>
                      
                      {groupInfo?.creatorId === user.id && member.userId !== user.id && (
                        <button 
                          onClick={async () => {
                            if (window.confirm('Bạn có chắc muốn đuổi người này khỏi nhóm?')) {
                              try {
                                await api.delete(`/groups/${id}/members/${member.userId}`);
                                setGroupInfo(prev => ({ ...prev, members: prev.members.filter(m => m.userId !== member.userId) }));
                                toast.success('Đã đuổi khỏi nhóm');
                              } catch (e) { toast.error('Lỗi'); }
                            }
                          }}
                          className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                        >
                          Đuổi
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white">
              <button 
                onClick={async () => {
                  if (window.confirm('Bạn có chắc chắn muốn rời nhóm?')) {
                    try {
                      await api.delete(`/groups/${id}/members/${user.id}`);
                      toast.success('Đã rời nhóm');
                      window.location.href = '/groups';
                    } catch (err) {
                      toast.error('Lỗi khi rời nhóm');
                    }
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold py-2 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut size={18} /> Rời nhóm
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-10 pointer-events-none"></div>
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <Shield className="text-primary" size={20} />
                Kho tài nguyên nhóm
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setVaultTab('TIPS')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-bold rounded-xl transition-all ${vaultTab === 'TIPS' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'}`}
                >
                  💡 Tips
                </button>
                <button 
                  onClick={() => setVaultTab('FEED')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-bold rounded-xl transition-all ${vaultTab === 'FEED' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'}`}
                >
                  📰 Feed
                </button>
                <button 
                  onClick={() => setVaultTab('FILES')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-bold rounded-xl transition-all ${vaultTab === 'FILES' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'}`}
                >
                  📎 Tệp
                </button>
                <button 
                  onClick={() => setVaultTab('PINNED')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-bold rounded-xl transition-all ${vaultTab === 'PINNED' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'}`}
                >
                  <Pin size={16}/> Ghim
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30 custom-scrollbar">
              {vaultTab === 'TIPS' && (
                sharedTips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <span className="text-2xl">💡</span>
                    </div>
                    <span className="text-sm font-medium">Chưa có Tip nào được chia sẻ.</span>
                  </div>
                ) : (
                  sharedTips.map((tip, idx) => (
                    <div key={tip.id || idx} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                      <h4 className="font-bold text-slate-800 text-[15px] mb-2 leading-tight group-hover:text-primary transition-colors">{tip.title}</h4>
                      <div className="text-[13px] p-3 rounded-xl bg-orange-50 text-orange-800 border border-orange-100/50 font-medium mb-3">
                        <span className="opacity-70 mr-1">💡</span> {tip.structure}
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                        <span className="flex items-center gap-1.5"><Shield size={12}/> {formatTimeAgo(tip.createdAt)}</span>
                        <a href="/tips" className="text-primary font-bold hover:underline bg-primary/5 px-2 py-1 rounded-md">Xem Tip</a>
                      </div>
                    </div>
                  ))
                )
              )}

              {vaultTab === 'FEED' && (
                sharedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <FileText size={24} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium">Chưa có bài viết nào được chia sẻ.</span>
                  </div>
                ) : (
                  sharedPosts.map((post, idx) => (
                    <div key={post.id || idx} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                      <h4 className="font-bold text-slate-800 text-[15px] mb-2 leading-tight group-hover:text-primary transition-colors">{post.title}</h4>
                      <p className="text-[12px] text-slate-500 mb-3 line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                      <div className="text-[11px] font-medium text-slate-400 flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                        <span className="flex items-center gap-1.5"><Shield size={12}/> {formatTimeAgo(post.createdAt)}</span>
                        <a href={`/posts/${post.id}`} className="text-primary font-bold hover:underline bg-primary/5 px-2 py-1 rounded-md">Xem bài viết</a>
                      </div>
                    </div>
                  ))
                )
              )}

              {vaultTab === 'FILES' && (
                messages.filter(m => m.fileUrl).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <FileText size={24} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium">Chưa có tài liệu đính kèm.</span>
                  </div>
                ) : (
                  messages.filter(m => m.fileUrl).reverse().map((msg, idx) => (
                    <div key={msg.id || idx} className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col group">
                      <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                          {msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={24} className="opacity-80" /> :
                           msg.fileName?.match(/\.(mp3|wav|ogg)$/i) || msg.fileUrl.endsWith('.mp3') ? <Music size={24} className="opacity-80" /> :
                           <FileText size={24} className="opacity-80" />}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="font-bold text-[14px] text-slate-800 truncate group-hover:text-primary transition-colors" title={msg.fileName}>{msg.fileName || 'Tệp đính kèm'}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-4 h-4 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                               {msg.user?.avatarUrl ? <img src={msg.user.avatarUrl} className="w-full h-full object-cover"/> : <User size={10} className="m-auto text-slate-500 mt-0.5"/>}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate font-medium">{msg.user?.fullName}</p>
                          </div>
                        </div>
                      </a>
                      <div className="flex justify-end mt-2 pt-2 border-t border-slate-50">
                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                           {formatTimeAgo(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}

              {vaultTab === 'PINNED' && (
                messages.filter(m => m.isPinned).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <Pin size={24} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium">Chưa có tin nhắn ghim.</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {['GENERAL', 'TIP', 'VOCABULARY'].map(type => {
                      const typeMsgs = messages.filter(m => m.isPinned && m.pinType === type);
                      if (typeMsgs.length === 0) return null;
                      
                      const typeName = type === 'GENERAL' ? 'Ghi chú chung' : type === 'TIP' ? 'Tips quan trọng' : 'Từ vựng cần nhớ';
                      const typeIcon = type === 'GENERAL' ? '📌' : type === 'TIP' ? '💡' : '📚';

                      return (
                        <div key={type}>
                          <h4 className="font-bold text-[13px] text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                            {typeIcon} {typeName}
                          </h4>
                          <div className="space-y-3">
                            {typeMsgs.map(msg => (
                              <div key={msg.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-100">
                                      {msg.user?.avatarUrl ? <img src={msg.user.avatarUrl} /> : <div className="text-[10px] font-bold text-center mt-0.5">{msg.user?.fullName?.charAt(0)}</div>}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">{msg.user?.fullName}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">{formatTimeAgo(msg.createdAt)}</span>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.content || 'Đính kèm'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupDetail;
