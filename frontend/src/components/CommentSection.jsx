import { useState, useEffect } from 'react';
import { Send, Trash2, Edit2, Image as ImageIcon, MessageSquare, ThumbsUp, ThumbsDown, Flag, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatTimeAgo } from '../utils/formatDate';
import ImageModal from './ImageModal';

const CommentSection = ({ targetId, targetType }) => {
  const [comments, setComments] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState(null); // { id, authorName }
  const [replyContent, setReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchComments();
  }, [targetId, targetType]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments?targetId=${targetId}&targetType=${targetType}`);
      setComments(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('content', newContent);
      formData.append('targetId', targetId);
      formData.append('targetType', targetType);
      
      if (selectedFile) {
        formData.append('image', selectedFile);
      } else if (newImageUrl) {
        formData.append('imageUrl', newImageUrl);
      }

      const res = await api.post('/comments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setComments([res.data || res, ...comments]);
      setNewContent('');
      setNewImageUrl('');
      setSelectedFile(null);
    } catch (error) {
      toast.error('Lỗi khi gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (rootId, replyToCommentId, replyToAuthorName) => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      const finalContent = (replyToCommentId !== rootId) 
        ? `@${replyToAuthorName} ${replyContent}` 
        : replyContent;

      const res = await api.post('/comments', {
        content: finalContent,
        targetId,
        targetType,
        parentId: rootId,
        replyToCommentId
      });
      
      // Add the reply to the root parent comment's replies
      setComments(prev => prev.map(c => {
        if (c.id === rootId) {
          return { ...c, replies: [...(c.replies || []), res.data || res], _count: { ...c._count, replies: (c._count?.replies || 0) + 1 } };
        }
        return c;
      }));
      
      setReplyContent('');
      setReplyingTo(null);
      setExpandedReplies(prev => new Set([...prev, rootId]));
    } catch (error) {
      toast.error('Lỗi khi trả lời bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá bình luận này không?")) return;
    try {
      await api.delete(`/comments/${id}`);
      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      toast.error('Lỗi khi xóa bình luận');
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditContent(c.content);
    setEditImageUrl(c.imageUrl || '');
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.put(`/comments/${id}`, { content: editContent, imageUrl: editImageUrl || null });
      setComments(comments.map(c => c.id === id ? { ...c, content: editContent, imageUrl: editImageUrl } : c));
      setEditingId(null);
    } catch (error) {
      toast.error('Lỗi khi sửa bình luận');
    }
  };

  const handleVote = async (id, type) => {
    try {
      await api.post(`/votes/comments/${id}`, { type });
      fetchComments();
    } catch (error) {
      toast.error('Lỗi khi vote bình luận');
    }
  };

  const handleReport = async (id) => {
    if (!reportReason.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }
    try {
      await api.post('/reports', {
        targetType: 'COMMENT',
        targetId: id,
        reason: reportReason.trim()
      });
      toast.success('Đã gửi báo cáo đến Admin');
      setReportingId(null);
      setReportReason('');
    } catch (error) {
      toast.error('Lỗi khi gửi báo cáo');
    }
  };

  const [sortBy, setSortBy] = useState('newest');

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'top') {
      return (b._count?.votes || 0) - (a._count?.votes || 0);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const renderComment = (c, isReplyItem = false) => {
    const isOwner = c.authorId === user.id;
    const isEditing = editingId === c.id;

    return (
      <div key={c.id} className={`flex gap-3 text-sm ${isReplyItem ? '' : ''}`}>
        <img 
          src={c.author?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.authorId} 
          className={`${isReplyItem ? 'w-7 h-7' : 'w-8 h-8'} rounded-full border border-slate-200 cursor-pointer object-cover`} 
          alt="avatar" 
          onClick={() => window.location.href = `/users/${c.authorId}`}
        />
        <div className="flex-1">
          <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100 relative group">
            <div className="flex justify-between items-start mb-1">
              <span 
                className="font-bold text-slate-800 cursor-pointer hover:text-primary transition-colors"
                onClick={() => window.location.href = `/users/${c.authorId}`}
              >
                {c.author?.fullName || 'User'}
              </span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isOwner && (
                  <button onClick={() => setReportingId(reportingId === c.id ? null : c.id)} className="text-slate-400 hover:text-red-500"><Flag size={14} /></button>
                )}
                {isOwner && !isEditing && (
                  <>
                    <button onClick={() => startEdit(c)} className="text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mt-2">
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full border rounded p-2 text-sm mb-2" />
                <input type="text" value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} className="w-full border rounded p-1 text-xs mb-2" placeholder="Image URL" />
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(c.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">Lưu</button>
                  <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200">Hủy</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {c.content.split(' ').map((word, i) => 
                    word.startsWith('@') ? <strong key={i} className="text-blue-600 font-bold">{word} </strong> : word + ' '
                  )}
                </p>
                {c.imageUrl && (
                  <img 
                    src={c.imageUrl} 
                    alt="attached" 
                    className="max-h-40 rounded-lg mt-2 border border-slate-200 cursor-zoom-in" 
                    onClick={() => { setLightboxImage(c.imageUrl); setIsLightboxOpen(true); }}
                  />
                )}
              </>
            )}
          </div>

          {reportingId === c.id && (
            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs font-bold text-red-600 mb-2">Báo cáo vi phạm</p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Lý do báo cáo..."
                className="w-full border-red-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none h-12 mb-2"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setReportingId(null)} className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition">Hủy</button>
                <button onClick={() => handleReport(c.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition">Gửi</button>
              </div>
            </div>
          )}
          
          {!isEditing && (() => {
            const commentVotes = c.votes || [];
            const upvotes = commentVotes.filter(v => v.type === 'UPVOTE').length;
            const displayUpvotes = c.votes ? upvotes : (c._count?.votes || 0);
            const downvotes = commentVotes.filter(v => v.type === 'DOWNVOTE').length;
            const userVote = commentVotes.find(v => v.userId === user.id)?.type;

            return (
              <div className="flex items-center gap-4 mt-1 ml-2 text-xs text-slate-500 font-medium">
                <span>{formatTimeAgo(c.createdAt)}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleVote(c.id, 'UPVOTE')} className={`flex items-center gap-1 transition ${userVote === 'UPVOTE' ? 'text-blue-600' : 'hover:text-blue-500'}`}>
                    <ThumbsUp size={12} className={userVote === 'UPVOTE' ? 'fill-current' : ''} /> {displayUpvotes > 0 && displayUpvotes}
                  </button>
                  <button onClick={() => handleVote(c.id, 'DOWNVOTE')} className={`flex items-center gap-1 transition ${userVote === 'DOWNVOTE' ? 'text-red-600' : 'hover:text-red-500'}`}>
                    <ThumbsDown size={12} className={userVote === 'DOWNVOTE' ? 'fill-current' : ''} /> {downvotes > 0 && downvotes}
                  </button>
                </div>
                {/* Reply button */}
                <button 
                  onClick={() => setReplyingTo(replyingTo?.id === c.id ? null : { id: c.id, rootId: c.parentId || c.id, authorName: c.author?.fullName })}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <Reply size={12} /> Trả lời
                </button>
              </div>
            );
          })()}

          {/* Reply Input */}
          {replyingTo?.id === c.id && (
            <div className="mt-2 ml-2 flex items-center gap-2">
              <img 
                src={user.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.id}
                className="w-6 h-6 rounded-full object-cover"
                alt="your avatar"
              />
              <input
                type="text"
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(replyingTo.rootId, replyingTo.id, replyingTo.authorName); } }}
                placeholder={`Trả lời ${c.author?.fullName || 'User'}...`}
                className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                autoFocus
              />
              <button 
                onClick={() => handleReply(replyingTo.rootId, replyingTo.id, replyingTo.authorName)}
                disabled={!replyContent.trim()}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Send size={12} />
              </button>
            </div>
          )}

          {/* Replies */}
          {!isReplyItem && c._count?.replies > 0 && (
            <button 
              onClick={() => toggleReplies(c.id)}
              className="mt-2 ml-2 text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
            >
              {expandedReplies.has(c.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expandedReplies.has(c.id) ? 'Ẩn' : `Xem ${c._count.replies} phản hồi`}
            </button>
          )}
          
          {!isReplyItem && expandedReplies.has(c.id) && c.replies && (
            <div className="mt-2 ml-4 space-y-3 border-l-2 border-slate-100 pl-3">
              {c.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-slate-700 flex items-center gap-2">
          <MessageSquare size={16} /> Thảo luận ({comments.length})
        </h4>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 outline-none text-slate-500">
          <option value="newest">Mới nhất</option>
          <option value="top">Yêu thích</option>
        </select>
      </div>

      {/* Form */}
      <form onSubmit={handlePost} className="mb-6 flex flex-col gap-2">
        <textarea 
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="Viết bình luận..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all focus:outline-none resize-none h-14"
          disabled={isSubmitting}
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1 mr-4">
            <label className="flex items-center gap-1 cursor-pointer text-slate-500 hover:text-blue-500 transition-colors">
              <ImageIcon size={18} />
              <span className="text-xs font-semibold">Ảnh</span>
              <input 
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </label>
            {selectedFile && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded truncate max-w-[150px]">
                {selectedFile.name}
              </span>
            )}
            {!selectedFile && (
              <input 
                type="text" 
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                placeholder="Hoặc dán Link URL ảnh"
                className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 outline-none focus:border-blue-300 ml-2"
                disabled={isSubmitting}
              />
            )}
            {selectedFile && (
               <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 text-xs font-bold hover:underline">Xóa ảnh</button>
            )}
          </div>
          <button type="submit" disabled={isSubmitting || !newContent.trim()} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 flex-shrink-0 disabled:opacity-50 transition-all">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send size={16} />}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-4">
        {sortedComments.map(c => renderComment(c))}
      </div>

      {isLightboxOpen && lightboxImage && (
        <ImageModal src={lightboxImage} onClose={() => setIsLightboxOpen(false)} />
      )}
    </div>
  );
};

export default CommentSection;
