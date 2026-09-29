import { useState, useEffect, useRef } from 'react';
import { Plus, BookOpen, Trash2, Lock, Globe, Users, Download, Upload, PlayCircle, ArrowLeft, Shuffle, HelpCircle } from 'lucide-react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import Papa from 'papaparse';
import api from '../services/api';
import toast from 'react-hot-toast';
import SystemVocabTab from '../components/SystemVocabTab';
import ActivityHeatmap from '../components/ActivityHeatmap';
import FireStreak from '../components/FireStreak';

const Vocabulary = () => {
  const [activeTab, setActiveTab] = useState('MY_VOCAB');
  const [vocabularies, setVocabularies] = useState([]);
  const fileInputRef = useRef(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingVocab, setEditingVocab] = useState(null);
  const [newVocab, setNewVocab] = useState({ word: '', type: '(n)', meaning: '', example: '', synonyms: '' });
  const [selectedVocabIds, setSelectedVocabIds] = useState([]);

  const [exercises, setExercises] = useState(null);
  const [isGeneratingExercises, setIsGeneratingExercises] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [questionCount, setQuestionCount] = useState(5);
  
  const [activeFlashcards, setActiveFlashcards] = useState([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardTitle, setFlashcardTitle] = useState("");
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [analytics, setAnalytics] = useState(null);
  const [isTopicActive, setIsTopicActive] = useState(false);

  useEffect(() => {
    fetchVocabs();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (activeFlashcards.length > 0) {
        if (e.code === 'Space') {
          e.preventDefault();
          setIsFlipped(prev => !prev);
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          setIsFlipped(false);
          setFlashcardIndex(prev => Math.max(0, prev - 1));
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          setIsFlipped(false);
          setFlashcardIndex(prev => Math.min(activeFlashcards.length - 1, prev + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFlashcards, isFlipped, flashcardIndex]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/users/me/analytics');
      setAnalytics(res.data);
    } catch (e) {
      console.error('Error fetching analytics', e);
    }
  };

  const fetchVocabs = async () => {
    try {
      const res = await api.get('/vocabularies');
      const myVocabs = (res.data || []).filter(v => v.userId === user.id);
      setVocabularies(myVocabs);
    } catch (error) {
      toast.error('Không thể tải danh sách từ vựng');
    }
  };

  const toggleSelectVocab = (id) => {
    if (selectedVocabIds.includes(id)) {
      setSelectedVocabIds(selectedVocabIds.filter(vId => vId !== id));
    } else {
      setSelectedVocabIds([...selectedVocabIds, id]);
    }
  };

  const handleStartSrs = async (mode) => {
    try {
      const res = await api.get(`/srs/queue?mode=${mode}`);
      const items = res.data?.data || res.data || res;
      if (items?.length > 0) {
        setActiveFlashcards(items);
        setFlashcardTitle(mode === 'NEW' ? 'Học từ mới' : 'Ôn tập từ cũ');
        setIsFlipped(false);
        setFlashcardIndex(0);
      } else {
        toast.success(mode === 'NEW' ? 'Bạn đã học hết từ mới hôm nay!' : 'Không có từ nào cần ôn tập hôm nay!');
      }
    } catch (err) { toast.error('Lỗi lấy danh sách'); }
  };



  const handleGenerateExercises = async () => {
    if (selectedVocabIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 từ vựng');
      return;
    }

    setIsGeneratingExercises(true);
    setExercises(null);
    setCurrentExerciseIndex(0);
    setSelectedAnswer(null);
    try {
      // Artificial delay so user can see the Pac-Man loader
      await new Promise(resolve => setTimeout(resolve, 2500));

      const selectedWords = vocabularies
        .filter(v => selectedVocabIds.includes(v.id))
        .map(v => v.word);
        
      const res = await api.post('/ai/generate-exercises', { 
        words: selectedWords,
        count: questionCount
      });
      const data = res.data || res;
      if (data.exercises && data.exercises.length > 0) {
        setExercises(data.exercises);
        toast.success('Đã tạo bài tập thành công!');
      } else {
        toast.error('Không thể tạo bài tập');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo bài tập');
    } finally {
      setIsGeneratingExercises(false);
    }
  };

  const handleSrsReview = async (quality) => {
    const card = activeFlashcards[flashcardIndex];
    try {
      await api.post('/srs/review', {
        type: card.type, // 'PERSONAL' or 'SYSTEM'
        id: card.id,
        progressId: card.progressId,
        quality
      });
      
      // Move to next card
      if (flashcardIndex < activeFlashcards.length - 1) {
        setIsFlipped(false);
        setFlashcardIndex(prev => prev + 1);
      } else {
        toast.success('Bạn đã hoàn thành phiên học!');
        setActiveFlashcards([]);
        fetchVocabs(); // Refresh
        fetchAnalytics(); // Refresh
      }
    } catch (error) {
      toast.error('Có lỗi khi lưu tiến độ');
    }
  };

  const handleAddOrEdit = async (e) => {
    e.preventDefault();
    try {
      const synonymsArray = typeof newVocab.synonyms === 'string' ? newVocab.synonyms.split(',').map(s => s.trim()).filter(s => s) : newVocab.synonyms;
      const payload = {
        ...newVocab,
        synonyms: synonymsArray,
        visibility: 'PRIVATE'
      };

      if (editingVocab) {
        await api.patch(`/vocabularies/${editingVocab.id}`, payload);
        toast.success('Đã cập nhật từ vựng!');
      } else {
        await api.post('/vocabularies', payload);
        toast.success('Thêm từ vựng thành công!');
      }

      fetchVocabs();
      fetchAnalytics();
      setIsAdding(false);
      setEditingVocab(null);
      setNewVocab({ word: '', type: '(n)', meaning: '', example: '', synonyms: '' });
    } catch (error) {
      toast.error('Lỗi khi lưu từ vựng');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá từ vựng này không?")) return;
    try {
      await api.delete(`/vocabularies/${id}`);
      setVocabularies(vocabularies.filter(v => v.id !== id));
      fetchAnalytics();
      toast.success('Đã xóa từ vựng');
    } catch (error) {
      toast.error('Lỗi khi xóa từ vựng');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/vocabularies/export');
      const data = res.data || [];
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'my_vocabularies.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Đã xuất file CSV');
    } catch (error) {
      toast.error('Lỗi khi xuất file CSV');
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function(results) {
        try {
          const validData = results.data.filter(row => row.word && row.meaning);
          if (validData.length === 0) {
            toast.error('File không đúng định dạng hoặc trống');
            return;
          }
          await api.post('/vocabularies/import', { vocabularies: validData });
          toast.success(`Đã import ${validData.length} từ vựng`);
          fetchVocabs();
          fetchAnalytics();
        } catch (error) {
          toast.error('Lỗi khi import file CSV');
        }
      }
    });
    e.target.value = null;
  };

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Tiếp theo',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Hoàn thành',
      steps: [
        { 
          element: '#fire-streak', 
          popover: { 
            title: 'Chuỗi Học Tập (Streak)', 
            description: 'Giữ lửa mỗi ngày bằng cách truy cập ứng dụng và luyện tập. Đừng để ngọn lửa vụt tắt nhé!',
            side: "bottom", align: 'start'
          } 
        },
        { 
          element: '#start-srs-buttons', 
          popover: { 
            title: 'Học & Ôn Tập', 
            description: 'Bắt đầu học từ mới hoặc ôn tập lại các từ đã học với thuật toán lặp lại ngắt quãng (SRS) thông minh.',
            side: "bottom", align: 'start'
          } 
        },
        { 
          element: '#add-vocab-btn', 
          popover: { 
            title: 'Thêm Từ Vựng', 
            description: 'Tự tạo danh sách từ vựng của riêng bạn để học tập hiệu quả hơn.',
            side: "bottom", align: 'start'
          } 
        },
        { 
          element: '#vocab-list', 
          popover: { 
            title: 'Quản Lý & Chọn Từ', 
            description: 'Đánh dấu tích vào các từ bạn muốn học, hoặc sử dụng AI để tạo bài tập riêng cho những từ này.',
            side: "top", align: 'start'
          } 
        },
        { 
          element: '#system-vocab-tab', 
          popover: { 
            title: 'Từ Vựng Hệ Thống', 
            description: 'Khám phá và học các bộ từ vựng chuẩn TOEIC được hệ thống tổng hợp và phân loại sẵn.',
            side: "top", align: 'center'
          } 
        }
      ]
    });
    driverObj.drive();
  };

  return (
    <div className="max-w-[1180px] mx-auto px-4 md:px-8 py-6 pb-20 relative">

      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-[28px] font-bold text-text-main">Sổ Tay Từ Vựng</h1>
            <button onClick={startTour} className="flex items-center gap-1.5 text-[#4361ee] bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
              <HelpCircle size={16} />
              <span className="text-[11px] font-bold tracking-widest uppercase">Hướng dẫn</span>
            </button>
          </div>
          <p className="text-text-sec text-[15px]">Học và ôn tập từ vựng mỗi ngày</p>
        </div>
        
        <div id="start-srs-buttons" className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => handleStartSrs('NEW')}
            className="px-5 py-2.5 rounded border border-border bg-white text-text-main hover:bg-gray-50 text-[11px] font-bold tracking-widest uppercase transition-colors"
          >
            Học từ mới
          </button>
          <button 
            onClick={() => handleStartSrs('REVIEW')}
            className="px-5 py-2.5 rounded border border-border bg-white text-text-main hover:bg-gray-50 text-[11px] font-bold tracking-widest uppercase transition-colors"
          >
            Ôn tập lại
          </button>
        </div>
      </div>

      {/* Activity & Analytics Dashboard */}
      {analytics && !isTopicActive && (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-bg-sec border border-border p-6 rounded-[24px] shadow-sm flex flex-col h-full">
            <h4 className="text-[13px] font-bold tracking-widest uppercase text-text-sec mb-6 text-center sm:text-left">Mức độ chuyên cần</h4>
            <div className="flex justify-center flex-1 items-center">
              <ActivityHeatmap data={analytics} />
            </div>
          </div>
          <div id="fire-streak" className="bg-bg-sec border border-border p-6 rounded-[24px] shadow-sm flex flex-col h-full">
            <h4 className="text-[13px] font-bold tracking-widest uppercase text-text-sec mb-2 text-center sm:text-left">Chuỗi Học Tập (Streak)</h4>
            <div className="flex-1 flex flex-col justify-center items-center">
               <FireStreak 
                 streakCount={analytics.currentStreak || 0} 
                 dailyStats={analytics.dailyStats} 
                 activityLogs={analytics.activityLogs} 
               />
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      {!isTopicActive && (
        <div className="flex bg-white p-1 rounded-md border border-border max-w-sm mb-10 shadow-sm">
        <button 
          onClick={() => setActiveTab('MY_VOCAB')}
          className={`flex-1 px-4 py-2.5 rounded font-bold tracking-widest uppercase text-[11px] transition-all ${activeTab === 'MY_VOCAB' ? 'bg-text-main text-white shadow-sm' : 'text-text-sec hover:text-text-main hover:bg-gray-50'}`}
        >
          Từ vựng của tôi
        </button>
        <button 
          id="system-vocab-tab"
          onClick={() => setActiveTab('SYSTEM_VOCAB')}
          className={`flex-1 px-4 py-2.5 rounded font-bold tracking-widest uppercase text-[11px] transition-all flex items-center justify-center gap-2 ${activeTab === 'SYSTEM_VOCAB' ? 'bg-text-main text-white shadow-sm' : 'text-text-sec hover:text-text-main hover:bg-gray-50'}`}
        >
          <Globe size={14} />
          Hệ thống
        </button>
      </div>
      )}

      {/* Content */}
      {activeTab === 'SYSTEM_VOCAB' ? (
        <SystemVocabTab onTopicActive={setIsTopicActive} onUpdate={fetchAnalytics} />
      ) : (
        <>
          {/* Tools */}
          {analytics && (
            <div className="border border-slate-200 bg-white rounded-[24px] p-8 mb-12">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-semibold text-slate-900 text-lg tracking-tight">Tổng quan cá nhân</h3>
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full border border-orange-100 text-orange-600">
                  <span className="text-lg">🔥</span>
                  <span className="font-semibold text-sm">{analytics.currentStreak} ngày chuỗi học tập</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-6 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:border-indigo-100 hover:bg-indigo-50/30">
                  <div className="text-[36px] font-bold text-slate-800 mb-1 tracking-tight">{analytics.totalWords}</div>
                  <div className="text-[13px] text-slate-500 font-semibold uppercase tracking-wider">Tổng từ vựng</div>
                </div>
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-6 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:border-emerald-100 hover:bg-emerald-50/30">
                  <div className="text-[36px] font-bold text-emerald-600 mb-1 tracking-tight">{analytics.masteredWords}</div>
                  <div className="text-[13px] text-slate-500 font-semibold uppercase tracking-wider">Đã thuộc</div>
                </div>
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-6 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:border-amber-100 hover:bg-amber-50/30">
                  <div className="text-[36px] font-bold text-amber-500 mb-1 tracking-tight">{analytics.learningWords}</div>
                  <div className="text-[13px] text-slate-500 font-semibold uppercase tracking-wider">Đang học</div>
                </div>
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-6 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:border-blue-100 hover:bg-blue-50/30">
                  <div className="text-[36px] font-bold text-blue-600 mb-1 tracking-tight">{analytics.retentionRate}%</div>
                  <div className="text-[13px] text-slate-500 font-semibold uppercase tracking-wider">Tỷ lệ nhớ từ</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-border pb-4">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-text-main">Bộ từ vựng cá nhân ({vocabularies.length})</h2>
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleImportCSV}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-border text-text-sec rounded font-bold tracking-widest uppercase text-[11px] hover:bg-gray-50 transition-colors"
              >
                <Upload size={14} />
                Import
              </button>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-border text-text-sec rounded font-bold tracking-widest uppercase text-[11px] hover:bg-gray-50 transition-colors"
              >
                <Download size={14} />
                Export
              </button>

              <div className="w-px h-6 bg-border mx-2 hidden lg:block"></div>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-border">
                <span className="text-[11px] font-bold tracking-widest uppercase text-text-sec">Số câu AI:</span>
                <input type="number" min="1" max="20" value={questionCount} onChange={e => setQuestionCount(e.target.value)} className="w-12 border-none bg-gray-50 px-1 py-0.5 text-center font-bold text-text-main rounded-md focus:ring-0 text-[11px]" />
              </div>
              <button 
                onClick={handleGenerateExercises}
                disabled={isGeneratingExercises || selectedVocabIds.length === 0}
                className="flex items-center gap-2 border border-border bg-white text-text-main px-4 py-2 rounded font-bold tracking-widest uppercase text-[11px] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isGeneratingExercises ? 'Đang tạo...' : `Tạo Bài Tập (${selectedVocabIds.length})`}
              </button>
              <button 
                onClick={() => {
                  if (selectedVocabIds.length === 0) {
                    toast.error('Vui lòng chọn từ vựng để ôn tập');
                    return;
                  }
                  const selected = vocabularies.filter(v => selectedVocabIds.includes(v.id));
                  setActiveFlashcards(selected);
                  setFlashcardTitle('Ôn tập Flashcard');
                  setFlashcardIndex(0);
                  setIsFlipped(false);
                }}
                disabled={selectedVocabIds.length === 0}
                className="flex items-center gap-2 border border-border bg-white text-text-main px-4 py-2 rounded font-bold tracking-widest uppercase text-[11px] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Học Flashcard
              </button>
              <button 
                id="add-vocab-btn"
                onClick={() => {
                  setIsAdding(!isAdding);
                  setEditingVocab(null);
                  setNewVocab({ word: '', type: '(n)', meaning: '', example: '', synonyms: '' });
                }}
                className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded font-bold tracking-widest uppercase text-[11px] hover:bg-blue-700 transition-colors shadow-sm"
              >
                {isAdding ? 'Đóng' : <><Plus size={14} /> Thêm từ mới</>}
              </button>
            </div>
          </div>

          {/* Flashcard Modal was moved outside */}



          {/* AI Exercises Modal */}
          {isGeneratingExercises && (
            <div className="bg-bg-sec rounded border border-border p-12 mb-10 flex flex-col items-center justify-center min-h-[300px]">
              <div className="loader mb-6"></div>
              <p className="text-text-sec text-[11px] font-bold uppercase tracking-widest animate-pulse">Đang phân tích dữ liệu...</p>
            </div>
          )}

          {exercises && !isGeneratingExercises && (
            <div className="bg-bg-sec rounded border border-border p-8 mb-10 shadow-sm">
              <h3 className="text-[14px] font-bold tracking-widest uppercase text-text-main flex justify-between items-center mb-6">
                <span>Bài tập vận dụng <span className="text-accent ml-2">({currentExerciseIndex + 1}/{exercises.length})</span></span>
                <button onClick={() => setExercises(null)} className="text-[11px] text-text-sec hover:text-text-main transition-colors">ĐÓNG</button>
              </h3>
              <div className="p-6 bg-white border border-border rounded mb-6 shadow-sm">
                <p className="text-[15px] font-medium text-text-main leading-relaxed">{exercises[currentExerciseIndex].question}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {exercises[currentExerciseIndex].options.map((opt, idx) => {
                  const isCorrect = idx === exercises[currentExerciseIndex].correctIndex;
                  let btnClass = "p-4 rounded text-left font-medium transition-all border border-border bg-white hover:border-accent hover:-translate-y-0.5 text-[14px]";
                  if (selectedAnswer !== null) {
                    if (isCorrect) btnClass = "p-4 rounded text-left font-medium transition-all border-status-mastered bg-status-mastered-bg text-status-mastered-text text-[14px]";
                    else if (selectedAnswer === idx) btnClass = "p-4 rounded text-left font-medium transition-all border-red-300 bg-red-50 text-red-600 text-[14px]";
                    else btnClass = "p-4 rounded text-left font-medium transition-all border-border bg-gray-50 opacity-50 text-[14px]";
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedAnswer(idx)}
                      disabled={selectedAnswer !== null}
                      className={btnClass}
                    >
                      <span className="font-bold mr-3 text-text-muted">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {selectedAnswer !== null && (
                <div className={`p-5 rounded mb-6 border ${selectedAnswer === exercises[currentExerciseIndex].correctIndex ? 'bg-status-mastered-bg border-status-mastered' : 'bg-red-50 border-red-200'}`}>
                  <p className={`font-bold tracking-widest uppercase text-[11px] mb-2 ${selectedAnswer === exercises[currentExerciseIndex].correctIndex ? 'text-status-mastered-text' : 'text-red-600'}`}>
                    {selectedAnswer === exercises[currentExerciseIndex].correctIndex ? '✓ Chính xác' : '✗ Chưa chính xác'}
                  </p>
                  <p className="text-[13.5px] leading-relaxed text-text-sec">{exercises[currentExerciseIndex].explanation}</p>
                </div>
              )}
              {selectedAnswer !== null && currentExerciseIndex < exercises.length - 1 && (
                <button onClick={() => { setCurrentExerciseIndex(currentExerciseIndex + 1); setSelectedAnswer(null); }} className="w-full py-3 bg-text-main hover:bg-black text-white font-bold tracking-widest uppercase text-[11px] rounded transition-colors">
                  Câu Tiếp Theo
                </button>
              )}
              {selectedAnswer !== null && currentExerciseIndex === exercises.length - 1 && (
                <button onClick={() => setExercises(null)} className="w-full py-3 border border-border bg-white hover:bg-gray-50 text-text-main font-bold tracking-widest uppercase text-[11px] rounded transition-colors">
                  Hoàn Thành
                </button>
              )}
            </div>
          )}

          {/* Add/Edit Form */}
          {isAdding && (
            <form onSubmit={handleAddOrEdit} className="bg-white p-8 rounded-[24px] mb-10 border border-slate-200">
              <h3 className="font-semibold text-lg mb-6 tracking-tight">{editingVocab ? 'Chỉnh sửa từ vựng' : 'Thêm từ mới'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Từ vựng (Word) *</label>
                    <input required type="text" value={newVocab.word} onChange={e => setNewVocab({...newVocab, word: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:border-slate-400 focus:outline-none text-[14.5px]" placeholder="Ví dụ: Elaborate" />
                  </div>
                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Loại từ</label>
                    <select value={newVocab.type || '(n)'} onChange={e => setNewVocab({...newVocab, type: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:border-slate-400 focus:outline-none text-[14.5px]">
                      <option value="(n)">Danh từ (n)</option>
                      <option value="(v)">Động từ (v)</option>
                      <option value="(adj)">Tính từ (adj)</option>
                      <option value="(adv)">Trạng từ (adv)</option>
                      <option value="(prep)">Giới từ (prep)</option>
                      <option value="(conj)">Liên từ (conj)</option>
                      <option value="(phr)">Cụm từ (phr)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Ý nghĩa (Meaning) *</label>
                  <input required type="text" value={newVocab.meaning} onChange={e => setNewVocab({...newVocab, meaning: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:border-slate-400 focus:outline-none text-[14.5px]" placeholder="Ví dụ: Tỉ mỉ, chi tiết" />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Ví dụ (Example)</label>
                <input type="text" value={newVocab.example} onChange={e => setNewVocab({...newVocab, example: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:border-slate-400 focus:outline-none text-[14.5px]" placeholder="Ví dụ: They made an elaborate plan." />
              </div>
              <div className="mb-8">
                <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Từ đồng nghĩa (Synonyms - cách nhau bằng dấu phẩy)</label>
                <input type="text" value={newVocab.synonyms} onChange={e => setNewVocab({...newVocab, synonyms: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:border-slate-400 focus:outline-none text-[14.5px]" placeholder="Ví dụ: detailed, complicated" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 rounded-full border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-[14.5px]">Hủy</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors text-[14.5px] shadow-sm">Lưu từ vựng</button>
              </div>
            </form>
          )}

          {/* Vocab List */}
          <div id="vocab-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vocabularies.map(vocab => {
              const isOwner = vocab.userId === user.id;
              const isSelected = selectedVocabIds.includes(vocab.id);
              return (
                <div key={vocab.id} className={`bg-white p-6 rounded-md relative group flex flex-col border transition-all ${isSelected ? 'border-text-main shadow-sm' : 'border-border hover:border-gray-300 hover:-translate-y-1'}`}>
                  
                  <div className="absolute top-5 right-5 flex gap-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelectVocab(vocab.id)}
                      className="w-[16px] h-[16px] rounded border-border text-text-main focus:ring-text-main cursor-pointer"
                      title="Chọn để tạo bài tập / flashcard"
                    />
                    {isOwner && (
                      <button onClick={() => handleDelete(vocab.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div>
                      <h3 className="text-[20px] font-serif font-medium text-text-main leading-tight tracking-tight mb-1 flex items-center gap-2">
                        {vocab.word}
                        {vocab.type && <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">{vocab.type}</span>}
                      </h3>
                      <div className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase text-text-sec mt-0.5">
                        {vocab.visibility === 'PRIVATE' && <><Lock size={10} /> Chỉ mình tôi</>}
                        {vocab.visibility === 'PUBLIC' && <><Globe size={10} /> Cộng đồng</>}
                        {vocab.visibility === 'GROUP' && <><Users size={10} /> Nhóm</>}
                      </div>
                    </div>
                  </div>
                  <p className="text-[14.5px] text-text-sec mb-4">{vocab.meaning}</p>
                  
                  {vocab.example && (
                    <div className="bg-gray-50 px-4 py-3 rounded border border-gray-100 mb-4">
                      <p className="text-[13px] text-text-sec italic">"{vocab.example}"</p>
                    </div>
                  )}
                  {vocab.synonyms && vocab.synonyms.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-auto mb-4">
                      {vocab.synonyms.map(syn => (
                        <span key={syn} className="px-2.5 py-1 bg-white border border-border text-text-sec text-[9px] font-bold tracking-widest uppercase rounded">
                          {syn}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Advanced Options & Report */}
                  <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-4">
                    <button 
                      onClick={() => {
                        setEditingVocab(vocab);
                        setNewVocab({
                          word: vocab.word,
                          type: vocab.type || '(n)',
                          meaning: vocab.meaning,
                          example: vocab.example || '',
                          synonyms: vocab.synonyms?.join(', ') || ''
                        });
                        setIsAdding(true);
                      }} 
                      className="text-[10px] font-bold tracking-widest uppercase text-text-sec hover:text-text-main transition-colors"
                    >
                      Chỉnh sửa
                    </button>
                    
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold tracking-widest uppercase text-text-sec hover:text-text-main">
                        <input 
                          type="checkbox"
                          checked={vocab.status === 'LEARNING' || vocab.status === 'REVIEW'}
                          onChange={async (e) => {
                            const newStatus = e.target.checked ? 'LEARNING' : 'NEW';
                            try {
                              await api.post('/srs/toggle-status', { type: 'PERSONAL', id: vocab.id, status: newStatus });
                              setVocabularies(vocabularies.map(x => x.id === vocab.id ? { ...x, status: newStatus } : x));
                            } catch (err) { toast.error('Lỗi'); }
                          }}
                          className="w-3.5 h-3.5 accent-text-main rounded-sm"
                        />
                        Muốn học
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold tracking-widest uppercase text-text-sec hover:text-text-main">
                        <input 
                          type="checkbox"
                          checked={vocab.status === 'MASTERED'}
                          onChange={async (e) => {
                            const newStatus = e.target.checked ? 'MASTERED' : 'NEW';
                            try {
                              await api.post('/srs/toggle-status', { type: 'PERSONAL', id: vocab.id, status: newStatus });
                              setVocabularies(vocabularies.map(x => x.id === vocab.id ? { ...x, status: newStatus } : x));
                            } catch (err) { toast.error('Lỗi'); }
                          }}
                          className="w-3.5 h-3.5 accent-text-main rounded-sm"
                        />
                        Đã thuộc
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
            {vocabularies.length === 0 && !isAdding && (
              <div className="col-span-full text-center py-16 text-slate-400">
                <BookOpen size={40} className="mx-auto mb-4 opacity-30" />
                <p className="text-[14.5px]">Sổ tay đang trống. Hãy thêm từ vựng đầu tiên của bạn!</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Global Modals that should show regardless of active tab */}
      
      {/* Flashcard Modal */}
      {activeFlashcards.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl relative">
            <div className="flex justify-between items-center mb-6 text-white">
              <div>
                <h2 className="text-2xl font-bold">{flashcardTitle}</h2>
                <p className="text-slate-300 mt-1">Từ {flashcardIndex + 1} / {activeFlashcards.length}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { 
                    setActiveFlashcards([...activeFlashcards].sort(() => Math.random() - 0.5)); 
                    setFlashcardIndex(0); 
                    setIsFlipped(false); 
                  }} 
                  className="bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-full text-[13.5px] font-semibold transition flex items-center gap-2" 
                  title="Đảo thứ tự ngẫu nhiên"
                >
                  <Shuffle size={16} /> Đảo
                </button>
                <button 
                  onClick={() => setActiveFlashcards([])} 
                  className="bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-full text-[13.5px] font-semibold transition"
                >
                  Đóng ✕
                </button>
              </div>
            </div>
            
            <div 
              className="relative w-full h-96 perspective-1000 cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={`w-full h-full duration-500 preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front Side */}
                <div className="absolute w-full h-full backface-hidden bg-white rounded-[32px] flex flex-col items-center justify-center p-8 border border-slate-200">
                  <span className="text-slate-400 font-medium uppercase tracking-[0.1em] text-xs mb-6 absolute top-8 text-center w-full">
                    Mặt trước <br/> <span className="text-[10px] text-slate-400 mt-1">{activeFlashcards[flashcardIndex]?.isSystem ? 'Hệ thống từ vựng' : 'Từ vựng của tôi'}</span>
                  </span>
                  <h3 className="text-5xl font-semibold text-slate-900 mb-6 text-center tracking-tight">{activeFlashcards[flashcardIndex]?.word}</h3>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = activeFlashcards[flashcardIndex]?.audioUrl || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(activeFlashcards[flashcardIndex]?.word)}&type=1`;
                      new Audio(url).play();
                    }}
                    className="text-slate-400 hover:text-slate-900 p-2 rounded-full transition-colors"
                  >
                    <PlayCircle size={36} />
                  </button>
                </div>

                {/* Back Side */}
                <div className="absolute w-full h-full backface-hidden bg-slate-900 rounded-[32px] flex flex-col items-center justify-center p-8 rotate-y-180 text-white border border-slate-800">
                  <span className="text-slate-400 font-medium uppercase tracking-[0.1em] text-xs mb-4 absolute top-8">Mặt sau</span>
                  <h3 className="text-4xl font-semibold mb-4 text-center">{activeFlashcards[flashcardIndex]?.word}</h3>
                  {activeFlashcards[flashcardIndex]?.pronunciation && <p className="text-lg text-slate-400 mb-6 font-serif italic">{activeFlashcards[flashcardIndex]?.pronunciation}</p>}
                  <div className="w-full text-center mb-6">
                    <p className="text-2xl font-medium text-white">{activeFlashcards[flashcardIndex]?.meaning}</p>
                  </div>
                  {activeFlashcards[flashcardIndex]?.example && (
                    <p className="text-slate-400 text-center text-[15px] px-8 italic">"{activeFlashcards[flashcardIndex]?.example}"</p>
                  )}
                </div>
              </div>
            </div>

            {!isFlipped && (
              <div className="mt-6 text-center text-white/50 text-[12px] font-medium tracking-widest uppercase hidden sm:block">
                Nhấn vào thẻ (hoặc phím Space) để lật
              </div>
            )}

            {isFlipped && (flashcardTitle === 'Học từ mới' || flashcardTitle === 'Ôn tập từ cũ') ? (
              <div className="flex justify-between items-center mt-6 gap-3">
                <button onClick={(e) => { e.stopPropagation(); handleSrsReview(1); }} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-4 rounded-full font-semibold transition text-[13.5px]">
                  Quên (1)
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleSrsReview(3); }} className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 px-4 py-4 rounded-full font-semibold transition text-[13.5px]">
                  Khó (3)
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleSrsReview(4); }} className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-4 py-4 rounded-full font-semibold transition text-[13.5px]">
                  Tốt (4)
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleSrsReview(5); }} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-4 py-4 rounded-full font-semibold transition text-[13.5px]">
                  Dễ (5)
                </button>
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
                    if (flashcardIndex === activeFlashcards.length - 1) {
                      setActiveFlashcards([]);
                    } else {
                      setIsFlipped(false); setFlashcardIndex(Math.min(activeFlashcards.length - 1, flashcardIndex + 1)); 
                    }
                  }}
                  className="flex-1 bg-slate-100 hover:bg-white text-slate-900 px-6 py-4 rounded-full font-semibold transition flex items-center justify-center gap-2 text-[14.5px]"
                >
                  {flashcardIndex === activeFlashcards.length - 1 ? 'HOÀN THÀNH' : <>TIẾP THEO <ArrowLeft size={18} className="rotate-180" /></>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Vocabulary;
