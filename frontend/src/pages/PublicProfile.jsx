import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/PostCard';
import TipCard from '../components/TipCard';
import { Loader2, MessageSquare, BookOpen, Clock, Bookmark } from 'lucide-react';
import { formatTimeAgo } from '../utils/formatDate';
import { toast } from 'react-hot-toast';

const avatarColors = ['#4759e4', '#e0567a', '#14a38b', '#e08a1e', '#8a5cf0'];
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1][0].toUpperCase();
};
const getAvatarColor = (name) => {
  if (!name) return avatarColors[0];
  const charCodeSum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return avatarColors[charCodeSum % avatarColors.length];
};

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('POSTS'); // POSTS, COMMENTS, TIPS
  const [friendStatus, setFriendStatus] = useState('NONE');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/users/${id}`);
        setProfile(res.data || res);
      } catch (err) {
        setError('Không tìm thấy người dùng.');
      } finally {
        setLoading(false);
      }
    };

    const fetchFriendStatus = async () => {
      if (!currentUser.id) return;
      try {
        const res = await api.get(`/friendships/status/${id}`);
        setFriendStatus(res.data?.status || 'NONE');
      } catch (err) {
        console.error(err);
      }
    };

    fetchProfile();
    fetchFriendStatus();
  }, [id]);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  if (error || !profile) return <div className="text-center p-20 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile */}
      <div className="bg-white p-8 md:p-10 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-sm border border-border">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div 
          className="w-32 h-32 rounded-full shadow-md border-[3px] border-white flex-shrink-0 relative z-10 flex items-center justify-center text-white text-5xl font-semibold"
          style={!profile.avatarUrl ? { background: getAvatarColor(profile.fullName) } : {}}
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover rounded-full" />
          ) : (
            getInitials(profile.fullName)
          )}
        </div>
        
        <div className="relative z-10 text-center md:text-left flex-1">
          <h1 className="text-3xl font-serif font-medium text-text-main mb-2">{profile.fullName}</h1>
          <p className="text-text-sec font-mono text-[12px] uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5 mb-6">
            <Clock size={14} className="text-accent" /> Tham gia {formatTimeAgo(profile.createdAt)}
          </p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <div className="bg-bg-sec px-5 py-2.5 rounded-lg border border-border text-center min-w-[90px]">
              <div className="font-mono font-semibold text-text-main text-lg leading-none mb-1">{profile.posts?.length || 0}</div>
              <div className="text-[10px] text-text-sec uppercase tracking-widest font-bold">Bài viết</div>
            </div>
            <div className="bg-bg-sec px-5 py-2.5 rounded-lg border border-border text-center min-w-[90px]">
              <div className="font-mono font-semibold text-text-main text-lg leading-none mb-1">{profile.comments?.length || 0}</div>
              <div className="text-[10px] text-text-sec uppercase tracking-widest font-bold">Bình luận</div>
            </div>
            <div className="bg-bg-sec px-5 py-2.5 rounded-lg border border-border text-center min-w-[90px]">
              <div className="font-mono font-semibold text-text-main text-lg leading-none mb-1">{profile.grammars?.length || 0}</div>
              <div className="text-[10px] text-text-sec uppercase tracking-widest font-bold">Tips/Mẹo</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-col gap-2.5 w-full md:w-auto">
          {currentUser.id === profile.id ? (
            <button 
              onClick={() => navigate('/profile')}
              className="w-full md:w-auto px-6 py-2.5 bg-accent text-white rounded font-bold uppercase tracking-widest text-[11px] shadow-sm hover:opacity-90 transition-opacity"
            >
              Cài đặt & Chỉnh sửa
            </button>
          ) : (
            <>
              {friendStatus === 'NONE' && (
                <button 
                  onClick={async () => {
                    try {
                      await api.post(`/friendships/request/${id}`);
                      setFriendStatus('SENT');
                      toast.success('Đã gửi lời mời kết bạn');
                    } catch (e) { toast.error('Lỗi'); }
                  }}
                  className="w-full md:w-auto px-6 py-2.5 bg-text-main text-white rounded font-bold uppercase tracking-widest text-[11px] shadow-sm hover:bg-black transition-colors"
                >
                  Thêm bạn bè
                </button>
              )}
              {friendStatus === 'SENT' && (
                <button disabled className="w-full md:w-auto px-6 py-2.5 bg-gray-200 text-gray-500 rounded font-bold uppercase tracking-widest text-[11px] shadow-sm cursor-not-allowed">
                  Đã gửi lời mời
                </button>
              )}
              {friendStatus === 'RECEIVED' && (
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        await api.put(`/friendships/request/${id}/accept`);
                        setFriendStatus('ACCEPTED');
                        toast.success('Đã chấp nhận kết bạn');
                      } catch (e) { toast.error('Lỗi'); }
                    }}
                    className="flex-1 px-4 py-2.5 bg-status-mastered-bg border border-status-mastered text-status-mastered-text rounded font-bold uppercase tracking-widest text-[10px] shadow-sm hover:bg-[#d1fae5] transition-colors"
                  >
                    Chấp nhận
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await api.put(`/friendships/request/${id}/reject`);
                        setFriendStatus('NONE');
                      } catch (e) { toast.error('Lỗi'); }
                    }}
                    className="flex-1 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded font-bold uppercase tracking-widest text-[10px] shadow-sm hover:bg-red-50 transition-colors"
                  >
                    Từ chối
                  </button>
                </div>
              )}
              {friendStatus === 'ACCEPTED' && (
                <button 
                  onClick={async () => {
                    if (window.confirm('Bạn có chắc muốn hủy kết bạn?')) {
                      try {
                        await api.delete(`/friendships/${id}`);
                        setFriendStatus('NONE');
                        toast.success('Đã hủy kết bạn');
                      } catch (e) { toast.error('Lỗi'); }
                    }
                  }}
                  className="w-full md:w-auto px-6 py-2.5 bg-white border border-border text-text-main rounded font-bold uppercase tracking-widest text-[11px] shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Hủy kết bạn
                </button>
              )}

              <button 
                onClick={() => navigate(`/messages/${profile.id}`)}
                className="w-full md:w-auto px-6 py-2.5 bg-white text-accent border border-border rounded font-bold uppercase tracking-widest text-[11px] shadow-sm hover:bg-bg-sec hover:border-accent transition-colors"
              >
                Nhắn tin riêng
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border pb-px overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('POSTS')}
          className={`px-4 py-3 font-mono font-bold tracking-widest uppercase text-[11px] transition-colors border-b-2 whitespace-nowrap ${activeTab === 'POSTS' ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text-main hover:border-gray-300'}`}
        >
          Bài viết
        </button>
        <button 
          onClick={() => setActiveTab('COMMENTS')}
          className={`px-4 py-3 font-mono font-bold tracking-widest uppercase text-[11px] transition-colors border-b-2 whitespace-nowrap ${activeTab === 'COMMENTS' ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text-main hover:border-gray-300'}`}
        >
          Bình luận
        </button>
        <button 
          onClick={() => setActiveTab('TIPS')}
          className={`px-4 py-3 font-mono font-bold tracking-widest uppercase text-[11px] transition-colors border-b-2 whitespace-nowrap ${activeTab === 'TIPS' ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text-main hover:border-gray-300'}`}
        >
          Tips / Mẹo
        </button>
        {currentUser.id === profile.id && (
          <button 
            onClick={() => setActiveTab('SAVED')}
            className={`px-4 py-3 font-mono font-bold tracking-widest uppercase text-[11px] transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'SAVED' ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text-main hover:border-gray-300'}`}
          >
            Đã lưu <Bookmark size={14} />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'POSTS' && (
          <div className="space-y-4">
            {profile.posts?.length === 0 ? (
              <div className="text-center font-mono font-medium uppercase tracking-widest text-[12px] text-text-muted py-16 bg-bg-sec rounded-2xl border border-dashed border-border">Người dùng này chưa có bài viết nào.</div>
            ) : (
              profile.posts?.map(post => <PostCard key={post.id} post={post} />)
            )}
          </div>
        )}

        {activeTab === 'COMMENTS' && (
          <div className="space-y-4">
            {profile.comments?.length === 0 ? (
              <div className="text-center font-mono font-medium uppercase tracking-widest text-[12px] text-text-muted py-16 bg-bg-sec rounded-2xl border border-dashed border-border">Người dùng này chưa có bình luận nào.</div>
            ) : (
              profile.comments?.map(cmt => {
                let targetUrl = '#';
                let targetTitle = '';
                if (cmt.post) {
                  targetUrl = `/posts/${cmt.post.id}`;
                  targetTitle = cmt.post.title;
                } else if (cmt.grammar) {
                  targetUrl = `/tips/${cmt.grammar.id}`;
                  targetTitle = cmt.grammar.title;
                } else if (cmt.vocabulary) {
                  targetTitle = `Từ vựng: ${cmt.vocabulary.word}`;
                }

                return (
                  <div 
                    key={cmt.id} 
                    onClick={() => { if (targetUrl !== '#') window.location.href = targetUrl; }}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-border flex gap-4 hover:border-accent hover:-translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <MessageSquare className="text-accent mt-0.5 flex-shrink-0" size={18} />
                    <div className="w-full">
                      <div className="text-text-main text-[14.5px] leading-relaxed mb-2 whitespace-pre-wrap">
                        {cmt.content.split(' ').map((word, i) => 
                          word.startsWith('@') ? <strong key={i} className="text-accent font-semibold">{word} </strong> : word + ' '
                        )}
                      </div>
                      <div className="font-mono font-medium text-[11px] text-text-sec flex flex-wrap items-center gap-2 uppercase tracking-wide">
                        <span>{formatTimeAgo(cmt.createdAt)}</span>
                        {targetTitle && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-xl">
                              TRONG: <strong className="text-text-main group-hover:text-accent transition-colors ml-1">{targetTitle}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'TIPS' && (
          <div className="space-y-4">
            {profile.grammars?.length === 0 ? (
              <div className="text-center font-mono font-medium uppercase tracking-widest text-[12px] text-text-muted py-16 bg-bg-sec rounded-2xl border border-dashed border-border">Người dùng này chưa chia sẻ Tip nào.</div>
            ) : (
              profile.grammars?.map(tip => (
                <TipCard key={tip.id} tip={tip} user={currentUser} isDetail={false} />
              ))
            )}
          </div>
        )}
        
        {activeTab === 'SAVED' && currentUser.id === profile.id && (
          <div className="space-y-8">
            <div>
              <h3 className="font-mono font-bold tracking-widest uppercase text-[11px] text-text-sec mb-5 flex items-center gap-2">
                <Bookmark size={14} className="text-accent" /> BÀI VIẾT ĐÃ LƯU ({profile.savedPosts?.length || 0})
              </h3>
              <div className="space-y-4">
                {profile.savedPosts?.length === 0 ? (
                  <div className="text-center font-mono font-medium uppercase tracking-widest text-[12px] text-text-muted py-12 bg-bg-sec rounded-2xl border border-dashed border-border">Chưa có bài viết nào.</div>
                ) : (
                  profile.savedPosts?.map(saved => <PostCard key={saved.id} post={saved.post} />)
                )}
              </div>
            </div>

            <div>
              <h3 className="font-mono font-bold tracking-widest uppercase text-[11px] text-text-sec mb-5 flex items-center gap-2 mt-10">
                <BookOpen size={14} className="text-status-mastered-text" /> TIPS/MẸO ĐÃ LƯU ({profile.savedGrammars?.length || 0})
              </h3>
              <div className="space-y-4">
                {profile.savedGrammars?.length === 0 ? (
                  <div className="text-center font-mono font-medium uppercase tracking-widest text-[12px] text-text-muted py-12 bg-bg-sec rounded-2xl border border-dashed border-border">Chưa có tip nào.</div>
                ) : (
                  profile.savedGrammars?.map(saved => <TipCard key={saved.id} tip={saved.grammar} user={currentUser} isDetail={false} />)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
