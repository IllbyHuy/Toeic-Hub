import { useState } from 'react';
import { Lightbulb, Lock, Globe, Users, Trash2, Flag, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatTimeAgo } from '../utils/formatDate';
import api from '../services/api';
import toast from 'react-hot-toast';
import CommentSection from './CommentSection';

const TipCard = ({ 
  tip: initialTip, 
  user, 
  onEdit, 
  onDelete, 
  onShare, 
  onSave, 
  isDetail = false 
}) => {
  const [tip, setTip] = useState(initialTip);
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // AI Exercises state
  const [exercises, setExercises] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const isOwner = tip.userId === user.id;

  const handleGenerateExercises = async () => {
    setIsGenerating(true);
    setExercises(null);
    setCurrentExerciseIndex(0);
    setSelectedAnswer(null);
    try {
      const res = await api.post('/ai/generate-grammar-exercises', {
        title: tip.title,
        structure: tip.structure,
        description: tip.description,
        count: 3
      });
      const data = res.data || res;
      if (data.exercises && data.exercises.length > 0) {
        setExercises(data.exercises);
        toast.success('Đã tạo bài tập thành công!');
      } else {
        toast.error('Không thể tạo bài tập');
      }
    } catch (error) {
      toast.error('Lỗi khi tạo bài tập');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoteTip = async (type) => {
    try {
      const res = await api.post(`/votes/grammars/${tip.id}`, { type });
      const voted = res.data.voted || (res.data.data ? res.data.data.voted : null);
      
      let updatedVotes = tip.votes || [];
      updatedVotes = updatedVotes.filter(v => v.userId !== user.id);
      if (voted) {
        updatedVotes.push({ type: voted, userId: user.id });
      }
      setTip(prev => ({ ...prev, votes: updatedVotes }));
    } catch (error) {
      toast.error('Lỗi khi vote Tip');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Vui lòng nhập lý do báo cáo');
      return;
    }
    try {
      await api.post('/reports', {
        targetType: 'TIP',
        targetId: tip.id,
        reason: reportReason.trim()
      });
      toast.success('Đã gửi báo cáo đến Admin');
      setReportingId(null);
      setReportReason('');
    } catch (error) {
      toast.error('Lỗi khi gửi báo cáo');
    }
  };

  const handleSave = async () => {
    if (onSave) {
      onSave(tip);
      return;
    }
    try {
      const res = await api.post(`/grammars/${tip.id}/save`);
      const { saved } = res.data;
      
      let updatedSavedBy = [...(tip.savedByUsers || [])];
      if (saved) {
        updatedSavedBy.push({ userId: user.id });
      } else {
        updatedSavedBy = updatedSavedBy.filter(u => u.userId !== user.id);
      }
      setTip(prev => ({ ...prev, savedByUsers: updatedSavedBy }));
      toast.success(saved ? 'Đã lưu Tip vào kho!' : 'Đã bỏ lưu Tip');
    } catch (error) {
      toast.error('Lỗi khi thao tác');
    }
  };

  return (
    <div className={`bg-white p-6 rounded-md border border-border shadow-sm relative group ${!isDetail ? 'hover:border-gray-300 transition-colors' : ''}`}>
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
                className={`text-[16px] font-serif font-medium text-text-main ${!isDetail ? 'cursor-pointer hover:text-accent transition-colors' : ''}`}
                onClick={() => !isDetail && (window.location.href = `/tips/${tip.id}`)}
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
            <button onClick={() => setReportingId(reportingId === tip.id ? null : tip.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Báo cáo">
              <Flag size={14} />
            </button>
          )}
          {isOwner && (
            <>
              {onEdit && (
                <button onClick={() => onEdit(tip)} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Chỉnh sửa">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(tip.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Xóa">
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
          {onShare && (
            <button 
              onClick={() => onShare(tip)}
              className="text-slate-400 hover:text-green-500 transition-colors" title="Chia sẻ Tip (Gửi nhóm/Copy)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Structure */}
      <div 
        className={`bg-blue-50 border border-blue-100 text-blue-900 font-medium p-4 rounded-lg mb-4 ${!isDetail ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
        onClick={() => !isDetail && (window.location.href = `/tips/${tip.id}`)}
      >
        💡 {tip.structure}
      </div>
      
      {/* Description */}
      {tip.description && (
        <p className="text-slate-700 mb-4 whitespace-pre-line leading-relaxed">{tip.description}</p>
      )}

      {/* Media */}
      {tip.imageUrl && (
        <div className="mb-4 rounded-xl overflow-hidden shadow-sm cursor-zoom-in" onClick={() => setIsLightboxOpen(true)}>
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
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ví dụ:</h4>
          {tip.examples.map((ex, idx) => (
            <div key={idx} className="flex gap-2 text-slate-700 bg-slate-50/50 p-2 rounded-lg">
              <span className="text-orange-500 font-bold text-sm">→</span>
              <span className="text-sm">{ex}</span>
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

        return (
          <div className="flex items-center gap-4 mb-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-full">
                <button 
                  onClick={() => handleVoteTip('UPVOTE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full transition-colors ${userVote === 'UPVOTE' ? 'text-blue-600 bg-blue-100' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  <ThumbsUp size={16} className={userVote === 'UPVOTE' ? 'fill-current' : ''} />
                  <span className="font-semibold text-sm">{upvotes}</span>
                </button>
                <div className="w-px h-4 bg-slate-300"></div>
                <button 
                  onClick={() => handleVoteTip('DOWNVOTE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${userVote === 'DOWNVOTE' ? 'text-red-600 bg-red-100' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  <ThumbsDown size={16} className={userVote === 'DOWNVOTE' ? 'fill-current' : ''} />
                  <span className="font-semibold text-sm">{downvotes}</span>
                </button>
                <div className="w-px h-4 bg-slate-300"></div>
                <button 
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-r-full text-sm font-semibold transition-colors ${tip.savedByUsers?.some(u => u.userId === user.id) ? "text-accent bg-blue-100" : "text-slate-600 hover:bg-slate-200"}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={tip.savedByUsers?.some(u => u.userId === user.id) ? "fill-accent text-accent" : ""}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  {tip.savedByUsers?.length || tip._count?.savedByUsers || 0}
                </button>
              </div>

              {/* AI Exercises Button */}
              {/* AI Exercises Button */}
              {isDetail ? (
                <button 
                  onClick={handleGenerateExercises}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-1.5 rounded-full font-bold text-sm transition-colors disabled:opacity-50 shadow-sm border border-indigo-100"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg> Đang soạn...</span>
                  ) : (
                    <>🧠 Luyện tập AI</>
                  )}
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/tips/${tip.id}`;
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 hover:from-indigo-100 hover:to-blue-100 px-4 py-1.5 rounded-full font-bold text-sm transition-colors shadow-sm border border-indigo-100"
                  title="Nhấn để luyện bài tập sinh từ AI"
                >
                  🧠 Luyện tập AI
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* AI Generation Loading State */}
      {isGenerating && (
        <div className="bg-bg-sec rounded border border-border p-8 mt-4 shadow-sm flex flex-col items-center justify-center min-h-[200px] animate-in fade-in duration-300">
          <div className="loader mb-6"></div>
          <p className="text-text-sec text-[11px] font-bold uppercase tracking-widest animate-pulse">AI đang soạn bài tập từ Tip này...</p>
        </div>
      )}

      {/* Exercises Render */}
      {exercises && !isGenerating && (
        <div className="bg-bg-sec rounded border border-border p-6 mb-6 mt-4 shadow-sm animate-in fade-in zoom-in duration-300">
          <h3 className="text-[13px] font-bold tracking-widest uppercase text-text-main flex justify-between items-center mb-5">
            <span>Bài tập AI <span className="text-accent ml-2">({currentExerciseIndex + 1}/{exercises.length})</span></span>
            <button onClick={() => setExercises(null)} className="text-[10px] text-text-sec hover:text-text-main transition-colors">ĐÓNG</button>
          </h3>
          <div className="p-5 bg-white border border-border rounded mb-5 shadow-sm">
            <p className="text-[14.5px] font-medium text-text-main leading-relaxed">{exercises[currentExerciseIndex].question}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {exercises[currentExerciseIndex].options.map((opt, idx) => {
              const isCorrect = idx === exercises[currentExerciseIndex].correctIndex;
              let btnClass = "p-3 rounded text-left font-medium transition-all border border-border bg-white hover:border-accent hover:-translate-y-0.5 text-[13.5px]";
              if (selectedAnswer !== null) {
                if (isCorrect) btnClass = "p-3 rounded text-left font-medium transition-all border-status-mastered bg-status-mastered-bg text-status-mastered-text text-[13.5px]";
                else if (selectedAnswer === idx) btnClass = "p-3 rounded text-left font-medium transition-all border-red-300 bg-red-50 text-red-600 text-[13.5px]";
                else btnClass = "p-3 rounded text-left font-medium transition-all border-border bg-gray-50 opacity-50 text-[13.5px]";
              }
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={btnClass}
                >
                  <span className="font-bold mr-2 text-text-muted">{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {selectedAnswer !== null && (
            <div className={`p-4 rounded mb-5 border ${selectedAnswer === exercises[currentExerciseIndex].correctIndex ? 'bg-status-mastered-bg border-status-mastered' : 'bg-red-50 border-red-200'}`}>
              <p className={`font-bold tracking-widest uppercase text-[10px] mb-1.5 ${selectedAnswer === exercises[currentExerciseIndex].correctIndex ? 'text-status-mastered-text' : 'text-red-600'}`}>
                {selectedAnswer === exercises[currentExerciseIndex].correctIndex ? '✓ Chính xác' : '✗ Chưa chính xác'}
              </p>
              <p className="text-[13px] leading-relaxed text-text-sec">{exercises[currentExerciseIndex].explanation}</p>
            </div>
          )}
          {selectedAnswer !== null && currentExerciseIndex < exercises.length - 1 && (
            <button onClick={() => { setCurrentExerciseIndex(currentExerciseIndex + 1); setSelectedAnswer(null); }} className="w-full py-2.5 bg-text-main hover:bg-black text-white font-bold tracking-widest uppercase text-[11px] rounded transition-colors">
              Câu Tiếp Theo
            </button>
          )}
          {selectedAnswer !== null && currentExerciseIndex === exercises.length - 1 && (
            <button onClick={() => setExercises(null)} className="w-full py-2.5 border border-border bg-white hover:bg-gray-50 text-text-main font-bold tracking-widest uppercase text-[11px] rounded transition-colors">
              Hoàn Thành
            </button>
          )}
        </div>
      )}

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
            <button onClick={handleReport} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600">Gửi</button>
          </div>
        </div>
      )}
      
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img src={tip.imageUrl} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default TipCard;
