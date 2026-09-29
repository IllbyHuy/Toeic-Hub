import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, RotateCcw, HelpCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StudySession = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vocabularies/study-session');
      setCards(res.data || []);
    } catch (error) {
      toast.error('Không thể tải bài học');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (quality) => {
    const currentCard = cards[currentIndex];
    
    try {
      await api.post('/vocabularies/review', {
        id: currentCard.id,
        isSystem: currentCard.isSystem,
        quality
      });
      
      setShowAnswer(false);
      
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setSessionCompleted(true);
        toast.success('🎉 Chúc mừng bạn đã hoàn thành phiên học!', { icon: '👏' });
      }
    } catch (error) {
      toast.error('Lỗi lưu kết quả');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <Check size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bạn đã hoàn thành!</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">Tuyệt vời! Bạn không còn từ vựng nào cần ôn tập vào lúc này. Hãy thêm từ mới hoặc quay lại sau nhé.</p>
        <button onClick={() => navigate('/vocabulary')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all hover:-translate-y-1">
          Quay lại Sổ Từ Vựng
        </button>
      </div>
    );
  }

  if (sessionCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto animate-fade-in-up">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-3xl font-black text-slate-800 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">Phiên Học Hoàn Tất!</h2>
        <p className="text-slate-600 mb-8 font-medium">Bạn vừa ôn tập {cards.length} từ vựng. Cứ giữ vững phong độ này nhé!</p>
        <div className="flex gap-4">
          <button onClick={() => navigate('/vocabulary')} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors">
            Về Sổ Từ Vựng
          </button>
          <button onClick={() => { setSessionCompleted(false); setCurrentIndex(0); fetchSession(); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors">
            Học Tiếp
          </button>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/vocabulary')} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="font-bold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full text-sm">
          {currentIndex + 1} / {cards.length}
        </div>
        <div className="w-10"></div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${((currentIndex) / cards.length) * 100}%` }}></div>
        </div>
      </div>

      <div 
        className={`glass-card min-h-[350px] flex flex-col justify-center items-center text-center p-8 rounded-3xl cursor-pointer transition-all duration-500 shadow-xl border border-slate-200/60 ${showAnswer ? 'rotate-y-180 bg-gradient-to-br from-indigo-50 to-white' : 'hover:-translate-y-2 hover:shadow-2xl bg-white'}`}
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        <div className={`transition-all duration-500 w-full ${showAnswer ? 'rotate-y-180' : ''}`}>
          {!showAnswer ? (
            <div className="flex flex-col items-center animate-fade-in">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold mb-6 tracking-wider uppercase">
                {card.isSystem ? 'Hệ thống' : 'Của bạn'} • {card.status === 'NEW' ? 'Từ mới' : card.status === 'LEARNING' ? 'Đang học' : card.status === 'REVIEW' ? 'Ôn tập' : 'Thành thạo'}
              </span>
              <h2 className="text-5xl font-black text-slate-800 mb-6 drop-shadow-sm">{card.word}</h2>
              <p className="text-slate-400 font-medium flex items-center gap-2 text-sm"><RotateCcw size={16}/> Chạm để lật thẻ</p>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-fade-in-up w-full">
              <h3 className="text-2xl font-bold text-indigo-600 mb-6">{card.meaning}</h3>
              {card.example && (
                <div className="bg-white/80 p-5 rounded-2xl border border-indigo-100 w-full shadow-sm mb-4">
                  <p className="text-slate-700 italic font-medium leading-relaxed">"{card.example}"</p>
                </div>
              )}
              {card.synonyms && card.synonyms.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center mt-2">
                  {card.synonyms.map(syn => (
                    <span key={syn} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm border border-slate-200">{syn}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`mt-10 transition-all duration-500 ${showAnswer ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <h4 className="text-center text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Mức độ ghi nhớ của bạn?</h4>
        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => handleReview(0)} className="flex flex-col items-center p-4 bg-red-50 text-red-700 rounded-2xl hover:bg-red-100 hover:shadow-md transition-all border border-red-100 group">
            <X size={24} className="mb-2 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            <span className="font-bold text-sm">Quên sạch</span>
            <span className="text-[10px] opacity-70 mt-1">&lt; 1 phút</span>
          </button>
          <button onClick={() => handleReview(3)} className="flex flex-col items-center p-4 bg-orange-50 text-orange-700 rounded-2xl hover:bg-orange-100 hover:shadow-md transition-all border border-orange-100 group">
            <HelpCircle size={24} className="mb-2 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            <span className="font-bold text-sm">Khó nhớ</span>
            <span className="text-[10px] opacity-70 mt-1">&lt; 1 ngày</span>
          </button>
          <button onClick={() => handleReview(4)} className="flex flex-col items-center p-4 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 hover:shadow-md transition-all border border-blue-100 group">
            <Check size={24} className="mb-2 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            <span className="font-bold text-sm">Nhớ tốt</span>
            <span className="text-[10px] opacity-70 mt-1">~ 3 ngày</span>
          </button>
          <button onClick={() => handleReview(5)} className="flex flex-col items-center p-4 bg-green-50 text-green-700 rounded-2xl hover:bg-green-100 hover:shadow-md transition-all border border-green-100 group">
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🧠</div>
            <span className="font-bold text-sm">Hoàn hảo</span>
            <span className="text-[10px] opacity-70 mt-1">&gt; 7 ngày</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default StudySession;
