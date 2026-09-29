import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Bell, UserPlus, Heart, MessageSquare, Reply } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const NotificationDropdown = ({ 
  notifications, 
  setNotifications, 
  handleMarkAsRead, 
  setShowNotifications 
}) => {
  const navigate = useNavigate();

  return (
    <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-4 fade-in duration-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Bell className="text-primary" size={20} />
          Thông báo
        </h3>
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={handleMarkAsRead} 
            className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
          >
            <CheckCircle size={14} /> Đã đọc hết
          </button>
        )}
      </div>
      
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Bell size={32} className="opacity-20" />
            <p className="text-sm font-medium">Bạn đã xem hết thông báo!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(notif => {
              const isFriendRequest = notif.type === 'FRIEND_REQUEST';
              const isGroupRequest = notif.type === 'GROUP_REQUEST';
              const isFriendAccept = notif.type === 'FRIEND_ACCEPT';
              const isUpvote = notif.type === 'UPVOTE';
              const isComment = notif.type === 'COMMENT';
              const isReply = notif.type === 'REPLY';
              
              const getIcon = () => {
                if (isFriendRequest) return <UserPlus size={16} className="text-blue-500" />;
                if (isGroupRequest) return <UserPlus size={16} className="text-purple-500" />;
                if (isFriendAccept) return <CheckCircle size={16} className="text-green-500" />;
                if (isUpvote) return <Heart size={16} className="text-rose-500" />;
                if (isComment) return <MessageSquare size={16} className="text-indigo-500" />;
                if (isReply) return <Reply size={16} className="text-amber-500" />;
                return <Bell size={16} className="text-slate-500" />;
              };

              const handleNotifClick = () => {
                if (isFriendRequest || isFriendAccept) {
                  navigate('/profile');
                } else if (notif.postId) {
                  navigate(`/posts/${notif.postId}`);
                } else if (notif.tipId) {
                  navigate(`/tips/${notif.tipId}`);
                } else {
                  navigate('/profile');
                }
                setShowNotifications(false);
              };

              return (
                <div 
                  key={notif.id} 
                  className={`p-4 transition-all cursor-pointer hover:bg-slate-50 group relative ${
                    !notif.isRead ? 'bg-blue-50/40' : ''
                  }`}
                  onClick={handleNotifClick}
                >
                  {/* Unread Indicator */}
                  {!notif.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"></div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      {notif.sender?.avatarUrl ? (
                        <img 
                          src={notif.sender.avatarUrl} 
                          alt="" 
                          className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                          {notif.sender?.fullName?.charAt(0) || '?'}
                        </div>
                      )}
                      
                      {/* Floating Badge Icon */}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                        {getIcon()}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm text-slate-700 leading-snug">
                        <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {notif.sender?.fullName || 'Hệ thống'}
                        </span>{' '}
                        {(() => {
                          let text = notif.content;
                          if (notif.sender?.fullName && text.startsWith(notif.sender.fullName)) {
                            text = text.substring(notif.sender.fullName.length).trim();
                          }
                          return text;
                        })()}
                      </p>
                      
                      <span className="text-[11px] font-medium text-slate-400 mt-1.5 block uppercase tracking-wider">
                        {new Date(notif.createdAt).toLocaleString('vi-VN', { 
                          hour: '2-digit', minute: '2-digit', 
                          day: '2-digit', month: '2-digit' 
                        })}
                      </span>
                      
                      {/* Actions for Friend Request */}
                      {isFriendRequest && notif.senderId && (
                        <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await api.put(`/friendships/request/${notif.senderId}/accept`);
                                toast.success('Đã chấp nhận kết bạn!');
                                setNotifications(prev => prev.filter(n => n.id !== notif.id));
                              } catch (err) { toast.error('Lỗi khi chấp nhận'); }
                            }}
                            className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover shadow-sm shadow-primary/20 transition-all active:scale-95"
                          >
                            Chấp nhận
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await api.put(`/friendships/request/${notif.senderId}/reject`);
                                setNotifications(prev => prev.filter(n => n.id !== notif.id));
                              } catch (err) { toast.error('Lỗi khi từ chối'); }
                            }}
                            className="flex-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all active:scale-95"
                          >
                            Từ chối
                          </button>
                        </div>
                      )}

                      {/* Actions for Group Request */}
                      {isGroupRequest && notif.senderId && notif.postId && (
                        <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await api.put(`/groups/${notif.postId}/requests/${notif.senderId}/accept`);
                                toast.success('Đã duyệt vào nhóm!');
                                setNotifications(prev => prev.filter(n => n.id !== notif.id));
                              } catch (err) { toast.error('Lỗi khi duyệt'); }
                            }}
                            className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover shadow-sm shadow-primary/20 transition-all active:scale-95"
                          >
                            Duyệt
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await api.put(`/groups/${notif.postId}/requests/${notif.senderId}/reject`);
                                setNotifications(prev => prev.filter(n => n.id !== notif.id));
                              } catch (err) { toast.error('Lỗi khi từ chối'); }
                            }}
                            className="flex-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all active:scale-95"
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
