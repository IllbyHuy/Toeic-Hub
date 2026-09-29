import { useState, useEffect } from 'react';
import { MessageCircle, ThumbsUp, ThumbsDown, Bookmark, Share2, Sparkles, Loader2, Send } from 'lucide-react';
import { formatTimeAgo } from '../utils/formatDate';
import api from '../services/api';
import toast from 'react-hot-toast';
import CommentSection from './CommentSection';
import ImageModal from './ImageModal';

const PostCard = ({ post: initialPost }) => {
  const [post, setPost] = useState(initialPost);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Share state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [myGroups, setMyGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedShareGroups, setSelectedShareGroups] = useState([]);
  const [selectedShareFriends, setSelectedShareFriends] = useState([]);
  const [isShareDataLoaded, setIsShareDataLoaded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const handleAskAI = async () => {
    // Nếu đang mở khung giải thích mà không gõ gì thêm -> Đóng
    if (explanation && !customPrompt.trim()) {
      setExplanation(null);
      setIsPromptOpen(false);
      return;
    }

    setIsExplaining(true);
    setError('');

    try {
      const res = await api.post('/ai/explain', { 
        postId: post.id,
        userPrompt: customPrompt.trim() 
      });
      setExplanation(res.data?.explanation || res.explanation);
      setCustomPrompt(''); // clear prompt sau khi hỏi xong
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi khi gọi AI. Vui lòng thử lại sau.');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSaveAIExplanation = async () => {
    try {
      await api.post('/grammars', {
        title: `Giải thích từ AI cho bài viết của ${post.author?.fullName || 'Người dùng'}`,
        structure: post.content.substring(0, 100) + '...',
        description: explanation,
        examples: [],
        part: post.part,
        visibility: 'PRIVATE'
      });
      toast.success('Đã lưu giải thích của AI vào sổ tay (Tips)');
    } catch (error) {
      toast.error('Lỗi khi lưu giải thích AI');
    }
  };

  const handleOpenShare = async () => {
    setIsShareModalOpen(true);
    if (!isShareDataLoaded) {
      try {
        const [groupsRes, friendsRes] = await Promise.all([
          api.get('/groups/my-groups'),
          api.get('/friendships/friends')
        ]);
        setMyGroups(groupsRes.data || []);
        setFriends(friendsRes.data || []);
        setIsShareDataLoaded(true);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleShareToGroups = async () => {
    if (selectedShareGroups.length === 0 && selectedShareFriends.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 người hoặc nhóm để gửi');
      return;
    }
    
    // Send structured JSON so GroupDetail.jsx and Messages.jsx can render a rich card
    const shareContent = JSON.stringify({
      type: 'SHARED_POST',
      id: post.id,
      title: post.title,
      content: post.content.substring(0, 100) + '...',
      part: post.part
    });
    
    try {
      setIsSharing(true);
      const groupPromises = selectedShareGroups.map(groupId => 
        api.post(`/groups/${groupId}/messages`, { content: shareContent })
      );
      const friendPromises = selectedShareFriends.map(userId => 
        api.post(`/messages/${userId}`, { content: shareContent })
      );
      
      await Promise.all([...groupPromises, ...friendPromises]);
      toast.success('Đã chia sẻ bài viết thành công!');
      setIsShareModalOpen(false);
      setSelectedShareGroups([]);
      setSelectedShareFriends([]);
    } catch (error) {
      toast.error('Lỗi khi chia sẻ');
    } finally {
      setIsSharing(false);
    }
  };

  const handleToggleComments = () => {
    setIsCommentsOpen(!isCommentsOpen);
  };

  const handleVote = async (type) => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await api.post(`/votes/posts/${post.id}`, { type });
      const voted = (res.data || res).voted; // null if removed, type if added/updated
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      let updatedVotes = post.votes || [];
      // Remove previous vote of this user
      updatedVotes = updatedVotes.filter(v => v.userId !== user.id);
      // Add new vote if it wasn't a toggle off
      if (voted) {
        updatedVotes.push({ type: voted, userId: user.id });
      }
      
      setPost(prev => ({ ...prev, votes: updatedVotes }));
    } catch (err) {
      console.error('Failed to vote', err);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="bg-bg-sec border-b border-border p-6 transition-colors hover:bg-bg-main first:rounded-t-[8px] last:rounded-b-[8px] last:border-b-0">
      {/* Header: Author & Time */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3">
          {post.author?.avatarUrl ? (
            <img 
              src={post.author.avatarUrl} 
              alt="Avatar" 
              className="w-12 h-12 rounded-full object-cover shadow-sm cursor-pointer" 
              onClick={() => window.location.href = `/users/${post.authorId}`}
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center text-accent font-bold cursor-pointer border border-border"
              onClick={() => window.location.href = `/users/${post.authorId}`}
            >
              {post.author?.fullName?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <h4 
              className="font-semibold text-text-main tracking-tight cursor-pointer hover:text-accent transition-colors text-[14px]"
              onClick={() => window.location.href = `/users/${post.authorId}`}
            >
              {post.author?.fullName || 'Người dùng ẩn danh'}
            </h4>
            <p className="text-[10px] text-text-muted font-mono uppercase mt-0.5">{formatTimeAgo(post.createdAt)} • {post.part}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        className="mb-5 cursor-pointer"
        onClick={() => window.location.href = `/posts/${post.id}`}
      >
        <h3 className="text-[17px] font-medium text-text-main mb-2 hover:text-accent transition-colors leading-tight">{post.title}</h3>
        <p className="text-text-sec text-[14px] whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>

      {/* Image Attachment */}
      {post.imageUrl && (
        <div 
          className="mb-4 rounded-lg overflow-hidden border border-slate-100 max-h-96 flex justify-center bg-slate-50 cursor-zoom-in"
          onClick={() => setIsLightboxOpen(true)}
        >
          <img 
            src={post.imageUrl} 
            alt="Đính kèm bài viết" 
            className="max-w-full max-h-96 object-contain hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      {/* Other Attachments (Audio/PDF) */}
      {post.fileUrl && (
        <div className="mb-4">
          {post.fileUrl.match(/\.(mp3|wav|m4a|ogg|aac)$/i) || (post.fileName && post.fileName.match(/\.(mp3|wav|m4a|ogg|aac)$/i)) || post.fileUrl.includes('/video/upload/') ? (
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-3">
              <audio controls src={post.fileUrl} className="w-full h-10 rounded-full">
                Trình duyệt của bạn không hỗ trợ thẻ audio.
              </audio>
            </div>
          ) : (
            <a href={post.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 bg-slate-100 rounded-lg border border-slate-200 text-blue-600 hover:bg-slate-200 transition">
              <span className="text-xl">📄</span> {post.fileName || 'Tài liệu đính kèm'}
            </a>
          )}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {post.tags.map(tag => (
            <span 
              key={tag} 
              onClick={() => window.location.href = `/?search=${encodeURIComponent(tag)}`}
              className="px-2 py-1 bg-slate-100 text-indigo-600 text-xs rounded-md cursor-pointer hover:bg-indigo-50 font-medium transition-colors"
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* AI Explanation Area */}
      {error && <div className="mb-5 text-sm text-red-600 bg-red-50/50 p-4 rounded-2xl border border-red-100">{error}</div>}
      
      {explanation && (
        <div className="mb-5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Sparkles size={18} className="text-blue-600" />
              AI Giải thích
            </div>
            <button 
              onClick={handleSaveAIExplanation}
              className="text-xs bg-white text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-semibold transition-colors"
            >
              Lưu vào Sổ tay
            </button>
          </div>
          <div className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
            {explanation}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          {(() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const tipVotes = post.votes || [];
            const upvotes = tipVotes.filter(v => v.type === 'UPVOTE').length;
            const displayUpvotes = post.votes ? upvotes : (post._count?.votes || 0);
            const downvotes = tipVotes.filter(v => v.type === 'DOWNVOTE').length;
            const userVote = tipVotes.find(v => v.userId === user.id)?.type;

            return (
              <div className="flex items-center border border-border rounded">
                <button 
                  onClick={() => handleVote('UPVOTE')}
                  disabled={isLiking}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${userVote === 'UPVOTE' ? 'text-accent bg-accent-bg' : 'text-text-sec hover:bg-bg-main'}`}
                >
                  <ThumbsUp size={14} className={userVote === 'UPVOTE' ? "fill-current" : ""} />
                  <span className="text-[11px] font-mono">{displayUpvotes}</span>
                </button>
                <div className="w-px h-4 bg-border"></div>
                <button 
                  onClick={() => handleVote('DOWNVOTE')}
                  disabled={isLiking}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${userVote === 'DOWNVOTE' ? 'text-red-600 bg-red-50' : 'text-text-sec hover:bg-bg-main'}`}
                >
                  <ThumbsDown size={14} className={userVote === 'DOWNVOTE' ? "fill-current" : ""} />
                  <span className="text-[11px] font-mono">{downvotes}</span>
                </button>
              </div>
            );
          })()}
          <button 
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 px-3 py-1.5 text-text-sec border border-border rounded hover:bg-bg-main transition-colors"
          >
            <MessageCircle size={14} />
            <span className="text-[11px] font-mono">{post._count?.comments || 0}</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (explanation && !isPromptOpen) {
                setExplanation(null);
                return;
              }
              if (!isPromptOpen) {
                setIsPromptOpen(true);
              } else if (!customPrompt.trim()) {
                handleAskAI(); // Hỏi câu mặc định
              } else {
                handleAskAI(); // Hỏi câu custom
              }
            }}
            disabled={isExplaining}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono uppercase transition-colors text-[11px] ${
              explanation || isPromptOpen
                ? 'bg-bg-main text-text-sec hover:text-text-main border border-border' 
                : 'bg-accent-bg text-accent hover:opacity-90'
            }`}
          >
            {isExplaining ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span className="hidden sm:inline">
              {isExplaining ? 'Đang hỏi...' : explanation && !isPromptOpen ? 'Đóng AI' : 'Hỏi AI'}
            </span>
          </button>
          <button 
            onClick={async () => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              const isSaved = post.savedByUsers?.some(s => s.userId === user.id);
              try {
                if (isSaved) {
                  await api.delete(`/posts/${post.id}/save`);
                  setPost(prev => ({...prev, savedByUsers: prev.savedByUsers.filter(s => s.userId !== user.id)}));
                } else {
                  await api.post(`/posts/${post.id}/save`);
                  setPost(prev => ({...prev, savedByUsers: [...(prev.savedByUsers || []), { userId: user.id }]}));
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <Bookmark size={18} className={(() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              return post.savedByUsers?.some(s => s.userId === user.id) ? "fill-blue-500 text-blue-500" : "";
            })()} />
          </button>
          <button 
            onClick={handleOpenShare}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Custom Prompt Input Box */}
      {isPromptOpen && (
        <div className="mt-4 flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Bạn muốn AI giải thích cụ thể điều gì? (vd: Tại sao không chọn C?)"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAskAI()}
            disabled={isExplaining}
          />
        </div>
      )}

      {/* Comments Section */}
      {isCommentsOpen && (
        <CommentSection targetId={post.id} targetType="POST" />
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && post.imageUrl && (
        <ImageModal src={post.imageUrl} onClose={() => setIsLightboxOpen(false)} />
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Chia sẻ bài viết</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <button 
                onClick={() => {
                  const shareText = `[Cộng đồng TOEIC] ${post.title}\n\n${post.content}\n\nXem chi tiết tại: ${window.location.origin}/posts/${post.id}`;
                  navigator.clipboard.writeText(shareText);
                  toast.success('Đã sao chép liên kết!');
                  setIsShareModalOpen(false);
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:bg-green-50 hover:border-green-300 transition-colors group text-left"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Sao chép liên kết</div>
                  <div className="text-xs text-slate-500">Copy link để gửi cho bất cứ ai</div>
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
                            {f.avatarUrl ? <img src={f.avatarUrl} className="w-full h-full object-cover" /> : <div className="text-slate-500 text-xs font-bold">{f.fullName.charAt(0)}</div>}
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
                            {group.avatar ? <img src={group.avatar} className="w-full h-full object-cover" /> : <div className="text-blue-600 text-xs font-bold">{group.name.charAt(0)}</div>}
                          </div>
                          <div className="flex-1 font-semibold text-sm text-slate-800 line-clamp-1">{group.name}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {friends.length === 0 && myGroups.length === 0 && isShareDataLoaded && (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    Bạn chưa có bạn bè và chưa tham gia nhóm nào.
                  </div>
                )}
                
                {!isShareDataLoaded && (
                  <div className="flex justify-center py-6">
                    <Loader2 size={24} className="text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsShareModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors">Đóng</button>
              <button 
                onClick={handleShareToGroups}
                disabled={isSharing || (selectedShareGroups.length === 0 && selectedShareFriends.length === 0)}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSharing ? <Loader2 size={16} className="animate-spin" /> : 'Gửi'} 
                {!isSharing && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
