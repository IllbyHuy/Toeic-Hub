import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, User, Paperclip, FileText, MoreVertical, Reply, Copy, Share, Pin, CornerDownRight, Image as ImageIcon, Music } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { formatTimeAgo } from '../utils/formatDate';

const Messages = () => {
  const { id } = useParams(); // targetUserId
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [targetUser, setTargetUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [vaultTab, setVaultTab] = useState('TIPS'); // TIPS, FEED, FILES, PINNED
  const { socket, onlineUsers } = useSocket();
  const messagesEndRef = useRef(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isOnline = onlineUsers?.has(id);

  useEffect(() => {
    fetchMessages();
    fetchTargetUser();
    
    if (socket) {
      socket.emit('join_group', user.id);
      
      const handleNewMessage = (msg) => {
        if (msg.senderId === id || msg.senderId === user.id) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      };
      const handleMessagesRead = (data) => {
        // If the other user read our messages
        if (data.readerId === id) {
          setMessages(prev => prev.map(m => m.senderId === user.id ? { ...m, isRead: true } : m));
        }
      };

      const handleMessageDeleted = (deletedMsg) => {
        setMessages(prev => prev.map(m => m.id === deletedMsg.id ? { ...m, isDeleted: true, content: '', fileUrl: null, fileName: null } : m));
      };
      
      socket.on('new_direct_message', handleNewMessage);
      socket.on('messages_read', handleMessagesRead);
      socket.on('message_deleted', handleMessageDeleted);
      
      return () => {
        socket.off('new_direct_message', handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
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

  const fetchTargetUser = async () => {
    try {
      const res = await api.get(`/users/${id}`);
      setTargetUser(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${id}`);
      setMessages(res.data?.messages || []);
      setIsLoading(false);
      await api.put(`/messages/${id}/read`).catch(() => {});
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('content', newMessage.trim());
      if (selectedFile) formData.append('file', selectedFile);
      if (replyTo) formData.append('parentId', replyTo.id);

      const res = await api.post(`/messages/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewMessage('');
      setSelectedFile(null);
      setReplyTo(null);
      setMessages(prev => {
        if (prev.find(m => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
    } catch (error) {
      toast.error('Lỗi khi gửi tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const handlePin = async (msgId, type) => {
    try {
      await api.put(`/messages/pin/${msgId}`, { pinType: type });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: true, pinType: type } : m));
      toast.success('Đã ghim tin nhắn');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi ghim');
    }
  };

  const handleUnpin = async (msgId) => {
    try {
      await api.put(`/messages/unpin/${msgId}`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: false, pinType: null } : m));
      toast.success('Đã bỏ ghim');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi bỏ ghim');
    }
  };

  const handleForward = (msg) => {
    toast.success('Tính năng đang phát triển');
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true, content: '', fileUrl: null, fileName: null } : m));
      toast.success('Đã thu hồi tin nhắn');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi thu hồi tin nhắn');
    }
  };

  // Find the index of the last message sent by ME that is READ
  const lastReadMessageIndex = [...messages].reverse().findIndex(m => m.senderId === user.id && m.isRead);
  const actualLastReadIndex = lastReadMessageIndex !== -1 ? messages.length - 1 - lastReadMessageIndex : -1;

  // Get pinned messages for sidebar
  const pinnedMessages = messages.filter(m => m.isPinned);

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

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6">
      
      {/* Left Pane - Chat */}
      <div className="flex-1 bg-white rounded-3xl flex flex-col overflow-hidden border border-slate-200/60 shadow-xl h-full relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Header */}
        <div className="bg-white/80 border-b border-slate-100 p-4 px-6 flex justify-between items-center z-10 backdrop-blur-md">
          <div 
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
            onClick={() => window.location.href = `/users/${id}`}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-slate-200 shadow-sm">
                {targetUser?.avatarUrl ? <img src={targetUser.avatarUrl} className="w-full h-full object-cover" /> : <User size={24} />}
              </div>
              <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></div>
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 leading-tight">{targetUser?.fullName || 'Đang tải...'}</h2>
              <p className="text-[13px] font-medium flex items-center gap-1 mt-0.5">
                {isOnline ? <span className="text-green-500 font-bold">Trực tuyến</span> : <span className="text-slate-400">Ngoại tuyến</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center mt-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <Send size={24} className="text-slate-400 ml-1" />
              </div>
              <span className="text-base font-medium">Bắt đầu trò chuyện với {targetUser?.fullName}</span>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === user.id;
              const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
              const isLastRead = idx === actualLastReadIndex;

              return (
                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group gap-3`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1">
                      {showAvatar ? (
                        targetUser?.avatarUrl ? (
                          <img src={targetUser.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover shadow-sm border border-slate-200 cursor-pointer" onClick={() => window.location.href = `/users/${id}`} />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm cursor-pointer" onClick={() => window.location.href = `/users/${id}`}>
                            {targetUser?.fullName?.charAt(0)}
                          </div>
                        )
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    
                    {msg.isPinned && (
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${isMe ? 'text-blue-500 justify-end' : 'text-blue-500 justify-start'} mb-1`}>
                        <Pin size={10} />
                        Đã ghim ({msg.pinType === 'GENERAL' ? 'Thường' : msg.pinType === 'TIP' ? 'Tips' : 'Từ vựng'})
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 w-full relative group/msg">
                      
                      {msg.parent && (
                        <div className={`text-xs p-2 rounded-lg mb-1 opacity-80 border-l-2 ${isMe ? 'bg-white/20 border-white text-white' : 'bg-slate-100 border-indigo-500 text-slate-600'}`}>
                          <div className="font-bold flex items-center gap-1"><Reply size={10}/> {msg.parent.sender?.fullName}</div>
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
                                      <a href={`/tips`} className="mt-1 text-xs block text-center font-bold py-2 rounded-lg transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100">
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
                                      <a href={`/posts/${parsed.id}`} className="mt-1 text-xs block text-center font-bold py-2 rounded-lg transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100">
                                        Xem bài viết
                                      </a>
                                    </div>
                                  </div>
                                );
                              }
                            } catch (e) {}
                            return <p className="text-sm p-3 whitespace-pre-wrap leading-relaxed">{msg.content}</p>;
                          })()}
                        </div>
                      )}

                      {/* File Rendering */}
                      {msg.fileUrl && (
                        <div className={`max-w-[200px] md:max-w-[250px] overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white text-slate-700`}>
                          {msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                              <img src={msg.fileUrl} alt="attachment" className="w-full h-auto object-cover hover:opacity-90 transition-opacity" />
                            </a>
                          ) : msg.fileName?.match(/\.(mp3|wav|ogg)$/i) || msg.fileUrl.endsWith('.mp3') || msg.fileUrl.endsWith('.wav') ? (
                            <div className="p-2 bg-slate-50">
                              <audio controls className="w-full h-10 outline-none">
                                <source src={msg.fileUrl} type="audio/mpeg" />
                              </audio>
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
                            
                            {/* Pin Options */}
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

                            {isMe && (
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
                    
                    {/* Timestamp & Read Status */}
                    <div className="flex items-center gap-2 mt-1 h-4">
                      <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTimeAgo(msg.createdAt)}
                      </span>
                      {isMe && isLastRead && (
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 ml-1">
                          Đã xem
                          {targetUser?.avatarUrl ? (
                            <img src={targetUser.avatarUrl} className="w-3.5 h-3.5 rounded-full object-cover shadow-sm" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center">
                              <User size={8} className="text-slate-500" />
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white/80 border-t border-slate-100 backdrop-blur-md">
          {replyTo && (
            <div className="flex items-center justify-between bg-slate-50 p-2 px-4 border-l-4 border-indigo-500 text-sm mb-2 rounded-r-lg">
              <div>
                <div className="font-bold text-indigo-600 flex items-center gap-1"><Reply size={14}/> Đang trả lời {replyTo.sender?.fullName || targetUser?.fullName}</div>
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

      {/* Right Pane - Pinned & Shared Resources */}
      <div className="w-full md:w-1/3 glass-card rounded-2xl flex flex-col overflow-hidden border border-slate-200/60 shadow-lg h-full">
        <div className="p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -z-10 pointer-events-none"></div>
          <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <Pin className="text-indigo-600" size={20} />
            Kho tài nguyên
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setVaultTab('TIPS')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-bold rounded-xl transition-all ${vaultTab === 'TIPS' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'}`}
            >
              💡 Tips
            </button>
            <button 
              onClick={() => setVaultTab('FEED')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-bold rounded-xl transition-all ${vaultTab === 'FEED' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'}`}
            >
              📰 Feed
            </button>
            <button 
              onClick={() => setVaultTab('FILES')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-bold rounded-xl transition-all ${vaultTab === 'FILES' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'}`}
            >
              📎 Tệp
            </button>
            <button 
              onClick={() => setVaultTab('PINNED')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-bold rounded-xl transition-all ${vaultTab === 'PINNED' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'}`}
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
                <div key={tip.id || idx} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-400/30 transition-all group">
                  <h4 className="font-bold text-slate-800 text-[15px] mb-2 leading-tight group-hover:text-indigo-600 transition-colors">{tip.title}</h4>
                  <div className="text-[13px] p-3 rounded-xl bg-orange-50 text-orange-800 border border-orange-100/50 font-medium mb-3">
                    <span className="opacity-70 mr-1">💡</span> {tip.structure}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400 flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                    <span className="flex items-center gap-1.5">{formatTimeAgo(tip.createdAt)}</span>
                    <a href="/tips" className="text-indigo-600 font-bold hover:underline bg-indigo-50 px-2 py-1 rounded-md">Xem Tip</a>
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
                <div key={post.id || idx} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-400/30 transition-all group">
                  <h4 className="font-bold text-slate-800 text-[15px] mb-2 leading-tight group-hover:text-indigo-600 transition-colors">{post.title}</h4>
                  <p className="text-[12px] text-slate-500 mb-3 line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>
                  <div className="text-[11px] font-medium text-slate-400 flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                    <span className="flex items-center gap-1.5">{formatTimeAgo(post.createdAt)}</span>
                    <a href={`/posts/${post.id}`} className="text-indigo-600 font-bold hover:underline bg-indigo-50 px-2 py-1 rounded-md">Xem bài viết</a>
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
                <div key={msg.id || idx} className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-400/30 transition-all flex flex-col group">
                  <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      {msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={20} /> :
                       msg.fileName?.match(/\.(mp3|wav|ogg)$/i) || msg.fileUrl.endsWith('.mp3') ? <Music size={20} /> :
                       <FileText size={20} />}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="text-[13px] font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{msg.fileName || 'Tệp đính kèm'}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{msg.sender?.fullName} • {formatTimeAgo(msg.createdAt)}</p>
                    </div>
                  </a>
                </div>
              ))
            )
          )}

          {vaultTab === 'PINNED' && (
            pinnedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <Pin size={24} className="text-slate-400" />
                </div>
                <span className="text-sm font-medium">Chưa có tin nhắn nào được ghim.</span>
              </div>
            ) : (
              pinnedMessages.map(msg => (
                <div key={msg.id} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-400/30 transition-all relative group overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${msg.pinType === 'TIP' ? 'bg-orange-400' : msg.pinType === 'VOCABULARY' ? 'bg-green-400' : 'bg-indigo-400'}`}></div>
                  <div className="flex items-center justify-between mb-2 pl-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px] overflow-hidden">
                        {msg.sender?.avatarUrl ? <img src={msg.sender.avatarUrl} className="w-full h-full object-cover" /> : msg.sender?.fullName?.charAt(0)}
                      </div>
                      <div>
                        <span className="text-[12px] font-bold text-slate-700 block leading-none">{msg.sender?.fullName}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{formatTimeAgo(msg.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${msg.pinType === 'TIP' ? 'bg-orange-50 text-orange-600 border border-orange-100' : msg.pinType === 'VOCABULARY' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                      {msg.pinType === 'GENERAL' ? '📌 Thường' : msg.pinType === 'TIP' ? '💡 Tips' : '📚 Từ vựng'}
                    </span>
                  </div>
                  <div className="pl-2">
                    {msg.content && <p className="text-[13px] text-slate-700 leading-relaxed line-clamp-4">{msg.content}</p>}
                    {msg.fileUrl && (
                      <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 font-bold hover:underline mt-2 flex items-center gap-1 p-2 bg-slate-50 rounded-lg border border-slate-100 w-fit">
                        📎 {msg.fileName || 'Tệp đính kèm'}
                      </a>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
