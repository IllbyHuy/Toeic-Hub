import { useState, useEffect } from 'react';
import { Plus, ThumbsUp, ThumbsDown, Flag, Lightbulb, Trash2, Loader2, Lock, Globe, Users, X, Filter, HelpCircle } from 'lucide-react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatTimeAgo } from '../utils/formatDate';
import CommentSection from '../components/CommentSection';
import ImageModal from '../components/ImageModal';
import FilterDrawer from '../components/FilterDrawer';

const Tips = () => {
  const [tips, setTips] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTipId, setEditingTipId] = useState(null);
  const [newTip, setNewTip] = useState({ title: '', structure: '', description: '', examples: '', visibility: 'PUBLIC', groupId: '', part: 'GENERAL' });
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [aiTopic, setAiTopic] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NEWEST'); // NEWEST or TOP
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [myGroups, setMyGroups] = useState([]);
  const [friends, setFriends] = useState([]);

  // Share Modal State
  const [shareTipTarget, setShareTipTarget] = useState(null);
  const [selectedShareGroups, setSelectedShareGroups] = useState([]);
  const [selectedShareFriends, setSelectedShareFriends] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    
    fetchTips();
    fetchShareData();
  }, []);

  const fetchShareData = async () => {
    try {
      const [groupsRes, friendsRes] = await Promise.all([
        api.get('/groups/my-groups'),
        api.get('/friendships/friends')
      ]);
      setMyGroups(groupsRes.data || []);
      setFriends(friendsRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTips = async () => {
    try {
      const res = await api.get('/grammars');
      setTips(res.data || []);
    } catch (error) {
      toast.error('Không thể tải danh sách Tips');
    }
  };

  const handleAiLookup = async (e) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await api.post('/ai/grammar-lookup', { topic: aiTopic.trim() });
      const aiData = res.data || res;
      setNewTip({
        ...newTip,
        title: aiData.title || '',
        structure: aiData.structure || '',
        description: aiData.description || '',
        examples: aiData.examples ? aiData.examples.join('\n') : ''
      });
      setIsAdding(true);
      setEditingTipId(null);
      setAiTopic('');
      toast.success('AI đã soạn xong Tip! Hãy kiểm tra và đăng.');
    } catch (error) {
      toast.error('AI đang bận, vui lòng thử lại sau');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const examplesArray = newTip.examples.split('\n').map(s => s.trim()).filter(s => s);
      
      const formData = new FormData();
      formData.append('title', newTip.title);
      formData.append('structure', newTip.structure);
      formData.append('description', newTip.description);
      formData.append('part', newTip.part || 'GENERAL');
      formData.append('visibility', newTip.visibility);
      if (newTip.visibility === 'GROUP' && newTip.groupId) {
        formData.append('groupId', newTip.groupId);
      }
      // Send examples as JSON string
      formData.append('examples', JSON.stringify(examplesArray));

      if (newTip.imageFile) formData.append('image', newTip.imageFile);
      if (newTip.voiceFile) formData.append('voice', newTip.voiceFile);
      
      // Also send existing URLs in case they didn't upload a new one during edit
      if (newTip.imageUrl) formData.append('imageUrl', newTip.imageUrl);
      if (newTip.voiceUrl) formData.append('voiceUrl', newTip.voiceUrl);

      if (editingTipId) {
        const res = await api.put(`/grammars/${editingTipId}`, formData);
        const updatedTip = res.data || res;
        setTips(tips.map(t => t.id === editingTipId ? { ...t, ...updatedTip } : t));
        toast.success('Cập nhật tip thành công!');
      } else {
        const res = await api.post('/grammars', formData);
        setTips([res.data || res, ...tips]);
        toast.success('Chia sẻ tip thành công!');
      }
      setIsAdding(false);
      setEditingTipId(null);
      setNewTip({ title: '', structure: '', description: '', examples: '', visibility: 'PUBLIC', groupId: '', part: 'GENERAL', imageFile: null, voiceFile: null, imageUrl: '', voiceUrl: '' });
    } catch (error) {
      toast.error('Lỗi khi lưu tip');
    }
  };

  const handleEditClick = (tip) => {
    setNewTip({
      title: tip.title || '',
      structure: tip.structure || '',
      description: tip.description || '',
      examples: Array.isArray(tip.examples) ? tip.examples.join('\n') : '',
      visibility: tip.visibility || 'PUBLIC',
      groupId: tip.groupId || '',
      part: tip.part || 'GENERAL',
      imageUrl: tip.imageUrl || '',
      voiceUrl: tip.voiceUrl || ''
    });
    setEditingTipId(tip.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá mẹo này không?")) return;
    try {
      await api.delete(`/grammars/${id}`);
      setTips(tips.filter(v => v.id !== id));
      toast.success('Đã xóa tip');
    } catch (error) {
      toast.error('Lỗi khi xóa tip');
    }
  };

  const handleToggleSave = async (tipId) => {
    try {
      const res = await api.post(`/grammars/${tipId}/save`);
      const { saved } = res.data;
      
      setTips(tips.map(tip => {
        if (tip.id === tipId) {
          let updatedSavedBy = [...(tip.savedByUsers || [])];
          if (saved) {
            updatedSavedBy.push({ userId: user.id });
          } else {
            updatedSavedBy = updatedSavedBy.filter(u => u.userId !== user.id);
          }
          return { ...tip, savedByUsers: updatedSavedBy };
        }
        return tip;
      }));
      toast.success(saved ? 'Đã lưu Tip vào kho!' : 'Đã bỏ lưu Tip');
    } catch (error) {
      toast.error('Lỗi khi thao tác');
    }
  };

  const handleShareToGroups = async () => {
    if (selectedShareGroups.length === 0 && selectedShareFriends.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 người hoặc nhóm để gửi');
      return;
    }
    
    // Send structured JSON so GroupDetail.jsx and Messages.jsx can render a rich card
    const shareContent = JSON.stringify({
      type: 'SHARED_TIP',
      id: shareTipTarget.id,
      title: shareTipTarget.title,
      structure: shareTipTarget.structure,
      description: shareTipTarget.description,
      part: shareTipTarget.part
    });
    
    try {
      const groupPromises = selectedShareGroups.map(groupId => 
        api.post(`/groups/${groupId}/messages`, { content: shareContent })
      );
      const friendPromises = selectedShareFriends.map(userId => 
        api.post(`/messages/${userId}`, { content: shareContent })
      );
      
      await Promise.all([...groupPromises, ...friendPromises]);
      toast.success('Đã chia sẻ Tip thành công!');
      setShareTipTarget(null);
      setSelectedShareGroups([]);
      setSelectedShareFriends([]);
    } catch (error) {
      toast.error('Lỗi khi chia sẻ');
    }
  };

  const handleReport = async (tipId) => {
    if (!reportReason.trim()) {
      toast.error('Vui lòng nhập lý do báo cáo');
      return;
    }
    try {
      await api.post('/reports', {
        targetType: 'TIP',
        targetId: tipId,
        reason: reportReason.trim()
      });
      toast.success('Đã gửi báo cáo đến Admin');
      setReportingId(null);
      setReportReason('');
    } catch (error) {
      toast.error('Lỗi khi gửi báo cáo');
    }
  };

  const handleVoteTip = async (tipId, type) => {
    try {
      const res = await api.post(`/votes/grammars/${tipId}`, { type });
      const voted = res.data.voted || (res.data.data ? res.data.data.voted : null);
      
      setTips(tips.map(tip => {
        if (tip.id === tipId) {
          let updatedVotes = tip.votes || [];
          // Remove previous vote of this user
          updatedVotes = updatedVotes.filter(v => v.userId !== user.id);
          // Add new vote if it wasn't a toggle off
          if (voted) {
            updatedVotes.push({ type: voted, userId: user.id });
          }
          return { ...tip, votes: updatedVotes };
        }
        return tip;
      }));
    } catch (error) {
      toast.error('Lỗi khi vote Tip');
    }
  };

  const filteredTips = tips.filter(t => {
    // Tab filter
    if (activeTab === 'MINE') {
      if (t.userId !== user.id) return false;
    }
    
    if (activeTab === 'SAVED') {
      const isSaved = t.savedByUsers && t.savedByUsers.some(u => u.userId === user.id);
      if (!isSaved) return false;
    }
    
    // Skill Filter
    if (activeFilter !== 'ALL') {
      let skillMatch = true;
      if (activeFilter === 'LISTENING') skillMatch = ['PART_1', 'PART_2', 'PART_3', 'PART_4'].includes(t.part);
      else if (activeFilter === 'READING') skillMatch = ['PART_5', 'PART_6', 'PART_7'].includes(t.part);
      else if (activeFilter === 'GENERAL') skillMatch = t.part === 'GENERAL';
      if (!skillMatch) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(query);
      const matchDesc = t.description?.toLowerCase().includes(query);
      const matchStructure = t.structure?.toLowerCase().includes(query);
      if (!matchTitle && !matchDesc && !matchStructure) return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (sortBy === 'TOP') {
      const upvotesA = a.votes ? a.votes.filter(v => v.type === 'UPVOTE').length : (a._count?.votes || 0);
      const upvotesB = b.votes ? b.votes.filter(v => v.type === 'UPVOTE').length : (b._count?.votes || 0);
      if (upvotesB !== upvotesA) {
        return upvotesB - upvotesA;
      }
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Tiếp theo',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Hoàn thành',
      steps: [
        { 
          element: '#create-tip-btn', 
          popover: { 
            title: 'Tạo Tip Mới', 
            description: 'Chia sẻ mẹo học hoặc chiến thuật làm bài của riêng bạn để giúp đỡ người khác.',
            side: "bottom", align: 'start'
          } 
        },
        { 
          element: '#ai-tip-generator', 
          popover: { 
            title: 'Soạn Tip bằng AI', 
            description: 'Chỉ cần nhập chủ đề ngữ pháp (VD: Câu bị động), AI sẽ tự động tạo một Tip chi tiết cho bạn!',
            side: "bottom", align: 'start'
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
            <h1 className="text-[28px] font-medium text-text-main">Tips & Mẹo Làm Bài</h1>
            <button onClick={startTour} className="flex items-center gap-1.5 text-[#4361ee] bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
              <HelpCircle size={16} />
              <span className="text-[11px] font-bold tracking-widest uppercase">Hướng dẫn</span>
            </button>
          </div>
          <p className="text-text-sec text-[15px]">Chia sẻ mẹo hay, chiến thuật làm bài TOEIC với cộng đồng</p>
        </div>
        <button 
          id="create-tip-btn"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded font-bold tracking-widest uppercase text-[11px] hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          {isAdding ? 'HỦY' : 'TẠO TIP MỚI'}
        </button>
      </div>

      {/* AI Lookup Banner */}
      <div id="ai-tip-generator" className="bg-white p-6 rounded-md mb-8 flex flex-col md:flex-row items-center gap-4 border border-border shadow-sm">
        <div className="flex-1">
          <h3 className="font-bold tracking-widest uppercase text-text-main flex items-center gap-2 mb-2 text-[11px]">
            <Lightbulb size={16} className="text-accent" />
            Soạn Tip Nhanh với AI
          </h3>
          <p className="text-[13px] text-text-sec">Nhập một chủ đề ngữ pháp (VD: Câu điều kiện, Câu bị động...), hệ thống sẽ tự động soạn dàn ý cho bạn.</p>
        </div>
        <form onSubmit={handleAiLookup} className="flex w-full md:w-auto gap-2">
          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="Chủ đề ngữ pháp..."
            className="flex-1 md:w-64 border border-border rounded-md px-4 py-2 focus:border-accent focus:outline-none text-[13px]"
          />
          <button
            type="submit"
            disabled={isAiLoading || !aiTopic.trim()}
            className="bg-accent-bg text-accent px-4 py-2 rounded font-bold tracking-widest uppercase text-[11px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            SOẠN BÀI
          </button>
        </form>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              setIsAdding(false);
              setEditingTipId(null);
              setNewTip({ title: '', structure: '', description: '', examples: '', visibility: 'PUBLIC', groupId: '', part: 'GENERAL', imageFile: null, voiceFile: null, imageUrl: '', voiceUrl: '' });
            }}
          />
          <div className="relative z-10 w-full max-w-2xl bg-white p-6 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200 border-t-4 border-t-orange-400 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingTipId ? 'Chỉnh sửa Tip' : 'Tạo Tip mới'}
              </h2>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingTipId(null);
                  setNewTip({ title: '', structure: '', description: '', examples: '', visibility: 'PUBLIC', groupId: '', part: 'GENERAL', imageFile: null, voiceFile: null, imageUrl: '', voiceUrl: '' });
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tiêu đề tip *</label>
                  <input required type="text" value={newTip.title} onChange={e => setNewTip({...newTip, title: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none" placeholder="VD: Cách làm Part 5 nhanh trong 8 phút" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phần thi (Part) *</label>
                  <select required value={newTip.part || 'GENERAL'} onChange={e => setNewTip({...newTip, part: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none">
                    <option value="GENERAL">Chung (General)</option>
                    <option value="PART_1">Part 1: Photographs</option>
                    <option value="PART_2">Part 2: Question-Response</option>
                    <option value="PART_3">Part 3: Conversations</option>
                    <option value="PART_4">Part 4: Talks</option>
                    <option value="PART_5">Part 5: Incomplete Sentences</option>
                    <option value="PART_6">Part 6: Text Completion</option>
                    <option value="PART_7">Part 7: Reading Comprehension</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Công thức / Quy tắc chính *</label>
                <input required type="text" value={newTip.structure} onChange={e => setNewTip({...newTip, structure: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none font-mono text-sm" placeholder="VD: Đọc câu hỏi trước → Scan keyword → Chọn đáp án" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Giải thích chi tiết</label>
                <textarea value={newTip.description} onChange={e => setNewTip({...newTip, description: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none h-24 resize-none" placeholder="Giải thích thêm cho mọi người hiểu..." />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Ví dụ minh họa (mỗi dòng 1 ví dụ)</label>
                <textarea value={newTip.examples} onChange={e => setNewTip({...newTip, examples: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none h-24 resize-none" placeholder="VD: Part 5 Q.101: The manager _____ the report... → Chọn 'completed'" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ảnh đính kèm (Tùy chọn)</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" accept="image/*" onChange={e => setNewTip({...newTip, imageFile: e.target.files[0]})} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-400 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                    {newTip.imageUrl && !newTip.imageFile && (
                      <span className="text-xs text-blue-500">Đã có ảnh cũ, chọn ảnh mới để thay thế</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Âm thanh / Audio (Tùy chọn)</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" accept="audio/*, application/pdf" onChange={e => setNewTip({...newTip, voiceFile: e.target.files[0]})} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-400 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                    {newTip.voiceUrl && !newTip.voiceFile && (
                      <span className="text-xs text-blue-500">Đã có audio cũ, chọn audio mới để thay thế</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quyền riêng tư</label>
                <div className="flex gap-2">
                  <select value={newTip.visibility} onChange={e => setNewTip({...newTip, visibility: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none">
                    <option value="PUBLIC">Cộng đồng (Public)</option>
                    <option value="PRIVATE">Chỉ mình tôi (Private)</option>
                    <option value="GROUP">Chia sẻ vào Nhóm</option>
                  </select>
                  {newTip.visibility === 'GROUP' && (
                    <select required value={newTip.groupId} onChange={e => setNewTip({...newTip, groupId: e.target.value})} className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none">
                      <option value="" disabled>Chọn nhóm...</option>
                      {myGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                <button type="submit" className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20">
                  Đăng Tip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-6 mb-6 border-b border-border">
        <button 
          onClick={() => setActiveTab('ALL')}
          className={`font-bold tracking-widest uppercase text-[11px] pb-3 border-b-2 transition-colors ${activeTab === 'ALL' ? 'border-text-main text-text-main' : 'border-transparent text-text-sec hover:text-text-main'}`}
        >
          Cộng đồng Tips
        </button>
        <button 
          onClick={() => setActiveTab('MINE')}
          className={`font-bold tracking-widest uppercase text-[11px] pb-3 border-b-2 transition-colors ${activeTab === 'MINE' ? 'border-text-main text-text-main' : 'border-transparent text-text-sec hover:text-text-main'}`}
        >
          Kho Tips của tôi
        </button>
        <button 
          onClick={() => setActiveTab('SAVED')}
          className={`font-bold tracking-widest uppercase text-[11px] pb-3 border-b-2 transition-colors ${activeTab === 'SAVED' ? 'border-text-main text-text-main' : 'border-transparent text-text-sec hover:text-text-main'}`}
        >
          Tips đã lưu
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 bg-white p-3 rounded-md shadow-sm border border-border flex items-center gap-3 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Tìm kiếm tip, từ khóa..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-text-main bg-transparent text-[13px]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-text-main">
              ✕
            </button>
          )}
        </div>
        <button 
          onClick={() => setIsFilterOpen(true)}
          className="bg-white px-4 py-3 rounded-md shadow-sm border border-border text-text-main hover:bg-gray-50 transition flex items-center gap-2 font-bold tracking-widest uppercase text-[11px]"
        >
          <Filter size={14} />
          <span className="hidden sm:inline">BỘ LỌC</span>
        </button>
      </div>

      <div className="space-y-4">
        {filteredTips.map(tip => {
          const isOwner = tip.userId === user.id;
          return (
            <div key={tip.id} className="bg-white p-6 rounded-md border border-border shadow-sm relative group hover:border-gray-300 transition-colors">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {tip.user?.avatarUrl ? (
                    <img 
                      src={tip.user.avatarUrl} 
                      className="w-10 h-10 rounded-full cursor-pointer object-cover border border-border" 
                      onClick={() => window.location.href = `/users/${tip.userId || tip.user?.id}`} 
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full bg-accent-bg flex items-center justify-center text-accent font-bold cursor-pointer"
                      onClick={() => window.location.href = `/users/${tip.userId || tip.user?.id}`}
                    >
                      {tip.user?.fullName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 
                        className="text-[16px] font-serif font-medium text-text-main cursor-pointer hover:text-accent transition-colors"
                        onClick={() => window.location.href = `/tips/${tip.id}`}
                      >
                        {tip.title}
                      </h3>
                      {tip.part && tip.part !== 'GENERAL' && (
                        <span className="bg-gray-100 text-text-sec text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{tip.part}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted mt-1">
                      <span 
                        className="font-bold text-text-sec cursor-pointer hover:text-accent transition-colors tracking-wide"
                        onClick={() => window.location.href = `/users/${tip.userId || tip.user?.id}`}
                      >
                        {tip.user?.fullName || 'Người dùng ẩn danh'}
                      </span>
                      <span className="text-border">•</span>
                      <span>{formatTimeAgo(tip.createdAt)}</span>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1 text-text-muted">
                        {tip.visibility === 'PRIVATE' && <><Lock size={12} /> Chỉ mình tôi</>}
                        {tip.visibility === 'PUBLIC' && <><Globe size={12} /> Cộng đồng</>}
                        {tip.visibility === 'GROUP' && <><Users size={12} /> Nhóm</>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isOwner && (
                    <>

                      <button onClick={() => setReportingId(reportingId === tip.id ? null : tip.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Báo cáo">
                        <Flag size={14} />
                      </button>
                    </>
                  )}
                  {isOwner && (
                    <>
                      <button onClick={() => handleEditClick(tip)} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Chỉnh sửa">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button onClick={() => handleDelete(tip.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setShareTipTarget(tip)}
                    className="text-slate-400 hover:text-green-500 transition-colors" title="Chia sẻ Tip (Gửi nhóm/Copy)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                  </button>
                </div>
              </div>
              
              {/* Structure */}
              <div 
                className="bg-blue-50 border border-blue-100 text-blue-900 font-medium p-4 rounded-lg mb-4 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => window.location.href = `/tips/${tip.id}`}
              >
                💡 {tip.structure}
              </div>
              
              {/* Description */}
              {tip.description && (
                <p className="text-slate-700 mb-4 whitespace-pre-line">{tip.description}</p>
              )}

              {/* Media */}
              {tip.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden shadow-sm cursor-zoom-in" onClick={() => { setLightboxImage(tip.imageUrl); setIsLightboxOpen(true); }}>
                  <img src={tip.imageUrl} alt="Tip" className="w-full h-auto object-cover max-h-96" />
                </div>
              )}
              {tip.voiceUrl && (
                <div className="mb-4">
                  {tip.voiceUrl.endsWith('.pdf') || tip.voiceUrl.includes('/raw/upload/') ? (
                    <a href={tip.voiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 bg-slate-100 rounded-lg border border-slate-200 text-blue-600 hover:bg-slate-200 transition">
                      <span className="text-xl">📄</span> Tải tài liệu đính kèm (PDF)
                    </a>
                  ) : (
                    <audio controls className="w-full h-10 outline-none">
                      <source src={tip.voiceUrl} type="audio/mpeg" />
                      Trình duyệt của bạn không hỗ trợ thẻ audio.
                    </audio>
                  )}
                </div>
              )}

              {/* Examples */}
              {tip.examples && tip.examples.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4 mb-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Ví dụ:</h4>
                  {tip.examples.map((ex, idx) => (
                    <div key={idx} className="flex gap-2 text-slate-700">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{ex}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Voting */}
              {(() => {
                const tipVotes = tip.votes || [];
                const upvotes = tipVotes.filter(v => v.type === 'UPVOTE').length;
                const downvotes = tipVotes.filter(v => v.type === 'DOWNVOTE').length;
                const userVote = tipVotes.find(v => v.userId === user.id)?.type;
                const saveCount = tip.savedByUsers?.length || 0;

                return (
                  <div className="flex items-center gap-4 mb-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center bg-slate-100 rounded-full">
                      <button 
                        onClick={() => handleVoteTip(tip.id, 'UPVOTE')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full transition-colors ${userVote === 'UPVOTE' ? 'text-blue-600 bg-blue-100' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        <ThumbsUp size={16} className={userVote === 'UPVOTE' ? 'fill-current' : ''} />
                        <span className="font-semibold text-sm">{upvotes}</span>
                      </button>
                      <div className="w-px h-4 bg-slate-300"></div>
                      <button 
                        onClick={() => handleVoteTip(tip.id, 'DOWNVOTE')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${userVote === 'DOWNVOTE' ? 'text-red-600 bg-red-100' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        <ThumbsDown size={16} className={userVote === 'DOWNVOTE' ? 'fill-current' : ''} />
                        <span className="font-semibold text-sm">{downvotes}</span>
                      </button>
                      <div className="w-px h-4 bg-slate-300"></div>
                      <button 
                        onClick={() => handleToggleSave(tip.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-r-full text-sm font-semibold transition-colors ${tip.savedByUsers?.some(u => u.userId === user.id) ? "text-accent bg-blue-100" : "text-slate-600 hover:bg-slate-200"}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={tip.savedByUsers?.some(u => u.userId === user.id) ? "fill-accent text-accent" : ""}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        {saveCount}
                      </button>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/tips/${tip.id}`;
                      }}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                    >
                      Luyện tập AI
                    </button>
                  </div>
                );
              })()}

              {/* Comments */}
              <CommentSection targetId={tip.id} targetType="TIP" />


            {/* Report Box */}
            {reportingId === tip.id && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in duration-200">
                <p className="text-sm font-semibold text-red-700 mb-2">🚩 Báo cáo nội dung này</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Lý do báo cáo..."
                    className="flex-1 border border-red-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:outline-none"
                  />
                  <button onClick={() => handleReport(tip.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600">Gửi</button>
                </div>
              </div>
            )}
          </div>
          );
        })}
        {tips.length === 0 && !isAdding && (
          <div className="text-center py-16 text-slate-400">
            <Lightbulb size={56} className="mx-auto mb-4 opacity-15" />
            <p className="text-lg">Chưa có tip nào. Hãy là người đầu tiên chia sẻ!</p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareTipTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Chia sẻ Tip</h3>
              <button onClick={() => setShareTipTarget(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <button 
                onClick={() => {
                  const shareText = `[Tip TOEIC] ${shareTipTarget.title}\n\n💡 Công thức: ${shareTipTarget.structure}\n${shareTipTarget.description ? `\n📝 Giải thích chi tiết: ${shareTipTarget.description}` : ''}\n\nĐược chia sẻ từ Toeic-Hub!`;
                  navigator.clipboard.writeText(shareText);
                  toast.success('Đã sao chép nội dung Tip!');
                  setShareTipTarget(null);
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:bg-green-50 hover:border-green-300 transition-colors group text-left"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Sao chép nội dung Tip</div>
                  <div className="text-xs text-slate-500">Copy đoạn văn bản để dán vào bất cứ đâu</div>
                </div>
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400 uppercase">Hoặc Gửi Tin Nhắn / Nhóm</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {friends.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-2 px-1">Bạn bè</h4>
                    <div className="space-y-1">
                      {friends.map(f => (
                        <label key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-indigo-50 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedShareFriends.includes(f.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedShareFriends([...selectedShareFriends, f.id]);
                              else setSelectedShareFriends(selectedShareFriends.filter(id => id !== f.id));
                            }}
                          />
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                            {f.avatarUrl ? <img src={f.avatarUrl} className="w-full h-full object-cover" /> : <Users size={14} className="text-slate-500" />}
                          </div>
                          <div className="flex-1 font-semibold text-sm text-slate-800 line-clamp-1">{f.fullName}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {myGroups.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-2 px-1">Nhóm của bạn</h4>
                    <div className="space-y-1">
                      {myGroups.map(group => (
                        <label key={group.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedShareGroups.includes(group.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedShareGroups([...selectedShareGroups, group.id]);
                              else setSelectedShareGroups(selectedShareGroups.filter(id => id !== group.id));
                            }}
                          />
                          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center overflow-hidden">
                            {group.avatar ? <img src={group.avatar} className="w-full h-full object-cover" /> : <Users size={14} className="text-blue-600" />}
                          </div>
                          <div className="flex-1 font-semibold text-sm text-slate-800 line-clamp-1">{group.name}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {friends.length === 0 && myGroups.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    Bạn chưa có bạn bè và chưa tham gia nhóm nào.
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => { setShareTipTarget(null); setSelectedShareGroups([]); setSelectedShareFriends([]); }} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors">Đóng</button>
              <button 
                onClick={handleShareToGroups}
                disabled={selectedShareGroups.length === 0 && selectedShareFriends.length === 0}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Gửi <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {isLightboxOpen && lightboxImage && (
        <ImageModal src={lightboxImage} onClose={() => setIsLightboxOpen(false)} />
      )}

      <FilterDrawer 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        resultCount={filteredTips.length}
      />
    </div>
  );
};

export default Tips;
