import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BookOpen, CheckCircle, Circle, PlayCircle, Loader2, ArrowLeft, Shuffle, Filter } from 'lucide-react';

const SystemVocabTab = ({ onTopicActive, onUpdate }) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTopic, setActiveTopic] = useState(null);
  const [words, setWords] = useState([]);
  const [loadingWords, setLoadingWords] = useState(false);

  useEffect(() => {
    if (onTopicActive) {
      onTopicActive(!!activeTopic);
    }
  }, [activeTopic, onTopicActive]);

  
  // Flashcard mode states
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [flashcardWords, setFlashcardWords] = useState([]);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const res = await api.get('/system-vocab/topics');
      const data = res.data || res;
      setTopics(data);
      // Removed auto-select to allow users to click a topic manually
    } catch (error) {
      toast.error('Không thể tải danh sách chủ đề');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTopic = async (topic) => {
    setActiveTopic(topic);
    setLoadingWords(true);
    try {
      const res = await api.get(`/system-vocab/topics/${topic.id}/words`);
      const data = res.data || res;
      setWords(data.words || []);
    } catch (error) {
      toast.error('Không thể tải từ vựng của chủ đề này');
    } finally {
      setLoadingWords(false);
    }
  };

  const speakWord = (e, text) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Trình duyệt không hỗ trợ phát âm');
    }
  };

  const handleMarkProgress = async (e, systemVocabId, status) => {
    e.stopPropagation();
    setIsUpdatingProgress(true);
    try {
      await api.post('/system-vocab/progress', { systemVocabId, status });
      // Update local state
      setWords(words.map(w => w.id === systemVocabId ? { ...w, progress: status } : w));
      setFlashcardWords(flashcardWords.map(w => w.id === systemVocabId ? { ...w, progress: status } : w));
      toast.success(status === 'MASTERED' ? 'Đã đánh dấu thuộc từ này!' : 'Đã đưa lại vào danh sách Đang học!');
      
      if (onUpdate) onUpdate();
      
      // Auto next if marked as MASTERED and we are not at the end
      if (status === 'MASTERED' && flashcardIndex < words.length - 1) {
        setIsFlipped(false);
        setTimeout(() => setFlashcardIndex(flashcardIndex + 1), 300);
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật tiến độ');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const startFlashcard = () => {
    if (words.length === 0) return;
    
    let cards = [...words];
    if (isShuffle) {
      cards = cards.sort(() => Math.random() - 0.5);
    }
    
    setFlashcardWords(cards);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setIsFlashcardMode(true);
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="loader"></div></div>;
  }

  // Flashcard Mode UI
  if (isFlashcardMode && activeTopic) {
    const currentWord = flashcardWords[flashcardIndex];
    if (!currentWord) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl relative">
          
          <div className="flex justify-between items-center mb-6 text-white">
            <div>
              <h2 className="text-2xl font-bold">{activeTopic.name}</h2>
              <p className="text-slate-300">Thẻ {flashcardIndex + 1} / {words.length}</p>
            </div>
            <button onClick={() => setIsFlashcardMode(false)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold transition">Đóng ✕</button>
          </div>
          
          <div 
            className="relative w-full h-96 perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`w-full h-full duration-500 preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
              {/* Front Side */}
              <div className="absolute w-full h-full backface-hidden bg-white rounded-[32px] flex flex-col items-center justify-center p-8 border border-slate-200">
                <span className="text-slate-400 font-medium uppercase tracking-[0.1em] text-xs mb-6 absolute top-8 text-center w-full">
                  Mặt trước <br/> <span className="text-[10px] text-slate-400 mt-1">Hệ thống từ vựng</span>
                </span>
                
                <h3 className="text-5xl font-semibold text-slate-900 mb-6 text-center tracking-tight">{currentWord.word}</h3>
                
                <button 
                  onClick={(e) => speakWord(e, currentWord.word)}
                  className="text-slate-400 hover:text-slate-900 p-2 rounded-full transition-colors"
                  title="Nghe phát âm"
                >
                  <PlayCircle size={36} />
                </button>
                
                {currentWord.progress === 'MASTERED' && (
                  <div className="absolute bottom-6 right-6 flex items-center gap-1 text-emerald-500 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                    <CheckCircle size={14} /> Đã thuộc
                  </div>
                )}
              </div>

              {/* Back Side */}
              <div className="absolute w-full h-full backface-hidden bg-slate-900 rounded-[32px] flex flex-col items-center justify-center p-8 rotate-y-180 text-white border border-slate-800">
                <span className="text-slate-400 font-medium uppercase tracking-[0.1em] text-xs mb-4 absolute top-8">Mặt sau</span>
                
                <h3 className="text-4xl font-semibold mb-4 text-center">{currentWord.word}</h3>
                {currentWord.pronunciation && (
                  <p className="text-lg text-slate-400 mb-6 font-serif italic">{currentWord.pronunciation}</p>
                )}
                
                <div className="w-full text-center mb-6">
                  <p className="text-2xl font-medium text-white">{currentWord.meaning}</p>
                </div>

                {currentWord.example && (
                  <p className="text-slate-400 text-center text-[15px] px-8 italic line-clamp-3">"{currentWord.example}"</p>
                )}
              </div>
            </div>
          </div>

          {!isFlipped && (
            <div className="mt-6 text-center text-white/50 text-[12px] font-medium tracking-widest uppercase hidden sm:block">
              Nhấn vào thẻ (hoặc phím Space) để lật
            </div>
          )}

          {/* Controls */}
          {isFlipped ? (
            <div className="flex justify-between items-center mt-6 gap-3">
              {currentWord.progress === 'MASTERED' ? (
                <button 
                  disabled={isUpdatingProgress}
                  onClick={(e) => handleMarkProgress(e, currentWord.id, 'LEARNING')}
                  className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-4 py-4 rounded-full font-semibold transition text-[13.5px] flex items-center justify-center gap-2"
                >
                  <Circle size={18} /> Đang học
                </button>
              ) : (
                <button 
                  disabled={isUpdatingProgress}
                  onClick={(e) => handleMarkProgress(e, currentWord.id, 'MASTERED')}
                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-4 py-4 rounded-full font-semibold transition text-[13.5px] flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Đã thuộc
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center mt-6 gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setFlashcardIndex(Math.max(0, flashcardIndex - 1)); }}
                disabled={flashcardIndex === 0}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-full font-semibold transition disabled:opacity-30 flex items-center justify-center gap-2 text-[14.5px]"
              >
                <ArrowLeft size={18} /> QUAY LẠI
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (flashcardIndex === flashcardWords.length - 1) {
                    setIsFlashcardMode(false);
                  } else {
                    setIsFlipped(false); setFlashcardIndex(Math.min(words.length - 1, flashcardIndex + 1)); 
                  }
                }}
                className="flex-1 bg-slate-100 hover:bg-white text-slate-900 px-6 py-4 rounded-full font-semibold transition flex items-center justify-center gap-2 text-[14.5px]"
              >
                {flashcardIndex === flashcardWords.length - 1 ? 'HOÀN THÀNH' : <>TIẾP THEO <ArrowLeft size={18} className="rotate-180" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const masteredCount = words.filter(w => w.progress === 'MASTERED').length;
  const progressPercent = words.length > 0 ? Math.round((masteredCount / words.length) * 100) : 0;

  const totalSystemWords = topics.reduce((sum, t) => sum + (t._count?.words || 0), 0);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Kho {totalSystemWords || 3000} Từ Vựng TOEIC</h2>
        <p className="text-slate-500 text-[14.5px]">Lọc và học theo chủ đề chuẩn TOEIC quốc tế.</p>
      </div>

      {!activeTopic && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {topics.map(topic => {
            const isActive = activeTopic?.id === topic.id;
            return (
              <div 
                key={topic.id}
                onClick={() => handleSelectTopic(topic)}
                className={`relative h-28 rounded-2xl overflow-hidden cursor-pointer group transition-all border-2 ${isActive ? 'border-slate-900 shadow-sm' : 'border-transparent hover:border-slate-300'}`}
              >
                {topic.imageUrl ? (
                  <img src={topic.imageUrl} alt={topic.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 bg-slate-800 transition-transform duration-500 group-hover:scale-105"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4 w-full">
                  <h3 className="text-white font-medium text-[15px] truncate">{topic.name}</h3>
                  <p className="text-white/60 text-[12px]">{topic._count?.words || 0} từ vựng</p>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 bg-slate-900 text-white p-1 rounded-full shadow-sm">
                    <CheckCircle size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTopic && (
        <>
          <button 
            onClick={() => setActiveTopic(null)}
            className="flex items-center gap-2 text-text-sec hover:text-text-main font-mono uppercase text-[11px] mb-6 transition-colors bg-bg-sec px-3 py-1.5 rounded border border-border w-max hover:-translate-y-0.5"
          >
            <ArrowLeft size={14} /> Quay lại danh sách chủ đề
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-center bg-bg-sec border border-border rounded-[8px] p-5 mb-6 gap-4">
            <div className="flex-1 w-full">
              <h3 className="font-mono uppercase text-[11px] text-text-sec mb-2 flex items-center justify-between">
                <span>{activeTopic.name}</span>
                <span className="text-accent font-semibold">{progressPercent}% ĐÃ HỌC</span>
              </h3>
              <div className="w-full bg-border rounded-full h-1 overflow-hidden">
                <div className="bg-accent h-1 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="flex items-center gap-2 cursor-pointer text-text-sec text-[11px] font-mono uppercase px-3 py-2">
                <input 
                  type="checkbox" 
                  checked={isShuffle}
                  onChange={(e) => setIsShuffle(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded"
                />
                <Shuffle size={14} className={isShuffle ? "text-text-main" : "text-text-muted"} />
                Trộn ngẫu nhiên
              </label>
              <button 
                onClick={startFlashcard}
                disabled={words.length === 0}
                className="bg-accent hover:bg-blue-700 text-white px-5 py-2 rounded font-mono uppercase text-[11px] transition-all hover:-translate-y-0.5 disabled:opacity-50 whitespace-nowrap shadow-sm"
              >
                Học Flashcard
              </button>
            </div>
          </div>

          {loadingWords ? (
            <div className="py-12 flex justify-center"><div className="loader"></div></div>
          ) : (
            <div className="flex flex-col border border-border bg-bg-sec rounded-[8px] overflow-hidden">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-[2fr_3fr_1.5fr] px-5 py-3 bg-bg-main border-b border-border text-[11px] font-mono uppercase text-text-muted">
                <div>Từ vựng</div>
                <div>Định nghĩa</div>
                <div className="text-right">Học tập</div>
              </div>

              {words.map((w, idx) => (
                <div key={w.id} className="grid grid-cols-1 sm:grid-cols-[2fr_3fr_1.5fr] items-center p-4 border-b border-border last:border-b-0 hover:bg-bg-main transition-colors gap-3 sm:gap-4">
                  <div>
                    <h4 className="font-semibold text-text-main text-[15px] flex items-center gap-2">
                      {w.word}
                      <button onClick={(e) => speakWord(e, w.word)} className="text-text-muted hover:text-accent transition-colors">
                        <PlayCircle size={16} />
                      </button>
                    </h4>
                  </div>
                  <div className="text-[14px] text-text-sec line-clamp-1">
                    {w.meaning}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-mono uppercase text-text-sec">
                      <input 
                        type="checkbox"
                        checked={w.progress === 'LEARNING' || w.progress === 'REVIEW'}
                        onChange={async (e) => {
                          const newStatus = e.target.checked ? 'LEARNING' : 'NEW';
                          try {
                            await api.post('/srs/toggle-status', { type: 'SYSTEM', id: w.id, status: newStatus });
                            setWords(words.map(x => x.id === w.id ? { ...x, progress: newStatus } : x));
                          } catch (err) { toast.error('Lỗi'); }
                        }}
                        className="w-3.5 h-3.5 accent-status-learning-text rounded"
                      />
                      Muốn học
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-mono uppercase text-text-sec">
                      <input 
                        type="checkbox"
                        checked={w.progress === 'MASTERED'}
                        onChange={async (e) => {
                          const newStatus = e.target.checked ? 'MASTERED' : 'NEW';
                          try {
                            await api.post('/srs/toggle-status', { type: 'SYSTEM', id: w.id, status: newStatus });
                            setWords(words.map(x => x.id === w.id ? { ...x, progress: newStatus } : x));
                          } catch (err) { toast.error('Lỗi'); }
                        }}
                        className="w-3.5 h-3.5 accent-status-mastered-text rounded"
                      />
                      Đã thuộc
                    </label>
                  </div>
                </div>
              ))}
              {words.length === 0 && (
                <div className="py-12 text-center text-text-muted font-mono text-[11px] uppercase">Không có từ vựng nào trong chủ đề này.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SystemVocabTab;
