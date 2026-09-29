import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../services/api';

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

const Landing = () => {
  const navigate = useNavigate();
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [topPosts, setTopPosts] = useState([]);

  useEffect(() => {
    const fetchTopPosts = async () => {
      try {
        const res = await api.get('/posts');
        const sorted = (res.data?.posts || res.data || []).sort((a, b) => {
          const upvotesA = a.votes ? a.votes.filter(v => v.type === 'UPVOTE').length : (a._count?.votes || 0);
          const upvotesB = b.votes ? b.votes.filter(v => v.type === 'UPVOTE').length : (b._count?.votes || 0);
          return upvotesB - upvotesA;
        });
        setTopPosts(sorted.slice(0, 3));
      } catch (err) {
        console.error(err);
      }
    };
    fetchTopPosts();
  }, []);

  const handleAiChat = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    
    try {
      const res = await api.post('/ai/chat', { message: aiQuery });
      setAiResponse(res.data?.reply || 'Có lỗi xảy ra, vui lòng thử lại.');
    } catch (error) {
      setAiResponse('Xin lỗi, tôi đang bận hoặc hệ thống bị lỗi. Bạn thử lại sau nhé!');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full text-[#1c2230] bg-[#fafbfd] font-sans selection:bg-blue-100 min-h-screen flex flex-col">
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="pt-16 pb-16 px-5 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full p-1 pr-4 mb-10 shadow-sm text-[13px]">
            <span className="bg-[#4361ee] text-white px-3 py-1 rounded-full font-semibold text-[11px] uppercase tracking-wide">MỚI</span>
            <span className="text-gray-600">Không gian học chung. Tiến bộ cùng đồng đội.</span>
          </div>

          <h1 className="text-[clamp(40px,6vw,72px)] leading-[1.05] font-medium tracking-tight max-w-[900px] mx-auto text-[#111]">
            Một nơi cho những người học<br/>
            thấy rõ <span className="font-serif italic text-[#4361ee]">tiến bộ.</span>
          </h1>

          <p className="mt-8 text-[18px] md:text-[21px] text-gray-500 max-w-[640px] mx-auto leading-relaxed">
            Đề thi, từ vựng và tiến trình học trong một không gian duy nhất.<br/>
            Từ lúc bắt đầu đến khi đạt mục tiêu.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
            <button 
              onClick={() => {
                document.getElementById('features-section').scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-md border border-gray-300 text-[11px] font-bold tracking-widest uppercase text-[#111] hover:bg-gray-50 transition-colors"
            >
              XEM TÍNH NĂNG
            </button>
            {localStorage.getItem('token') ? (
              <button className="px-6 py-3 rounded-md bg-[#4361ee] text-[11px] font-bold tracking-widest uppercase text-white hover:bg-blue-700 transition-colors" onClick={() => navigate('/feed')}>
                TIẾP TỤC HỌC ↗
              </button>
            ) : (
              <button className="px-6 py-3 rounded-md bg-[#4361ee] text-[11px] font-bold tracking-widest uppercase text-white hover:bg-blue-700 transition-colors" onClick={() => navigate('/register')}>
                BẮT ĐẦU HỌC
              </button>
            )}
          </div>
        </section>

        {/* IMAGE/VIDEO BLOCK */}
        <section className="px-5 pb-24 max-w-[1400px] mx-auto w-full">
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-xl overflow-hidden bg-gray-200">
            <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop" alt="Mountain Landscape" className="w-full h-full object-cover" />
            
            {/* Overlay Input Box */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[600px] bg-white rounded-xl shadow-2xl p-6">
              <p className="text-[14px] text-gray-800 font-medium mb-4">Chat với AI - Tìm hiểu về ToeicHub</p>
              <form onSubmit={handleAiChat} className="flex items-center gap-3 border border-gray-200 rounded-lg p-2 bg-gray-50 mb-2">
                <input 
                  type="text" 
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[14px] px-2" 
                  placeholder="VD: Web có thi thử không?, Tips là gì?..." 
                />
                <button type="submit" disabled={isAiLoading || !aiQuery.trim()} className="w-8 h-8 rounded-full bg-[#4361ee] text-white flex items-center justify-center disabled:opacity-50 transition-colors">
                  ↑
                </button>
              </form>
              {isAiLoading ? (
                <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center justify-center min-h-[60px]">
                  <div className="loader" style={{ transform: 'scale(0.3)' }}></div>
                </div>
              ) : aiResponse ? (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-[13px] animate-in fade-in slide-in-from-top-2">
                  <div dangerouslySetInnerHTML={{ __html: `<strong>AI:</strong> ${aiResponse.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}` }} />
                </div>
              ) : null}
            </div>
            
            <p className="absolute bottom-6 w-full text-center text-white/80 text-[11px] font-bold tracking-widest uppercase drop-shadow-md">
              MỘT MỤC TIÊU NHỎ. CẢ BẦU TRỜI CƠ HỘI.
            </p>
          </div>
        </section>

        {/* GÓC CHIA SẺ SECTION */}
        <section id="features-section" className="max-w-[1100px] mx-auto px-5 py-24">
          <header className="flex justify-between items-end gap-6 flex-wrap mb-8">
            <div>
              <div className="font-mono font-semibold text-[11px] tracking-widest uppercase text-accent mb-2.5">Góc chia sẻ</div>
              <h2 className="text-[clamp(26px,4vw,36px)] leading-[1.2] font-semibold tracking-tight max-w-[14em] text-text-main">
                Nơi hội tụ những bài viết nổi bật.
              </h2>
            </div>
            <p className="text-text-sec max-w-[24em] md:text-right">
              Những chia sẻ tâm huyết từ cộng đồng, giúp bạn có thêm động lực học tập.
            </p>
            <Link to="/feed" className="font-mono font-semibold text-[11px] tracking-widest uppercase text-text-main border-b border-text-main pb-0.5 whitespace-nowrap hover:opacity-80 transition-opacity">
              Xem tất cả bài viết
            </Link>
          </header>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-5">
            {topPosts.length > 0 ? topPosts.map((post) => {
              const votes = post.votes ? post.votes.filter(v => v.type === 'UPVOTE').length - post.votes.filter(v => v.type === 'DOWNVOTE').length : 0;
              const comments = post._count?.comments || 0;
              const authorName = post.author?.fullName || 'Người dùng ẩn danh';
              const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString('vi-VN') : 'Gần đây';
              
              return (
                <div key={post.id} className="flex flex-col bg-white border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent hover:shadow-[0_8px_24px_rgba(71,89,228,0.1)] hover:-translate-y-0.5 transition-all duration-150 group" onClick={() => navigate(`/posts/${post.id}`)}>
                  <div className={`relative h-[150px] mx-2 mt-2 rounded-xl overflow-hidden flex items-center px-4 bg-bg-sec ${post.imageUrl ? 'after:content-[\'\'] after:absolute after:inset-x-0 after:bottom-0 after:h-[55%] after:bg-gradient-to-t after:from-bg-sec after:to-transparent' : ''}`}>
                    {post.imageUrl ? (
                      <>
                        <span className="absolute top-2.5 left-2.5 z-10 font-mono font-semibold text-[10px] tracking-wider uppercase bg-white text-accent border border-border rounded-md px-1.5 py-0.5 shadow-sm">Có hình ảnh</span>
                        <img src={post.imageUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
                      </>
                    ) : (
                      <p className="font-mono font-medium text-[12.5px] leading-relaxed text-text-sec line-clamp-4 before:content-['“'] before:text-accent before:font-bold before:mr-0.5">
                        {post.content.replace(/<[^>]+>/g, '')}
                      </p>
                    )}
                  </div>
                  <div className="p-4 px-5 flex-1">
                    <div className="flex justify-between font-mono font-medium text-[11px] text-text-sec tracking-wider uppercase">
                      <b className="text-accent font-semibold">#{post.part || 'GENERAL'}</b>
                      <span>{createdDate}</span>
                    </div>
                    <h3 className="text-[18px] font-semibold leading-[1.35] tracking-tight mt-2 text-text-main line-clamp-2">{post.title || post.content.replace(/<[^>]+>/g, '')}</h3>
                  </div>
                  <div className="flex items-center gap-2.5 px-5 py-4 mt-4 border-t border-border">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-[12px]" style={{ background: getAvatarColor(authorName) }}>
                      {getInitials(authorName)}
                    </span>
                    <span className="text-[13px] font-medium flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-text-main">{authorName}</span>
                    <span className="flex gap-3 font-mono font-medium text-[12px] text-text-sec">
                      <span className="flex items-center gap-1 text-accent">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]"><path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7"/></svg>
                        {votes}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 20l1-5.2A8 8 0 1 1 21 12z"/></svg>
                        {comments}
                      </span>
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                Chưa có bài viết nào nổi bật.
              </div>
            )}
          </div>
        </section>

        {/* FEATURES - CONTROL & EXECUTION */}
        <section className="px-5 py-24 max-w-[1400px] mx-auto border-t border-gray-200">
          <div className="mb-12">
            <h3 className="text-[#4361ee] text-[11px] font-bold tracking-widest uppercase mb-4">#02 / CHIA SẺ & ÔN LUYỆN</h3>
            <h2 className="text-[36px] md:text-[42px] font-medium leading-tight text-[#111] max-w-[700px]">
              Không gian thảo luận, hỏi đáp và chia sẻ mẹo học tập cực chất lượng.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
            {/* UI Mockup Left */}
            <div className="p-8 md:p-12 h-full flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 font-mono text-[13px]">
                <div className="flex items-center justify-between text-gray-400 mb-4 border-b border-gray-100 pb-2">
                  <span className="flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Quá trình làm bài</span>
                  <span>test_toeic_2024</span>
                </div>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-500 text-[11px]">#1 / KẾ HOẠCH</span>
                      <span className="text-blue-500 text-[16px]">✓</span>
                    </div>
                    <p className="text-[#111] font-medium mb-3">Giải đề ETS 2024 Test 1</p>
                    <p className="text-gray-500 text-[12px] bg-gray-50 p-2 rounded">Bắt đầu thi thử vào lúc 19:00.</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-500 text-[11px]">#2 / THỰC HIỆN</span>
                      <span className="text-blue-500 text-[16px]">✓</span>
                    </div>
                    <p className="text-[#111] font-medium mb-3">&gt;_ Làm bài, tra từ, ghi chú</p>
                    <p className="text-gray-500 text-[12px] bg-gray-50 p-2 rounded">Hoàn thành 200 câu hỏi trong 120 phút.</p>
                  </div>
                  
                  <div className="border border-blue-200 bg-blue-50/50 rounded p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-blue-500 text-[11px]">#3 / KẾT QUẢ</span>
                      <span className="text-blue-500">⏱</span>
                    </div>
                    <p className="text-[#111] font-medium mb-3">Chấm điểm và phân tích</p>
                    <p className="text-gray-500 text-[12px] bg-white border border-gray-200 p-2 rounded flex justify-between items-center">
                      Điểm số: 850/990. Sẵn sàng xem giải thích.
                      <button className="bg-[#4361ee] text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wide">Xem chi tiết</button>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Right */}
            <div className="p-8 md:p-12 space-y-10">
              <div>
                <h4 className="flex items-center gap-3 text-[11px] font-bold tracking-widest uppercase text-[#4361ee] mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Ngân hàng đề thi
                </h4>
                <p className="text-gray-600 text-[15px] leading-relaxed">Luôn cập nhật các bộ đề thi mới nhất. Làm bài với giao diện chuẩn, không cần in ấn rườm rà.</p>
              </div>
              
              <div className="border-t border-gray-200 pt-10">
                <h4 className="flex items-center gap-3 text-[11px] font-bold tracking-widest uppercase text-[#111] mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Chấm điểm chi tiết
                </h4>
                <p className="text-gray-600 text-[15px] leading-relaxed">Nhận điểm số ngay lập tức. Cung cấp lời giải thích cặn kẽ cho từng câu đúng, sai để bạn kịp thời sửa lỗi.</p>
              </div>

              <div className="border-t border-gray-200 pt-10">
                <h4 className="flex items-center gap-3 text-[11px] font-bold tracking-widest uppercase text-[#111] mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Lịch sử ôn luyện
                </h4>
                <p className="text-gray-600 text-[15px] leading-relaxed">Theo dõi biểu đồ điểm số qua từng ngày. Biết rõ mình đang yếu phần nào để tập trung cải thiện.</p>
              </div>
            </div>
          </div>
        </section>

        {/* WORKSPACES SECTION */}
        <section className="px-5 py-24 max-w-[1400px] mx-auto border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-[#4361ee] text-[11px] font-bold tracking-widest uppercase mb-4">KHÔNG GIAN CHO MỌI NHU CẦU</h3>
              <h2 className="text-[36px] md:text-[42px] font-medium leading-tight text-[#111] mb-6">
                Nhóm học tập, thảo luận trực tiếp.
              </h2>
              <p className="text-gray-600 text-[18px] leading-relaxed mb-8 max-w-[480px]">
                Tại các nhóm học tập, bạn có thể dễ dàng tham gia các phòng chat thời gian thực (Real-time chat). Trao đổi kiến thức chưa bao giờ dễ dàng đến thế!
              </p>
              <button onClick={() => navigate('/groups')} className="text-[11px] font-bold tracking-widest uppercase text-[#111] hover:text-[#4361ee] transition-colors border-b-2 border-black hover:border-[#4361ee] pb-1">
                KHÁM PHÁ NHÓM HỌC TẬP ↗
              </button>
            </div>
            
            <div className="relative aspect-square md:aspect-auto md:h-[500px] bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
              {/* Chat UI Mockup */}
              <div className="w-[80%] max-w-[400px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[80%]">
                <div className="bg-blue-50 border-b border-blue-100 p-4 font-medium text-[#111]">
                  Phòng chat: Quyết tâm 900+
                </div>
                <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-gray-50/50">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-bold">A</div>
                    <div className="bg-white p-2 rounded-lg rounded-tl-none border border-gray-200 text-[13px] text-gray-700 max-w-[80%] shadow-sm">
                      Mọi người ơi cho mình hỏi cấu trúc "Not only... but also" với ạ!
                    </div>
                  </div>
                  <div className="flex gap-2 flex-row-reverse">
                    <div className="w-6 h-6 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-[10px] font-bold">B</div>
                    <div className="bg-[#4361ee] text-white p-2 rounded-lg rounded-tr-none text-[13px] max-w-[80%] shadow-sm">
                      Cấu trúc này chia động từ theo chủ ngữ thứ 2 (gần nhất) nha bạn. Ví dụ: Not only I but also he IS...
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
                  <input type="text" className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-[13px] outline-none" placeholder="Nhập tin nhắn..." disabled />
                  <button className="w-9 h-9 rounded-full bg-[#4361ee] text-white flex items-center justify-center font-bold">↑</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="px-5 py-24 max-w-[1400px] mx-auto">
          <div className="bg-[#4361ee] rounded-xl text-center py-24 px-5 relative overflow-hidden">
            {/* Subtle background pattern/lines could go here */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            
            <h2 className="text-[40px] md:text-[52px] font-medium text-white mb-6 leading-tight relative z-10">
              Bắt đầu hành trình chinh phục<br/>TOEIC ngay hôm nay.
            </h2>
            <p className="text-white/80 text-[18px] mb-10 relative z-10">
              Bắt đầu với một đề thi. Kết nối bạn bè. Xem điểm số tăng lên.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              {localStorage.getItem('token') ? (
                <button className="px-8 py-4 rounded-md bg-white text-[11px] font-bold tracking-widest uppercase text-[#4361ee] hover:bg-gray-50 transition-colors shadow-lg" onClick={() => navigate('/feed')}>
                  ĐẾN BẢNG TIN ↗
                </button>
              ) : (
                <button className="px-8 py-4 rounded-md bg-white text-[11px] font-bold tracking-widest uppercase text-[#4361ee] hover:bg-gray-50 transition-colors shadow-lg" onClick={() => navigate('/register')}>
                  THỬ BẢN DEMO ↗
                </button>
              )}
              <button onClick={() => navigate('/vocabulary')} className="px-8 py-4 rounded-md border border-white/30 text-[11px] font-bold tracking-widest uppercase text-white hover:bg-white/10 transition-colors">
                XEM GÓC HỌC TẬP
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 py-16 bg-white text-gray-500 text-[13px]">
        <div className="max-w-[1400px] mx-auto px-5 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-[#111] font-bold tracking-widest uppercase mb-4 text-[11px]">Học tập</h4>
            <div className="flex flex-col gap-3">
              <Link to="/vocabulary" className="hover:text-[#4361ee] transition-colors">3000 Từ vựng TOEIC</Link>
              <Link to="/tips" className="hover:text-[#4361ee] transition-colors">Ngữ pháp & Mẹo thi</Link>
              <Link to="/#" className="hover:text-[#4361ee] transition-colors">Thi thử (Sắp ra mắt)</Link>
            </div>
          </div>
          <div>
            <h4 className="text-[#111] font-bold tracking-widest uppercase mb-4 text-[11px]">Cộng đồng</h4>
            <div className="flex flex-col gap-3">
              <Link to="/feed" className="hover:text-[#4361ee] transition-colors">Bảng tin</Link>
              <Link to="/groups" className="hover:text-[#4361ee] transition-colors">Nhóm học tập</Link>
            </div>
          </div>
          <div>
            <h4 className="text-[#111] font-bold tracking-widest uppercase mb-4 text-[11px]">Liên hệ</h4>
            <div className="flex flex-col gap-3">
              <p>Email: dokhanhhuy01@gmail.com</p>
              <p>Hotline: 0817810177</p>
              <p>Giờ làm việc: 8:00 - 22:00</p>
            </div>
          </div>
          <div>
            <p className="mt-[28px] md:mt-[40px]">© 2026 ToeicHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
