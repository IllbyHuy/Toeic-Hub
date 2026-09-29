import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Lock, Unlock, Plus, HelpCircle } from 'lucide-react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import api from '../services/api';
import toast from 'react-hot-toast';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', privacy: 'PUBLIC' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [activeTab, setActiveTab] = useState('MY_GROUPS'); // MY_GROUPS | DISCOVER
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data || []);
    } catch (error) {
      toast.error('Không thể tải danh sách Group');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newGroup.name);
      formData.append('description', newGroup.description);
      formData.append('privacy', newGroup.privacy);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await api.post('/groups', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGroups([res.data || res, ...groups]);
      setIsCreating(false);
      setNewGroup({ name: '', description: '', privacy: 'PUBLIC' });
      setAvatarFile(null);
      toast.success('Tạo Group thành công!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo Group');
    }
  };

  const handleJoin = async (groupId) => {
    try {
      const res = await api.post(`/groups/${groupId}/join`);
      const successMsg = res.data?.message || res.message || 'Thành công!';
      toast.success(successMsg);
      
      // If the message says wait for approval, we don't navigate
      if (!successMsg.toLowerCase().includes('chờ phê duyệt')) {
        navigate(`/groups/${groupId}`);
      }
    } catch (error) {
      const msg = error.response?.data?.message;
      if (msg === 'You are already a member of this group') {
        navigate(`/groups/${groupId}`);
      } else {
        toast.error(msg || 'Lỗi khi tham gia Group');
      }
    }
  };

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Tiếp theo',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Hoàn thành',
      steps: [
        { 
          element: '#create-group-btn', 
          popover: { 
            title: 'Tạo Nhóm Mới', 
            description: 'Tạo một không gian học tập riêng cho bạn và bạn bè.',
            side: "bottom", align: 'start'
          } 
        },
        { 
          element: '#discover-tab', 
          popover: { 
            title: 'Khám Phá', 
            description: 'Tìm và tham gia các nhóm học tập công khai khác để cùng thi đua học tập.',
            side: "bottom", align: 'start'
          } 
        },
        { 
          element: '#groups-list', 
          popover: { 
            title: 'Danh Sách Nhóm', 
            description: 'Các nhóm bạn đang tham gia hoặc có thể tham gia. Nhấp "Vào Nhóm" hoặc "Tham Gia" để bắt đầu.',
            side: "top", align: 'start'
          } 
        }
      ]
    });
    driverObj.drive();
  };

  return (
    <div className="max-w-[1180px] mx-auto px-4 md:px-8 py-6 pb-20 relative">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-[28px] font-medium text-text-main">Cộng Đồng</h1>
            <button onClick={startTour} className="flex items-center gap-1.5 text-[#4361ee] bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
              <HelpCircle size={16} />
              <span className="text-[11px] font-bold tracking-widest uppercase">Hướng dẫn</span>
            </button>
          </div>
          <p className="text-text-sec text-[15px]">Khám phá và tham gia các nhóm học tập</p>
        </div>
        <button 
          id="create-group-btn"
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded font-bold tracking-widest uppercase text-[11px] hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          {isCreating ? 'HỦY' : 'TẠO NHÓM MỚI'}
        </button>
      </div>

      <div className="flex bg-white p-1 rounded-md border border-border max-w-sm mb-10 shadow-sm">
        <button 
          onClick={() => setActiveTab('MY_GROUPS')}
          className={`flex-1 px-4 py-2.5 rounded font-bold tracking-widest uppercase text-[11px] transition-all ${activeTab === 'MY_GROUPS' ? 'bg-text-main text-white shadow-sm' : 'text-text-sec hover:text-text-main hover:bg-gray-50'}`}
        >
          Cộng đồng của tôi
        </button>
        <button 
          id="discover-tab"
          onClick={() => setActiveTab('DISCOVER')}
          className={`flex-1 px-4 py-2.5 rounded font-bold tracking-widest uppercase text-[11px] transition-all ${activeTab === 'DISCOVER' ? 'bg-text-main text-white shadow-sm' : 'text-text-sec hover:text-text-main hover:bg-gray-50'}`}
        >
          Khám phá
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white p-8 rounded-md mb-10 border border-border shadow-sm">
          <div className="mb-5">
            <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Ảnh đại diện nhóm (tùy chọn)</label>
            <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} className="w-full border border-border rounded-md px-4 py-3 focus:border-accent focus:outline-none text-[13px]" />
          </div>
          <div className="mb-5">
            <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Tên nhóm *</label>
            <input required type="text" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} className="w-full border border-border rounded-md px-4 py-3 focus:border-accent focus:outline-none text-[13px]" placeholder="VD: Hội Luyện Thi TOEIC 900+" />
          </div>
          <div className="mb-5">
            <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Mô tả</label>
            <textarea value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} className="w-full border border-border rounded-md px-4 py-3 focus:border-accent focus:outline-none h-24 text-[13px]" placeholder="Nhóm dành cho những người quyết tâm..." />
          </div>
          <div className="mb-8">
            <label className="block text-[11px] font-bold tracking-widest uppercase text-text-sec mb-2">Quyền riêng tư</label>
            <select value={newGroup.privacy} onChange={e => setNewGroup({...newGroup, privacy: e.target.value})} className="w-full border border-border rounded-md px-4 py-3 focus:border-accent focus:outline-none bg-white text-[13px]">
              <option value="PUBLIC">Công khai (Ai cũng thấy)</option>
              <option value="PRIVATE">Kín (Cần phê duyệt)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="submit" className="bg-accent text-white px-6 py-2.5 rounded font-bold tracking-widest uppercase text-[11px] hover:bg-blue-700 transition-colors">Tạo Nhóm</button>
          </div>
        </form>
      )}

      <div id="groups-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.filter(g => activeTab === 'MY_GROUPS' ? g.members?.length > 0 : true).map(group => (
          <div key={group.id} className="bg-white rounded-md overflow-hidden hover:-translate-y-1 transition-transform border border-border flex flex-col group mt-4">
            <div className="h-28 bg-gray-100 relative cursor-pointer overflow-visible" onClick={() => navigate(`/groups/${group.id}`)}>
              {(group.coverImage || group.avatar) && (
                <img src={group.coverImage || group.avatar} className="w-full h-full object-cover opacity-80" alt="cover" />
              )}
              <div className="absolute -bottom-6 left-5 w-14 h-14 rounded-md bg-white flex items-center justify-center font-bold text-accent shadow-sm text-2xl overflow-hidden border border-border z-10">
                {group.avatar ? (
                  <img src={group.avatar} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  group.name.charAt(0)
                )}
              </div>
            </div>
            <div className="p-6 pt-10 flex-1 flex flex-col bg-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[18px] font-serif font-medium text-text-main line-clamp-1 cursor-pointer hover:text-accent" onClick={() => navigate(`/groups/${group.id}`)}>{group.name}</h3>
                {group.privacy === 'PUBLIC' ? <Unlock size={14} className="text-text-muted mt-1" /> : <Lock size={14} className="text-text-muted mt-1" />}
              </div>
              <p className="text-[14px] text-text-sec mb-5 line-clamp-2 flex-1">{group.description || 'Chưa có mô tả.'}</p>
              
              <div className="flex items-center text-[11px] font-bold tracking-widest uppercase text-text-sec mb-5">
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
                  <Users size={12} className="text-accent" />
                  <span>{group._count?.members || 1} THÀNH VIÊN</span>
                </div>
              </div>

              {group.members?.length > 0 ? (
                <button 
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full py-2.5 bg-white text-text-main font-bold tracking-widest uppercase text-[11px] rounded border border-border hover:bg-gray-50 transition-colors"
                >
                  VÀO NHÓM
                </button>
              ) : (
                <button 
                  onClick={() => handleJoin(group.id)}
                  className="w-full py-2.5 bg-accent text-white font-bold tracking-widest uppercase text-[11px] rounded hover:bg-blue-700 transition-colors shadow-sm"
                >
                  THAM GIA
                </button>
              )}
            </div>
          </div>
        ))}
        {groups.filter(g => activeTab === 'MY_GROUPS' ? g.members?.length > 0 : g.members?.length === 0).length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>{activeTab === 'MY_GROUPS' ? 'Bạn chưa tham gia nhóm nào.' : 'Chưa có nhóm mới để khám phá.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
