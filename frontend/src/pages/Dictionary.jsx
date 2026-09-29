import { useState } from 'react';
import { Search, Volume2, BookOpen, Shuffle, ArrowRight, Loader2, Sparkles, Save } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Dictionary = () => {
  const [searchWord, setSearchWord] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [checkSentence, setCheckSentence] = useState('');
  const [sentenceResult, setSentenceResult] = useState(null);
  const [isCheckingSentence, setIsCheckingSentence] = useState(false);

  // Save form states
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveData, setSaveData] = useState({ word: '', meaning: '', example: '', synonyms: [] });

  const handleSearch = async (e, wordToSearch = searchWord) => {
    if (e) e.preventDefault();
    if (!wordToSearch.trim()) return;
    setSearchWord(wordToSearch);
    setIsLoading(true);
    setResult(null);
    setQuizMode(false);
    setQuizData(null);
    setSentenceResult(null);
    setShowSaveForm(false);

    try {
      const res = await api.post('/ai/dictionary', { word: wordToSearch.trim() });
      setResult(res.data || res);
    } catch (error) {
      toast.error('Không thể tra từ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const openSaveForm = () => {
    if (!result) return;
    setSaveData({
      word: result.word,
      meaning: result.meaning,
      example: result.examples?.[0] || '',
      synonyms: result.synonyms || []
    });
    setShowSaveForm(true);
  };

  const handleSaveVocab = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vocabularies', saveData);
      toast.success('Đã lưu vào Sổ tay Từ vựng!');
      setShowSaveForm(false);
    } catch (error) {
      toast.error('Lỗi khi lưu từ vựng');
    }
  };

  const handleQuiz = async () => {
    if (!result) return;
    setQuizMode(true);
    setSelectedAnswer(null);
    try {
      const res = await api.post('/ai/quiz', { word: result.word });
      setQuizData(res.data || res);
    } catch (error) {
      toast.error('Không thể tạo quiz');
      setQuizMode(false);
    }
  };

  const handleCheckSentence = async () => {
    if (!checkSentence.trim()) return;
    setIsCheckingSentence(true);
    setSentenceResult(null);
    try {
      const res = await api.post('/ai/check-sentence', { 
        sentence: checkSentence.trim(),
        word: result?.word || ''
      });
      setSentenceResult(res.data || res);
    } catch (error) {
      toast.error('Không thể kiểm tra câu');
    } finally {
      setIsCheckingSentence(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Search */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-accent-blue to-accent-pink bg-clip-text text-transparent mb-3">
          Từ Điển AI Thông Minh
        </h1>
        <p className="text-slate-500 text-lg">Tra từ, phân tích word forms, đồng nghĩa, và luyện tập ngay tức thì</p>
      </div>

      <form onSubmit={handleSearch} className="relative mb-8">
        <div className="glass-card rounded-2xl p-2 flex items-center gap-2 shadow-lg">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchWord}
              onChange={e => setSearchWord(e.target.value)}
              placeholder="Nhập từ tiếng Anh (VD: elaborate, accomplish, play...)"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-transparent text-lg focus:outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchWord.trim()}
            className="bg-gradient-to-r from-primary to-accent-blue text-white px-8 py-3.5 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            {isLoading ? 'Đang tra...' : 'Tra từ'}
          </button>
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Typo Handling UI */}
          {result.isCorrected && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-3">
              <Sparkles className="text-amber-500" size={24} />
              <div>
                <p className="font-semibold">Có vẻ bạn đã gõ sai chính tả từ <span className="line-through opacity-70">{result.originalWord}</span>.</p>
                <p>AI đã tự động sửa thành <strong>{result.word}</strong>.</p>
              </div>
            </div>
          )}

          {result.didYouMean && !result.isCorrected && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-center gap-3">
              <Sparkles className="text-blue-500" size={24} />
              <div>
                <p className="font-semibold">Ý bạn là <strong>{result.didYouMean}</strong>?</p>
                <button onClick={() => handleSearch(null, result.didYouMean)} className="mt-1 text-sm bg-blue-200 hover:bg-blue-300 px-3 py-1 rounded-full font-medium transition">
                  Tra từ này
                </button>
              </div>
            </div>
          )}

          {/* Main Word Card */}
          <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-4xl font-black text-slate-800 mb-1">{result.word}</h2>
                {result.phonetic && (
                  <p className="text-lg text-slate-500 font-mono">{result.phonetic}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={openSaveForm} className="p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Lưu vào Sổ tay">
                  <Save size={20} />
                </button>
                <button onClick={handleQuiz} className="p-2.5 rounded-full bg-accent-pink/10 text-accent-pink hover:bg-accent-pink/20 transition-colors" title="Tạo Quiz">
                  <Shuffle size={20} />
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Nghĩa tiếng Việt</span>
              <p className="text-lg text-slate-800 font-medium mt-1">{result.meaning}</p>
            </div>

            {result.partOfSpeech && (
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">{result.partOfSpeech}</span>
            )}
          </div>

          {/* Save Form (One-click auto-fill) */}
          {showSaveForm && (
            <form onSubmit={handleSaveVocab} className="glass-card rounded-2xl p-6 border-2 border-primary/20">
              <h3 className="font-bold text-lg mb-4 text-slate-800">Lưu vào Sổ tay Từ vựng</h3>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Từ vựng</label>
                  <input type="text" value={saveData.word} onChange={e => setSaveData({...saveData, word: e.target.value})} className="w-full bg-slate-50 border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Nghĩa tiếng Việt</label>
                  <input type="text" value={saveData.meaning} onChange={e => setSaveData({...saveData, meaning: e.target.value})} className="w-full bg-slate-50 border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Ví dụ minh họa</label>
                  <input type="text" value={saveData.example} onChange={e => setSaveData({...saveData, example: e.target.value})} className="w-full bg-slate-50 border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowSaveForm(false)} className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold">Lưu Từ</button>
              </div>
            </form>
          )}

          {/* Word Forms */}
          {result.wordForms && result.wordForms.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                <Shuffle size={20} className="text-primary" /> Các dạng từ (Word Forms)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.wordForms.map((wf, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <span className="text-xs font-bold text-white bg-gradient-to-r from-primary to-accent-blue px-2 py-1 rounded-md uppercase">{wf.type}</span>
                    <span className="font-semibold text-slate-800">{wf.word}</span>
                    {wf.meaning && <span className="text-slate-500 text-sm ml-auto">({wf.meaning})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Synonyms */}
          {result.synonyms && result.synonyms.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 text-slate-800">🔗 Từ đồng nghĩa</h3>
              <div className="flex flex-wrap gap-2">
                {result.synonyms.map((syn, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => { setSearchWord(syn); }}
                    className="px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-100"
                  >
                    {syn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          {result.examples && result.examples.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 text-slate-800">📝 Ví dụ</h3>
              <div className="space-y-3">
                {result.examples.map((ex, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-xl bg-slate-50 border-l-4 border-primary">
                    <span className="text-primary font-bold">{idx + 1}.</span>
                    <p className="text-slate-700">{ex}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentence Check */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4 text-slate-800">✍️ Luyện đặt câu</h3>
            <p className="text-sm text-slate-500 mb-3">Hãy đặt một câu sử dụng từ <strong className="text-primary">{result.word}</strong>, AI sẽ kiểm tra giúp bạn.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={checkSentence}
                onChange={e => setCheckSentence(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheckSentence()}
                placeholder={`VD: She elaborated on her plan...`}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <button
                onClick={handleCheckSentence}
                disabled={isCheckingSentence || !checkSentence.trim()}
                className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isCheckingSentence ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                Kiểm tra
              </button>
            </div>
            {sentenceResult && (
              <div className={`mt-4 p-4 rounded-xl border ${sentenceResult.isCorrect ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="font-semibold mb-1">{sentenceResult.isCorrect ? '✅ Tuyệt vời!' : '⚠️ Cần sửa lại'}</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{sentenceResult.feedback}</p>
              </div>
            )}
          </div>

          {/* Quiz */}
          {quizMode && quizData && (
            <div className="glass-card rounded-2xl p-6 border-t-4 border-accent-pink">
              <h3 className="font-bold text-lg mb-4 text-slate-800">🧠 Mini Quiz</h3>
              <p className="text-slate-700 mb-4 font-medium">{quizData.question}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quizData.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(idx)}
                    className={`p-4 rounded-xl text-left font-medium transition-all border-2 ${
                      selectedAnswer === idx
                        ? selectedAnswer === quizData.correctIndex
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-red-500 bg-red-50 text-red-800'
                        : 'border-slate-200 hover:border-primary/50 hover:bg-primary/5'
                    }`}
                    disabled={selectedAnswer !== null}
                  >
                    <span className="text-xs font-bold text-slate-400 mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                  </button>
                ))}
              </div>
              {selectedAnswer !== null && (
                <div className={`mt-4 p-4 rounded-xl ${selectedAnswer === quizData.correctIndex ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="font-semibold">{selectedAnswer === quizData.correctIndex ? '🎉 Chính xác!' : '❌ Sai rồi!'}</p>
                  <p className="text-sm text-slate-600 mt-1">{quizData.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-bg-sec rounded border border-border p-12 mt-6 flex flex-col items-center justify-center min-h-[300px]">
          <div className="loader mb-6"></div>
          <p className="text-text-sec text-[11px] font-bold uppercase tracking-widest animate-pulse">Đang tra cứu từ vựng...</p>
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={64} className="mx-auto mb-4 opacity-15" />
          <p className="text-lg">Nhập một từ tiếng Anh để bắt đầu tra cứu</p>
          <p className="text-sm mt-2">AI sẽ phân tích word forms, từ đồng nghĩa, và tạo bài tập cho bạn</p>
        </div>
      )}
    </div>
  );
};

export default Dictionary;
