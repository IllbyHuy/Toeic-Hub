import { useState, useEffect } from 'react';
import { Plus, CheckSquare, Trash2, BookOpen, User, PlayCircle, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import CommentSection from '../components/CommentSection';
import ImageModal from '../components/ImageModal';
import { formatTimeAgo } from '../utils/formatDate';

const Grammar = () => {
  const [grammars, setGrammars] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newGrammar, setNewGrammar] = useState({ title: '', structure: '', description: '', examples: '' });
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchGrammars();
  }, []);

  const fetchGrammars = async () => {
    try {
      const res = await api.get('/grammars');
      setGrammars(res.data || []);
    } catch (error) {
      toast.error('Không thể tải danh sách ngữ pháp');
    }
  };

  const [imageFile, setImageFile] = useState(null);
  const [voiceFile, setVoiceFile] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', newGrammar.title);
      formData.append('structure', newGrammar.structure);
      formData.append('description', newGrammar.description);
      
      const examplesArray = newGrammar.examples.split('\n').map(s => s.trim()).filter(s => s);
      formData.append('examples', JSON.stringify(examplesArray));
      
      if (imageFile) formData.append('image', imageFile);
      if (voiceFile) formData.append('voice', voiceFile);

      const res = await api.post('/grammars', formData);
      setGrammars([res.data || res, ...grammars]);
      setIsAdding(false);
      setNewGrammar({ title: '', structure: '', description: '', examples: '' });
      setImageFile(null);
      setVoiceFile(null);
      toast.success('Thêm cấu trúc thành công!');
    } catch (error) {
      toast.error('Lỗi khi thêm cấu trúc');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá mục này không?")) return;
    try {
      await api.delete(`/grammars/${id}`);
      setGrammars(grammars.filter(v => v.id !== id));
      toast.success('Đã xóa cấu trúc');
    } catch (error) {
      toast.error('Lỗi khi xóa cấu trúc');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-accent-pink to-primary bg-clip-text text-transparent">Sổ tay Ngữ pháp</h1>
          <p className="text-slate-500 mt-1">Tổng hợp và ghi nhớ các cấu trúc quan trọng</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-gradient-to-r from-accent-pink to-primary text-white px-5 py-2.5 rounded-full font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          <Plus size={20} />
          {isAdding ? 'Hủy' : 'Thêm cấu trúc'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="glass-card p-6 rounded-2xl mb-8 animate-in fade-in slide-in-from-top-4 duration-300 border-t-4 border-t-accent-pink">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tên chủ điểm (Title) *</label>
            <input required type="text" value={newGrammar.title} onChange={e => setNewGrammar({...newGrammar, title: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent-pink focus:outline-none" placeholder="Ví dụ: Câu điều kiện loại 1" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cấu trúc (Structure) *</label>
            <input required type="text" value={newGrammar.structure} onChange={e => setNewGrammar({...newGrammar, structure: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent-pink focus:outline-none font-mono text-sm" placeholder="Ví dụ: If + S + V(s,es), S + will + V" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cách dùng (Description)</label>
            <textarea value={newGrammar.description} onChange={e => setNewGrammar({...newGrammar, description: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent-pink focus:outline-none h-20" placeholder="Diễn tả một điều kiện có thể xảy ra ở hiện tại hoặc tương lai..." />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Ví dụ (Examples - mỗi dòng 1 câu)</label>
            <textarea value={newGrammar.examples} onChange={e => setNewGrammar({...newGrammar, examples: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent-pink focus:outline-none h-24" placeholder="If it rains, I will stay at home." />
          </div>
          <div className="flex gap-4 mb-4">
            <label className="cursor-pointer flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition truncate max-w-[200px]">
              <ImageIcon size={18} className="text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-600 truncate">{imageFile ? imageFile.name : 'Đính kèm ảnh'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
            </label>
            <label className="cursor-pointer flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition truncate max-w-[200px]">
              <PlayCircle size={18} className="text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-600 truncate">{voiceFile ? voiceFile.name : 'Đính kèm âm thanh'}</span>
              <input type="file" accept="audio/*" className="hidden" onChange={e => setVoiceFile(e.target.files[0])} />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-accent-pink text-white px-6 py-2 rounded-lg font-semibold hover:bg-pink-600 transition-colors">Lưu cấu trúc</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-6">
        {grammars.map(grammar => (
          <div key={grammar.id} className="glass-card p-6 rounded-2xl relative border-l-4 border-l-accent-pink shadow-md hover:shadow-lg transition-shadow">
            {grammar.userId === user.id && (
              <button onClick={() => handleDelete(grammar.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
            )}
            
            {/* Author Info */}
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={grammar.user?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + grammar.userId} 
                alt="author avatar"
                className="w-10 h-10 rounded-full border border-slate-200 cursor-pointer object-cover shadow-sm"
                onClick={() => window.location.href = `/users/${grammar.userId}`}
              />
              <div>
                <div 
                  className="font-bold text-slate-800 cursor-pointer hover:text-accent-pink transition-colors"
                  onClick={() => window.location.href = `/users/${grammar.userId}`}
                >
                  {grammar.user?.fullName || 'Người dùng ẩn danh'}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {formatTimeAgo(grammar.createdAt)} {grammar.groupId ? '• Nhóm' : '• Công khai'}
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">{grammar.title}</h3>
            
            <div className="bg-slate-800 text-green-400 font-mono text-sm p-4 rounded-xl mb-4 shadow-inner overflow-x-auto whitespace-pre-wrap">
              {grammar.structure}
            </div>
            
            {grammar.description && (
              <p className="text-slate-600 mb-4 whitespace-pre-wrap leading-relaxed">{grammar.description}</p>
            )}

            {grammar.examples && grammar.examples.length > 0 && (
              <div className="space-y-3 mt-4 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Ví dụ:</h4>
                {grammar.examples.map((ex, idx) => (
                  <div key={idx} className="flex gap-2 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <CheckSquare size={18} className="text-accent-pink flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{ex}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Attachment - Audio */}
            {grammar.voiceUrl && (
              <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <PlayCircle className="text-indigo-500 flex-shrink-0" size={24} />
                <audio controls src={grammar.voiceUrl} className="w-full h-10 rounded-full" />
              </div>
            )}

            {/* Attachment - Image */}
            {grammar.imageUrl && (
              <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden cursor-zoom-in group-hover:shadow-md transition-shadow">
                <img 
                  src={grammar.imageUrl} 
                  alt="grammar illustration"
                  className="w-full max-h-80 object-contain bg-slate-50 hover:scale-105 transition-transform duration-500"
                  onClick={() => {
                    setLightboxImage(grammar.imageUrl);
                    setIsLightboxOpen(true);
                  }}
                />
              </div>
            )}
            
            <CommentSection targetId={grammar.id} targetType="GRAMMAR" />
          </div>
        ))}
        {grammars.length === 0 && !isAdding && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <p>Sổ tay đang trống. Hãy lưu lại các cấu trúc hay gặp nhé!</p>
          </div>
        )}
      </div>

      {isLightboxOpen && lightboxImage && (
        <ImageModal 
          src={lightboxImage} 
          onClose={() => setIsLightboxOpen(false)} 
        />
      )}
    </div>
  );
};

export default Grammar;
