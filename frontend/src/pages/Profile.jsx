import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Lock, Camera, Save, Loader2, Users, Check, X, BarChart2 } from 'lucide-react';

const Profile = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [activeTab, setActiveTab] = useState('info'); // info | password
  
  const [fullName, setFullName] = useState(user.fullName || '');
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics(); // Always fetch analytics for the heatmap at the top
    if (activeTab === 'friends') {
      fetchFriendsData();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/users/me/analytics');
      setAnalytics(res.data);
    } catch (error) {
      toast.error('Lỗi khi tải thống kê');
    }
  };

  const fetchFriendsData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get('/friendships/friends'),
        api.get('/friendships/requests')
      ]);
      setFriends(friendsRes.data || friendsRes);
      setFriendRequests(requestsRes.data || requestsRes);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách bạn bè');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error('Họ tên không được để trống');
    
    setIsUpdatingInfo(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const updatedUser = res.data || res;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Cập nhật thông tin thành công!');
      
      // Refresh page to update header avatar/name
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật');
    } finally {
      setIsUpdatingInfo(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      return toast.error('Vui lòng điền đầy đủ các trường');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Mật khẩu mới không khớp');
    }

    setIsUpdatingPassword(true);
    try {
      await api.put('/users/change-password', { oldPassword, newPassword });
      toast.success('Đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-[1180px] mx-auto py-8 px-4">

      <div className="bg-white rounded-md border border-border shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        <div className="w-full md:w-[280px] shrink-0 bg-gray-50 border-r border-border p-6">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-text-main mb-8">Cài đặt tài khoản</h2>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('info')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all text-[13px] ${activeTab === 'info' ? 'bg-white border border-border text-text-main shadow-sm' : 'border border-transparent text-text-sec hover:bg-white/50'}`}
            >
              <User size={16} /> Thông tin cá nhân
            </button>
            <button 
              onClick={() => setActiveTab('password')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all text-[13px] ${activeTab === 'password' ? 'bg-white border border-border text-text-main shadow-sm' : 'border border-transparent text-text-sec hover:bg-white/50'}`}
            >
              <Lock size={16} /> Đổi mật khẩu
            </button>
            <button 
              onClick={() => setActiveTab('friends')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all text-[13px] ${activeTab === 'friends' ? 'bg-white border border-border text-text-main shadow-sm' : 'border border-transparent text-text-sec hover:bg-white/50'}`}
            >
              <Users size={16} /> Bạn bè & Lời mời
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all text-[13px] ${activeTab === 'analytics' ? 'bg-white border border-border text-text-main shadow-sm' : 'border border-transparent text-text-sec hover:bg-white/50'}`}
            >
              <BarChart2 size={16} /> Thống kê cá nhân
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full p-8 md:p-12">
          {activeTab === 'info' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-[20px] font-medium text-text-main mb-6">Thông tin cá nhân</h3>
              
              <form onSubmit={handleUpdateInfo} className="space-y-6 max-w-lg">
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full overflow-hidden border border-border shadow-sm bg-gray-50 flex items-center justify-center">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={40} className="text-gray-300" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-accent text-white p-2.5 rounded-full shadow-sm cursor-pointer hover:bg-blue-700 transition transform group-hover:scale-105 border-2 border-white">
                      <Camera size={14} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Email đăng nhập</label>
                  <input 
                    type="email" 
                    value={user.email || ''} 
                    disabled 
                    className="w-full px-4 py-3 rounded-md border border-border bg-gray-50 text-text-sec cursor-not-allowed text-[14px]"
                  />
                  <p className="text-[11px] text-text-muted mt-2">Email không thể thay đổi</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Họ và tên</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-border focus:outline-none focus:border-accent text-[14px] transition-all bg-white"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isUpdatingInfo}
                    className="flex items-center justify-center gap-2 bg-accent hover:bg-blue-700 text-white px-6 py-3 rounded font-bold tracking-widest uppercase text-[11px] transition-colors disabled:opacity-50"
                  >
                    {isUpdatingInfo ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    LƯU THÔNG TIN
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-[20px] font-medium text-text-main mb-6">Đổi mật khẩu</h3>
              
              <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-lg">
                <div>
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Mật khẩu hiện tại</label>
                  <input 
                    type="password" 
                    value={oldPassword} 
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-border focus:outline-none focus:border-accent text-[14px] transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Mật khẩu mới</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-border focus:outline-none focus:border-accent text-[14px] transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Nhập lại mật khẩu mới</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-border focus:outline-none focus:border-accent text-[14px] transition-all bg-white"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isUpdatingPassword}
                    className="flex items-center justify-center gap-2 bg-text-main hover:bg-black text-white px-6 py-3 rounded font-bold tracking-widest uppercase text-[11px] shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isUpdatingPassword ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
                    CẬP NHẬT MẬT KHẨU
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Bạn bè & Lời mời kết bạn</h3>
              
              {friendRequests.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Lời mời kết bạn ({friendRequests.length})
                  </h4>
                  <div className="space-y-3">
                    {friendRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = `/users/${req.sender.id}`}>
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 overflow-hidden">
                            {req.sender.avatarUrl ? <img src={req.sender.avatarUrl} className="w-full h-full object-cover" /> : req.sender.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{req.sender.fullName}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              try {
                                await api.put(`/friendships/request/${req.sender.id}/accept`);
                                toast.success('Đã chấp nhận');
                                fetchFriendsData();
                              } catch (e) { toast.error('Lỗi'); }
                            }}
                            className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                await api.put(`/friendships/request/${req.sender.id}/reject`);
                                fetchFriendsData();
                              } catch (e) { toast.error('Lỗi'); }
                            }}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Danh sách bạn bè ({friends.length})
                </h4>
                {friends.length === 0 ? (
                  <p className="text-slate-500 text-sm">Bạn chưa có người bạn nào.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friends.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = `/users/${friend.id}`}>
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 overflow-hidden">
                            {friend.avatarUrl ? <img src={friend.avatarUrl} className="w-full h-full object-cover" /> : friend.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 line-clamp-1">{friend.fullName}</p>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            if (window.confirm('Bạn có chắc muốn hủy kết bạn?')) {
                              try {
                                await api.delete(`/friendships/${friend.id}`);
                                fetchFriendsData();
                                toast.success('Đã hủy kết bạn');
                              } catch (e) { toast.error('Lỗi'); }
                            }
                          }}
                          className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors whitespace-nowrap"
                        >
                          Hủy kết bạn
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">Thống kê Học Tập</h3>
              
              {!analytics ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center">
                      <div className="text-3xl font-black text-blue-600 mb-1">{analytics.totalWords}</div>
                      <div className="text-sm font-semibold text-slate-500">Tổng từ vựng</div>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                      <div className="text-3xl font-black text-emerald-600 mb-1">{analytics.masteredWords}</div>
                      <div className="text-sm font-semibold text-slate-500">Thành thạo</div>
                    </div>
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-center">
                      <div className="text-3xl font-black text-amber-600 mb-1">{analytics.learningWords}</div>
                      <div className="text-sm font-semibold text-slate-500">Đang học</div>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-center">
                      <div className="text-3xl font-black text-purple-600 mb-1">{analytics.retentionRate}%</div>
                      <div className="text-sm font-semibold text-slate-500">Mức độ ghi nhớ</div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
