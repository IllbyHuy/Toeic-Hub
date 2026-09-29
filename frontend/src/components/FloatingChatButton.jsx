import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Users } from 'lucide-react';
import api from '../services/api';
import FloatingChatWindow from './FloatingChatWindow';
import { useSocket } from '../context/SocketContext';

const FloatingChatButton = () => {
  const token = localStorage.getItem('token');
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadDetails, setUnreadDetails] = useState({});
  const [recentInfo, setRecentInfo] = useState({});
  const popoverRef = useRef(null);

  const [activeChat, setActiveChat] = useState(null); // { type: 'GROUP'|'DIRECT', id, name, avatar }
  const [isMinimized, setIsMinimized] = useState(false);
  const { socket, onlineUsers } = useSocket();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch initial unread count
  useEffect(() => {
    if (!token) return;
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/messages/unread/count');
        setUnreadCount(res.data?.count || 0);
        const detailsRes = await api.get('/messages/unread/details');
        setUnreadDetails(detailsRes.data?.details || {});
        const recentRes = await api.get('/messages/recent-info');
        setRecentInfo(recentRes.data || recentRes);
      } catch (err) {
        console.error('Failed to fetch unread', err);
      }
    };
    fetchUnreadCount();
  }, [token]);

  // Real-time listener for unread count
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (msg) => {
        // If we receive a message that isn't from us, increment
        if (msg.senderId !== user.id) {
          // Note: Ideally, if we have the chat OPEN right now, we shouldn't increment, 
          // but checking if the chat is open is tricky globally.
          // Since the user is on another page (FloatingChatButton is global), 
          // we can increment. If they are IN the chat, markAsRead will be called immediately.
          setUnreadCount(prev => prev + 1);
          setUnreadDetails(prev => ({
            ...prev,
            [msg.senderId]: (prev[msg.senderId] || 0) + 1
          }));
        }

        let content = msg.isDeleted ? 'Tin nhắn đã bị thu hồi' : (msg.content || 'Đính kèm tệp');
        try {
          const parsed = JSON.parse(content);
          if (parsed.type === 'SHARED_POST') content = 'Đã chia sẻ bài viết';
          if (parsed.type === 'SHARED_TIP') content = 'Đã chia sẻ Tip';
        } catch(e) {}
        
        setRecentInfo(prev => ({
          ...prev,
          [msg.senderId]: { content, isSenderMe: msg.senderId === user.id }
        }));
      };

      const handleNewGroupMessage = (msg) => {
        if (msg.userId !== user.id) {
          setUnreadCount(prev => prev + 1);
          setUnreadDetails(prev => ({
            ...prev,
            [msg.groupId]: (prev[msg.groupId] || 0) + 1
          }));
        }

        let content = msg.isDeleted ? 'Tin nhắn đã bị thu hồi' : (msg.content || 'Đính kèm tệp');
        try {
          const parsed = JSON.parse(content);
          if (parsed.type === 'SHARED_POST') content = 'Đã chia sẻ bài viết';
          if (parsed.type === 'SHARED_TIP') content = 'Đã chia sẻ Tip';
        } catch(e) {}
        
        setRecentInfo(prev => ({
          ...prev,
          [msg.groupId]: { content, isSenderMe: msg.userId === user.id }
        }));
      };

      const handleMessagesRead = (data) => {
        // If we read the messages, fetch the count again to sync properly
        if (data.readerId === user.id) {
          api.get('/messages/unread/count').then(res => setUnreadCount(res.data?.count || 0)).catch(() => {});
          api.get('/messages/unread/details').then(res => setUnreadDetails(res.data?.details || {})).catch(() => {});
        }
      };

      socket.on('new_direct_message', handleNewMessage);
      socket.on('new_group_message', handleNewGroupMessage);
      socket.on('messages_read', handleMessagesRead);

      return () => {
        socket.off('new_direct_message', handleNewMessage);
        socket.off('new_group_message', handleNewGroupMessage);
        socket.off('messages_read', handleMessagesRead);
      };
    }
  }, [socket, user.id]);

  useEffect(() => {
    if (!token) return;

    const fetchChats = async () => {
      setLoading(true);
      try {
        const [friendsRes, groupsRes] = await Promise.all([
          api.get('/friendships/friends'),
          api.get('/groups/my-groups')
        ]);
        setFriends(friendsRes.data || friendsRes);
        setGroups(groupsRes.data || groupsRes);
      } catch (err) {
        console.error('Error fetching chats', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchChats();
    }
  }, [isOpen, token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!token) return null;

  const openChat = (type, target) => {
    setIsOpen(false);
    if (type === 'GROUP') {
      window.location.href = `/groups/${target.id}`;
    } else {
      window.location.href = `/messages/${target.id}`;
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end" ref={popoverRef}>
        {/* Popover */}
        {isOpen && (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 mb-4 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 max-h-[60vh] flex flex-col">
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold">Đoạn chat</h3>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="text-center py-6 text-slate-400 text-sm">Đang tải...</div>
              ) : (
                <>
                  {groups.length > 0 && (
                    <div className="mb-4">
                      <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Nhóm của bạn</div>
                      {groups.map(g => (
                        <div 
                          key={g.id} 
                          onClick={() => openChat('GROUP', g)}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 shadow-sm border border-slate-200 overflow-hidden shrink-0">
                            {g.avatar ? <img src={g.avatar} className="w-full h-full object-cover" /> : <Users size={16} />}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className={`font-semibold text-sm truncate ${unreadDetails[g.id] > 0 ? 'text-indigo-700' : 'text-slate-800'}`}>{g.name}</h4>
                              <p className="text-xs text-slate-500 truncate">Nhóm • {g.members?.length || 1} thành viên</p>
                              {recentInfo[g.id] && (
                                <p className={`text-[11px] truncate mt-0.5 ${unreadDetails[g.id] > 0 ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'}`}>
                                  {recentInfo[g.id].isSenderMe ? 'Bạn: ' : ''}{recentInfo[g.id].content}
                                </p>
                              )}
                            </div>
                            {unreadDetails[g.id] > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 shadow-sm">
                                {unreadDetails[g.id] > 99 ? '99+' : unreadDetails[g.id]}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Tin nhắn riêng</div>
                  {friends.length === 0 ? (
                    <div className="text-center text-slate-400 py-4 text-xs">Chưa có bạn bè nào</div>
                  ) : (
                    friends.map(f => {
                      const isOnline = onlineUsers?.has(f.id);
                      return (
                        <div 
                          key={f.id} 
                          onClick={() => openChat('DIRECT', f)}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition relative"
                        >
                          <div className="relative w-10 h-10 rounded-full bg-slate-200 border border-slate-200 flex-shrink-0 flex items-center justify-center font-bold text-slate-500">
                            {f.avatarUrl ? (
                              <img src={f.avatarUrl} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              f.fullName.charAt(0)
                            )}
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-10" title="Online" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className={`font-semibold text-sm truncate ${unreadDetails[f.id] > 0 ? 'text-indigo-700' : 'text-slate-800'}`}>{f.fullName}</h4>
                              {recentInfo[f.id] && (
                                <p className={`text-[11px] truncate mt-0.5 ${unreadDetails[f.id] > 0 ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'}`}>
                                  {recentInfo[f.id].isSenderMe ? 'Bạn: ' : ''}{recentInfo[f.id].content}
                                </p>
                              )}
                            </div>
                            {unreadDetails[f.id] > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 shadow-sm">
                                {unreadDetails[f.id] > 99 ? '99+' : unreadDetails[f.id]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 hover:scale-105 hover:-translate-y-1 transition-all flex items-center justify-center group relative"
        >
          {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
          
          {/* Unread Badge */}
          {!isOpen && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm z-20">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </button>
      </div>

    </>
  );
};

export default FloatingChatButton;
