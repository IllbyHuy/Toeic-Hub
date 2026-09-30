import { useState } from 'react';
import { ImagePlus, Send, X, Hash } from 'lucide-react';
import api from '../services/api';

const CreatePost = ({ onPostCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [part, setPart] = useState('PART_5');
  const [tagsInput, setTagsInput] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        setError('Tệp quá lớn. Vui lòng chọn tệp dưới 500MB.');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('part', part);
      
      const parsedTags = tagsInput.split(/[\s,]+/).filter(t => t.trim() !== '').map(t => t.startsWith('#') ? t : `#${t}`);
      if (parsedTags.length > 0) {
        formData.append('tags', JSON.stringify(parsedTags));
      }

      if (image) {
        formData.append('file', image);
      }

      await api.post('/posts', formData);

      setTitle('');
      setContent('');
      setTagsInput('');
      removeImage();
      setIsOpen(false);
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi đăng bài');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="bg-white p-6 rounded-[24px] shadow-2xl border border-slate-200">
      <form onSubmit={handleSubmit}>
        {error && <div className="text-red-500 text-[13.5px] mb-3">{error}</div>}
        
        <input
          type="text"
          placeholder="Tiêu đề câu hỏi / bài viết..."
          className="w-full text-lg font-semibold border-none focus:ring-0 p-0 mb-2 placeholder-slate-400"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
        
        <textarea
          placeholder="Bạn đang gặp khó khăn ở câu nào? Hãy chia sẻ nhé..."
          className="w-full border-none focus:ring-0 p-0 resize-none mb-3 placeholder-slate-400 text-slate-600"
          rows="3"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
        />

        <div className="flex items-center gap-2 mb-4 bg-slate-50 rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-primary transition w-full">
          <Hash size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Thêm hashtag (ví dụ: part5, tuvung...)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-600 placeholder-slate-400 p-0"
            disabled={loading}
          />
        </div>

        {imagePreview && (
          <div className="relative mb-4 inline-block">
            {image && image.type.startsWith('image/') && (
              <img src={imagePreview} alt="Preview" className="max-h-60 rounded border border-slate-200" />
            )}
            {image && (image.type.startsWith('audio/') || image.name.match(/\.(mp3|wav|m4a|ogg|aac|flac|wma|amr|opus)$/i)) && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 min-w-[300px]">
                <div className="text-xs font-semibold text-indigo-600 mb-2 truncate px-1">🎵 {image.name}</div>
                <audio controls src={imagePreview} className="w-full max-w-sm"></audio>
              </div>
            )}
            {image && image.type === 'application/pdf' && (
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 flex items-center gap-2">
                📄 {image.name}
              </div>
            )}
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex gap-4 items-center">
            <select
              value={part}
              onChange={(e) => setPart(e.target.value)}
              className="text-[13.5px] bg-slate-100 border-none rounded-full px-4 py-2 text-slate-700 font-medium focus:ring-1 focus:ring-blue-600 outline-none"
              disabled={loading}
            >
              <option value="GENERAL">Chung</option>
              <option value="PART_1">Part 1</option>
              <option value="PART_2">Part 2</option>
              <option value="PART_3">Part 3</option>
              <option value="PART_4">Part 4</option>
              <option value="PART_5">Part 5</option>
              <option value="PART_6">Part 6</option>
              <option value="PART_7">Part 7</option>
            </select>

            <div className="flex items-center gap-1">
              <label className="cursor-pointer text-slate-500 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-full transition flex items-center justify-center gap-1" title="Đính kèm ảnh">
                <ImagePlus size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={loading || image} />
              </label>
              
              <label className="cursor-pointer text-slate-500 hover:text-purple-500 hover:bg-purple-50 p-2 rounded-full transition flex items-center justify-center gap-1" title="Đính kèm âm thanh">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                <input type="file" accept="audio/*" className="hidden" onChange={handleImageChange} disabled={loading || image} />
              </label>
              
              <label className="cursor-pointer text-slate-500 hover:text-green-500 hover:bg-green-50 p-2 rounded-full transition flex items-center justify-center gap-1" title="Đính kèm tài liệu PDF">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <input type="file" accept="application/pdf" className="hidden" onChange={handleImageChange} disabled={loading || image} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-full font-medium transition text-[14.5px]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-medium flex items-center gap-2 transition shadow-sm disabled:opacity-50 text-[14.5px]"
            >
              {loading ? 'Đang đăng...' : 'Đăng bài'}
              {!loading && <Send size={16} />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="bg-white p-4 rounded-[24px] border border-slate-200 mb-6 flex items-center gap-4 cursor-pointer hover:border-slate-300 transition group shadow-sm"
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
          <ImagePlus size={20} />
        </div>
        <div className="flex-1 text-slate-500 text-[14.5px]">
          Bạn đang có thắc mắc gì? Hãy hỏi cộng đồng ngay...
        </div>
        <button className="bg-blue-50 text-blue-600 px-5 py-2.5 rounded-full font-medium group-hover:bg-blue-600 group-hover:text-white transition text-[13.5px]">
          Tạo Bài Viết
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl animate-in zoom-in-95 duration-200">
            {modalContent}
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePost;
