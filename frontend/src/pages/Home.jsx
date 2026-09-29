import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import { Loader2, Search, ArrowDownUp, HelpCircle } from 'lucide-react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

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

const Home = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [topContributors, setTopContributors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NEWEST'); // NEWEST or TOP
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('like'); // 'like', 'post', 'save'
  
  const isAuthenticated = !!localStorage.getItem('token');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/posts');
      setPosts(response.data?.posts || response.posts || []);
    } catch (err) {
      setError('Không thể tải danh sách bài viết. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    api.get('/users/top-contributors').then(res => {
      setTopContributors(res.data?.data || res.data);
    }).catch(console.error);
  }, []);

  const top3Posts = [...posts].sort((a, b) => {
    const upvotesA = a.votes ? a.votes.filter(v => v.type === 'UPVOTE').length : (a._count?.votes || 0);
    const upvotesB = b.votes ? b.votes.filter(v => v.type === 'UPVOTE').length : (b._count?.votes || 0);
    return upvotesB - upvotesA;
  }).slice(0, 3);

  const handlePostCreated = () => {
    fetchPosts();
  };

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Tiếp theo',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Hoàn thành',
      steps: [
        { 
          element: '#create-post-section', 
          popover: { 
            title: 'Tạo bài viết', 
            description: 'Tại đây bạn có thể chia sẻ kiến thức, đặt câu hỏi hoặc tạo thảo luận mới với cộng đồng.',
            side: "bottom", align: 'start'
          } 
        },
        { 
          element: '#feed-search-bar', 
          popover: { 
            title: 'Tìm kiếm', 
            description: 'Tìm nhanh các bài viết theo từ khóa hoặc hashtag.',
            side: "bottom", align: 'start'
          } 
        },
        { 
          element: '#feed-filters', 
          popover: { 
            title: 'Lọc bài viết', 
            description: 'Lọc bảng tin theo các kỹ năng như Listening, Reading, v.v.',
            side: "bottom", align: 'start'
          } 
        }
      ]
    });
    driverObj.drive();
  };

  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'ALL' && !searchQuery) return true;
    
    let skillMatch = true;
    if (activeFilter === 'LISTENING') skillMatch = ['PART_1', 'PART_2', 'PART_3', 'PART_4'].includes(post.part);
    else if (activeFilter === 'READING') skillMatch = ['PART_5', 'PART_6', 'PART_7'].includes(post.part);
    else if (activeFilter === 'GENERAL') skillMatch = post.part === 'GENERAL';

    let searchMatch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      searchMatch = (
        post.title?.toLowerCase().includes(query) || 
        post.content?.toLowerCase().includes(query) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query.replace('#', ''))))
      );
    }

    return skillMatch && searchMatch;
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

  const filterOptions = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'LISTENING', label: 'Listening' },
    { id: 'READING', label: 'Reading' },
    { id: 'GENERAL', label: 'Khác' }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-[1180px] mx-auto px-4 md:px-8 py-8 relative">


      {/* Cột trái: Feed chính */}
      <div className="w-full md:w-[65%] lg:w-[70%]">
        
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-[28px] font-bold text-text-main">Bảng Tin</h1>
          <button onClick={startTour} className="flex items-center gap-1.5 text-[#4361ee] bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
            <HelpCircle size={16} />
            <span className="text-[11px] font-bold tracking-widest uppercase">Hướng dẫn</span>
          </button>
        </div>

        {/* Search Bar */}
        <div id="feed-search-bar" className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-[16px] w-[16px] text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm câu hỏi, bài viết, hashtag..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-border text-text-main rounded-md py-3.5 pl-11 pr-4 focus:outline-none focus:border-accent transition-colors shadow-sm text-[14px] placeholder-gray-400"
          />
        </div>

        {/* Filters and Sort */}
        <div id="feed-filters" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex bg-white p-1 rounded-md border border-border overflow-x-auto w-full sm:w-auto no-scrollbar shadow-sm">
            {filterOptions.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-4 py-2 rounded font-bold tracking-widest uppercase text-[11px] whitespace-nowrap transition-colors ${activeFilter === f.id ? 'bg-text-main text-white shadow-sm' : 'text-text-sec hover:text-text-main hover:bg-gray-50'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 font-bold tracking-widest uppercase text-[11px] text-text-sec bg-white px-4 py-2.5 rounded-md border border-border shadow-sm shrink-0 hover:bg-gray-50 transition-colors">
            <ArrowDownUp size={14} className="text-gray-400" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none text-text-main font-bold tracking-widest uppercase cursor-pointer"
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="TOP">Nhiều vote nhất</option>
            </select>
          </div>
        </div>

        {isAuthenticated ? (
          <div id="create-post-section" className="mb-8">
            <CreatePost onPostCreated={handlePostCreated} />
          </div>
        ) : (
          <div className="bg-white p-8 rounded-md shadow-sm border border-border mb-8 text-center">
            <p className="text-text-sec text-[14px] mb-5">Tham gia thảo luận cùng hàng ngàn học viên TOEIC khác.</p>
            <a href="/login" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-accent text-[11px] font-bold tracking-widest uppercase text-white hover:bg-blue-700 transition-colors">Đăng nhập ngay</a>
          </div>
        )}

        {/* Danh sách bài viết */}
        {/* Danh sách bài viết */}
        <div className="flex flex-col border border-border rounded-[8px] bg-bg-sec shadow-sm">
          {loading && (
            <div className="flex flex-col items-center justify-center p-12 text-text-muted gap-4">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-[14px] font-mono uppercase">Đang tải bảng tin...</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 text-red-600 p-6 rounded-[8px] text-center text-[14px] font-mono uppercase">
              {error}
            </div>
          )}

          {!loading && !error && filteredPosts.length === 0 && (
            <div className="text-center p-16 text-text-sec bg-bg-sec rounded-[8px]">
              <p className="text-[14px] font-medium">Không tìm thấy bài viết nào.</p>
              <p className="text-[12px] mt-1 text-text-muted">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          )}

          {!loading && !error && filteredPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>

      {/* Cột phải: Trending */}
      <div className="w-full md:w-[35%] lg:w-[30%] flex flex-col gap-5 sticky top-[100px] h-fit">
        
        {/* KHÁM PHÁ XU HƯỚNG */}
        <section className="bg-white border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="font-mono font-semibold text-[11px] tracking-widest uppercase text-accent">Khám phá xu hướng</h2>
            <span className="flex items-center gap-1.5 font-mono font-medium text-[10px] text-gray-500">
              <i className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.18)]"></i>
              Tuần này
            </span>
          </div>
          <p className="text-gray-500 text-[12.5px] mb-4">Bài viết và câu hỏi được cộng đồng thảo luận nhiều nhất.</p>
          <div className="flex flex-col">
            {top3Posts.length > 0 ? top3Posts.map((post, i) => {
              const votes = post.votes ? post.votes.filter(v => v.type === 'UPVOTE').length - post.votes.filter(v => v.type === 'DOWNVOTE').length : 0;
              return (
                <div key={post.id} onClick={() => navigate(`/posts/${post.id}`)} className="grid grid-cols-[28px_1fr_auto] gap-x-2.5 gap-y-0.5 p-3.5 -mx-2 border-t border-border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors first:border-t-0 group">
                  <span className={`row-span-2 font-mono font-semibold text-[18px] pt-0.5 ${i === 0 ? 'text-accent' : 'text-gray-300'}`}>{i + 1}</span>
                  <span className="font-mono font-semibold text-[10.5px] tracking-wide uppercase text-accent">#{post.part || 'GENERAL'}</span>
                  <span className="col-start-3 row-span-2 self-center flex flex-col items-center gap-px min-w-[40px] px-2 py-1.5 rounded-lg bg-[#eceefd] text-accent font-mono font-semibold text-[13px]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                    <small className="font-medium text-[9px] opacity-75">vote</small>
                  </span>
                  <span className="col-start-2 font-mono font-medium text-[14px] leading-tight text-gray-900 line-clamp-2">{post.title || post.content.replace(/<[^>]+>/g, '')}</span>
                  <span className="col-start-2 text-[11.5px] text-gray-500">bởi {post.author?.fullName || 'Người dùng ẩn danh'}</span>
                </div>
              );
            }) : (
              <div className="text-[13px] text-gray-400 italic">Chưa có bài viết nổi bật.</div>
            )}
          </div>
        </section>

        {/* THÀNH VIÊN NỔI BẬT */}
        {topContributors && (
          <section className="bg-white border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="font-mono font-semibold text-[11px] tracking-widest uppercase text-accent">Thành viên nổi bật</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-slate-50 rounded-xl p-1 my-3.5" role="tablist">
              <button 
                onClick={() => setActiveLeaderboardTab('like')} 
                className={`flex-1 py-2 px-1 rounded-lg font-mono font-semibold text-[10.5px] tracking-wider uppercase transition-all ${activeLeaderboardTab === 'like' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Yêu thích
              </button>
              <button 
                onClick={() => setActiveLeaderboardTab('post')} 
                className={`flex-1 py-2 px-1 rounded-lg font-mono font-semibold text-[10.5px] tracking-wider uppercase transition-all ${activeLeaderboardTab === 'post' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Chăm chỉ
              </button>
              <button 
                onClick={() => setActiveLeaderboardTab('save')} 
                className={`flex-1 py-2 px-1 rounded-lg font-mono font-semibold text-[10.5px] tracking-wider uppercase transition-all ${activeLeaderboardTab === 'save' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Được lưu
              </button>
            </div>

            {/* Panel */}
            <div className="min-h-[1px]">
              {(() => {
                let dataList = [];
                let unit = '';
                if (activeLeaderboardTab === 'like') {
                  dataList = topContributors.mostLikes.map(u => ({ ...u, value: u.likesCount }));
                  unit = 'lượt thích';
                } else if (activeLeaderboardTab === 'post') {
                  dataList = topContributors.mostPosts.map(u => ({ ...u, value: u.postsCount }));
                  unit = 'bài viết';
                } else {
                  dataList = topContributors.mostSaved.map(u => ({ ...u, value: u.savedCount }));
                  unit = 'lượt lưu';
                }

                if (!dataList || dataList.length === 0) {
                  return <div className="text-[12px] text-gray-400">Chưa có dữ liệu</div>;
                }

                const maxVal = Math.max(1, ...dataList.map(x => x.value));
                const topUser = dataList[0];

                return (
                  <>
                    <div className="flex items-center gap-3.5 p-4 my-2 rounded-xl bg-gradient-to-br from-[#eceefd] to-transparent border border-border">
                      <div className="w-[52px] h-[52px] rounded-full text-[20px] font-semibold text-white flex items-center justify-center shrink-0" style={{ background: getAvatarColor(topUser.fullName) }}>
                        {getInitials(topUser.fullName)}
                      </div>
                      <div className="truncate">
                        <b className="block text-[15px] truncate"><span className="inline-block mr-1">👑</span>{topUser.fullName}</b>
                        <span className="text-[12px] text-gray-500">Dẫn đầu tuần này</span>
                      </div>
                      <div className="ml-auto text-right font-mono font-semibold text-[26px] leading-none text-accent shrink-0">
                        {topUser.value}
                        <small className="block mt-1 font-mono font-medium text-[9px] text-gray-500 tracking-wide uppercase">{unit}</small>
                      </div>
                    </div>

                    {dataList.slice(1).map((user, idx) => (
                      <div key={user.id} className="grid grid-cols-[20px_34px_1fr_64px_22px] items-center gap-2.5 py-2.5 border-t border-border first-of-type:border-t-0">
                        <span className="font-mono font-semibold text-[12px] text-gray-500 text-center">{idx + 2}</span>
                        <span className="w-[34px] h-[34px] rounded-full text-[13px] font-semibold text-white flex items-center justify-center" style={{ background: getAvatarColor(user.fullName) }}>
                          {getInitials(user.fullName)}
                        </span>
                        <span className="font-medium text-[13px] truncate">{user.fullName}</span>
                        <span className="h-[5px] rounded-full bg-slate-50 overflow-hidden flex-1" aria-hidden="true">
                          <i className="block h-full rounded-full bg-accent transition-all duration-400" style={{ width: `${(user.value / maxVal) * 100}%` }}></i>
                        </span>
                        <span className="font-mono font-semibold text-[13px] text-accent text-right">{user.value}</span>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </section>
        )}
      </div>

    </div>
  );
};

export default Home;
