import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Minus } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { formatTimeAgo } from '../utils/formatDate';

const FloatingChatWindow = ({ chatType, targetId, targetName, targetAvatar, onClose, isMinimized, onToggleMinimize }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchMessages();
    
    if (socket) {
      if (chatType === 'GROUP') {
        socket.emit('join_group', targetId);
        const handleGroupMsg = (msg) => {
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        };
        socket.on('new_group_message', handleGroupMsg);
        return () => {
          socket.off('new_group_message', handleGroupMsg);
          socket.emit('leave_group', targetId);
        };
      } else {
        // Direct messages
        socket.emit('join_group', user.id); 
        const handleDirectMsg = (msg) => {
          if (msg.senderId === targetId || msg.senderId === user.id) {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          }
        };
        socket.on('new_direct_message', handleDirectMsg);
        return () => socket.off('new_direct_message', handleDirectMsg);
      }
    }
  }, [targetId, chatType, socket]);

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      if (chatType === 'GROUP') {
        const res = await api.get(`/groups/${targetId}/messages`);
        setMessages(res.data || []);
      } else {
        const res = await api.get(`/messages/${targetId}`);
        setMessages(res.data?.messages || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');
    try {
      if (chatType === 'GROUP') {
        await api.post(`/groups/${targetId}/messages`, { content });
        // WebSocket will broadcast
      } else {
        const res = await api.post(`/messages/${targetId}`, { content });
        setMessages(prev => prev.find(m => m.id === res.data.id) ? prev : [...prev, res.data]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={`fixed bottom-0 right-24 w-[340px] bg-white border border-slate-200/60 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col transition-all duration-300 z-[110] ${isMinimized ? 'h-14 translate-y-2 hover:translate-y-0' : 'h-[500px]'}`}>
      {/* Header */}
      <div 
        className="bg-gradient-to-r from-indigo-600 to-blue-500 p-3 rounded-t-2xl flex justify-between items-center cursor-pointer select-none relative overflow-hidden"
        onClick={onToggleMinimize}
      >
        {/* Subtle pattern or glow in header */}
        <div className="absolute inset-0 bg-white/10 opacity-50 blur-xl"></div>
        
        <div 
          className="flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-white/10 p-1.5 -ml-1.5 rounded-xl transition relative z-10"
          onClick={(e) => {
            e.stopPropagation();
            if (chatType === 'GROUP') {
              window.location.href = `/groups/${targetId}`;
            } else {
              window.location.href = `/messages?userId=${targetId}`;
            }
          }}
          title="Mở trong trang lớn"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-white/20 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/40 shadow-inner">
              {targetAvatar ? <img src={targetAvatar} className="w-full h-full object-cover" /> : <User size={18} className="text-white" />}
            </div>
            {/* Green active dot - simulated */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#3b82f6] rounded-full"></div>
          </div>
          <div className="flex-1 truncate">
            <div className="font-bold text-sm text-white tracking-wide">{targetName || 'Đang tải...'}</div>
            <div className="text-[10px] text-blue-100 font-medium">{chatType === 'GROUP' ? 'Cộng đồng' : 'Đang hoạt động'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 relative z-10">
          <button className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full text-white transition-colors" onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}>
            <Minus size={18} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-red-500/80 hover:text-white rounded-full text-white transition-colors" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 relative custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center mt-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-60">
                <Send size={32} />
                <span className="text-sm font-medium">Bắt đầu trò chuyện</span>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = chatType === 'GROUP' ? msg.userId === user.id : msg.senderId === user.id;
                const senderId = chatType === 'GROUP' ? msg.userId : msg.senderId;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const prevSenderId = prevMsg ? (chatType === 'GROUP' ? prevMsg.userId : prevMsg.senderId) : null;
                const showAvatar = !isMe && senderId !== prevSenderId;

                const avatarUrl = chatType === 'GROUP' ? msg.user?.avatarUrl : (targetAvatar);
                const senderName = chatType === 'GROUP' ? msg.user?.fullName : targetName;

                return (
                  <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2 group`}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full flex-shrink-0 mt-1">
                        {showAvatar && (
                          avatarUrl ? (
                            <img src={avatarUrl} className="w-full h-full rounded-full object-cover shadow-sm border border-slate-200" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-100 to-primary/20 flex items-center justify-center text-primary font-bold text-[10px] shadow-sm">
                              {senderName?.charAt(0) || '?'}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      {!isMe && showAvatar && chatType === 'GROUP' && (
                        <span className="text-[10px] font-semibold text-slate-500 ml-1 mb-1">{senderName}</span>
                      )}
                      <div className={`relative px-3.5 py-2 text-[14px] leading-relaxed shadow-sm
                        ${isMe 
                          ? 'bg-gradient-to-br from-indigo-600 to-blue-500 text-white rounded-2xl rounded-tr-[4px]' 
                          : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-tl-[4px]'} 
                        ${msg.isSystem ? 'bg-transparent border-none text-slate-400 text-xs italic text-center w-full shadow-none' : ''}`
                      }>
                        {(() => {
                          if (msg.isSystem) return msg.content;
                          try {
                            const parsed = JSON.parse(msg.content);
                            if (parsed.type === 'tip') {
                              return (
                                <div className="flex flex-col gap-1.5 min-w-[200px]">
                                  <div className="text-[10px] font-black text-white/80 tracking-wider">THỦ THUẬT</div>
                                  <h4 className="font-bold mb-0.5 line-clamp-2 text-white">{parsed.title}</h4>
                                  <div className="text-xs p-2 rounded-lg bg-black/10 text-white/90 border border-white/10 line-clamp-2">
                                    💡 {parsed.structure}
                                  </div>
                                </div>
                              );
                            }
                          } catch (e) {}
                          return <p className="whitespace-pre-wrap break-words">{msg.content}</p>;
                        })()}
                        {/* Time Tooltip */}
                        <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 whitespace-nowrap ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Vừa xong'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          <div className="p-3 bg-white border-t border-slate-100 relative z-20">
            <form onSubmit={handleSend} className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="w-full bg-slate-100/80 border border-transparent rounded-full pl-4 pr-10 py-2.5 text-sm focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-700 placeholder-slate-400"
                  placeholder="Nhập tin nhắn..."
                />
              </div>
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${newMessage.trim() ? 'bg-primary text-white shadow-md shadow-primary/20 hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <Send size={16} className={newMessage.trim() ? "ml-0.5" : ""} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default FloatingChatWindow;
