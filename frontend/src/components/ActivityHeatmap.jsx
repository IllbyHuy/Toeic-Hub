import React, { useState, useMemo, useEffect } from 'react';
import { Activity, X, BookOpen, Clock, Loader2 } from 'lucide-react';
import api from '../services/api';

const ActivityHeatmap = ({ data }) => {
  const [activeTab, setActiveTab] = useState('vocabulary');
  const [selectedDate, setSelectedDate] = useState(null);
  const [activityDetails, setActivityDetails] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState(new Date().getMonth() < 6 ? 1 : 2);

  // Parse real data or fallback to empty
  const activityLogs = data?.activityLogs || [];
  
  const { gridData, monthLabels, totalColumns } = useMemo(() => {
    // 1. Determine date range for selected year & semester
    const startMonth = selectedSemester === 1 ? 0 : 6;
    const endMonth = selectedSemester === 1 ? 5 : 11;
    
    // Start of the semester
    const startDate = new Date(selectedYear, startMonth, 1);
    // End of the semester
    const endDate = new Date(selectedYear, endMonth + 1, 0); // Last day of endMonth

    // Find the Sunday on or before startDate
    const startGridDate = new Date(startDate);
    startGridDate.setDate(startDate.getDate() - startDate.getDay());

    // Find the Saturday on or after endDate
    const endGridDate = new Date(endDate);
    if (endDate.getDay() !== 6) {
      endGridDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    }

    // Calculate total days and columns
    const totalDays = Math.round((endGridDate - startGridDate) / (1000 * 60 * 60 * 24)) + 1;
    const columns = Math.ceil(totalDays / 7);

    const generatedGrid = [];
    const generatedLabels = [];
    let currentMonth = -1;

    for (let c = 0; c < columns; c++) {
      for (let r = 0; r < 7; r++) {
        const current = new Date(startGridDate);
        current.setDate(startGridDate.getDate() + (c * 7 + r));
        
        // Track month label if it's the first time we see this month in this grid (only check on Sundays to avoid overlap)
        if (r === 0) {
          if (current.getMonth() !== currentMonth) {
            // Only add label if it's within our semester to avoid edge month labels
            if (current.getMonth() >= startMonth && current.getMonth() <= endMonth) {
              generatedLabels.push({ month: current.toLocaleString('en-US', { month: 'short' }), index: c });
            }
            currentMonth = current.getMonth();
          }
        }

        // Format date string using local time instead of UTC to avoid timezone shift
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        // Only fetch log if it's strictly in the requested year and semester range?
        // Let's just fetch it for the exact date, users might like seeing the overlap.
        const log = activityLogs.find(l => l.date === dateString && l.type === activeTab);
        let level = 0;
        let count = log ? log.count : 0;
        if (count > 0) {
          if (count < 5) level = 1;
          else if (count < 10) level = 2;
          else if (count < 20) level = 3;
          else level = 4;
        }

        generatedGrid.push({
          date: dateString,
          level,
          count,
          inRange: current.getMonth() >= startMonth && current.getMonth() <= endMonth && current.getFullYear() === selectedYear
        });
      }
    }

    return { gridData: generatedGrid, monthLabels: generatedLabels, totalColumns: columns };
  }, [activityLogs, activeTab, selectedYear, selectedSemester]);

  const getColorClass = (level, inRange) => {
    if (!inRange) return 'bg-slate-50 opacity-30'; // Out of range cells
    switch(level) {
      case 1: return 'bg-indigo-200/80 hover:bg-indigo-300';
      case 2: return 'bg-indigo-400/90 hover:bg-indigo-500';
      case 3: return 'bg-indigo-500 hover:bg-indigo-600';
      case 4: return 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/30';
      default: return 'bg-slate-100 hover:bg-slate-200';
    }
  };

  const handleCellClick = async (date, count) => {
    if (count === 0) return;
    setSelectedDate(date);
    setIsLoadingDetails(true);
    try {
      const response = await api.get(`/users/me/analytics/activity-details?date=${date}&type=${activeTab}`);
      setActivityDetails(response.data || []);
    } catch (error) {
      console.error('Failed to fetch activity details:', error);
      setActivityDetails([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const totalCount = activityLogs.filter(l => l.type === activeTab).reduce((sum, log) => sum + log.count, 0);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden font-sans w-full max-w-4xl">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-100 rounded-md">
              <Activity size={14} className="text-indigo-600" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Hoạt động</span>
          </div>
          <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-1">
            {totalCount.toLocaleString()}
          </div>
          <div className="text-[13px] text-slate-500 font-medium flex items-center gap-1.5 mt-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Chuỗi hiện tại: <span className="font-bold text-slate-700">{data?.currentStreak || 0}</span> ngày
          </div>
        </div>

        <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-200/60 shadow-inner mt-4 sm:mt-0">
          <button 
            onClick={() => setActiveTab('vocabulary')}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${activeTab === 'vocabulary' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Từ vựng
          </button>
          <button 
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${activeTab === 'tests' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Thi thử
          </button>
          <button 
            onClick={() => setActiveTab('tips')}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${activeTab === 'tips' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sổ tay
          </button>
        </div>
      </div>

      {/* Year & Semester Selectors */}
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
          <button 
            onClick={() => setSelectedSemester(1)}
            className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wide transition-all ${selectedSemester === 1 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            6 Tháng Đầu
          </button>
          <button 
            onClick={() => setSelectedSemester(2)}
            className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wide transition-all ${selectedSemester === 2 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            6 Tháng Cuối
          </button>
        </div>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const year = new Date().getFullYear() - i;
            return <option key={year} value={year}>{year}</option>;
          })}
        </select>
      </div>

      {/* Grid Area */}
      <div className="flex flex-col relative w-full pt-10 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex ml-8 mb-1 min-w-max relative h-4">
          {monthLabels.map((lbl, idx) => (
            <div 
              key={idx} 
              className="absolute text-[10px] text-slate-400 font-bold uppercase tracking-wider"
              style={{ left: `${lbl.index * 16}px` }} // 12px width + 4px gap = 16px per column
            >
              {lbl.month}
            </div>
          ))}
        </div>

        <div className="flex gap-2 min-w-max relative">
          <div className="flex flex-col text-[10px] text-slate-400 font-bold uppercase tracking-wider pr-1 w-6 gap-[4px]">
            <div className="h-[12px]"></div> {/* Sun */}
            <div className="h-[12px] flex items-center">Mon</div>
            <div className="h-[12px]"></div> {/* Tue */}
            <div className="h-[12px] flex items-center">Wed</div>
            <div className="h-[12px]"></div> {/* Thu */}
            <div className="h-[12px] flex items-center">Fri</div>
            <div className="h-[12px]"></div> {/* Sat */}
          </div>

          <div className="flex gap-[4px]">
            {Array.from({ length: totalColumns }).map((_, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-[4px]">
                {Array.from({ length: 7 }).map((_, rowIndex) => {
                  const dayData = gridData[colIndex * 7 + rowIndex];
                  if (!dayData) return <div key={rowIndex} className="w-[12px] h-[12px] rounded-sm bg-transparent"></div>;
                  
                  return (
                    <div 
                      key={rowIndex}
                      onClick={() => handleCellClick(dayData.date, dayData.count)}
                      className={`w-[12px] h-[12px] rounded-sm transition-all relative group ${dayData.count > 0 ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1' : ''} ${getColorClass(dayData.level, dayData.inRange)}`}
                    >
                      {/* Tooltip */}
                      {dayData.inRange && (
                        <div className="absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap z-[100] transition-all shadow-xl after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-800">
                          <span>{dayData.count} hoạt động</span>
                          <span className="text-slate-400 font-normal ml-2">{dayData.date}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 mt-5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <span>Ít</span>
        <div className="w-3 h-3 rounded-[3px] bg-slate-100 border border-slate-200/50"></div>
        <div className="w-3 h-3 rounded-[3px] bg-indigo-200/80"></div>
        <div className="w-3 h-3 rounded-[3px] bg-indigo-400/90"></div>
        <div className="w-3 h-3 rounded-[3px] bg-indigo-500"></div>
        <div className="w-3 h-3 rounded-[3px] bg-indigo-600 shadow-sm shadow-indigo-500/30"></div>
        <span>Nhiều</span>
      </div>

      {/* Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedDate(null)}>
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col m-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800">Hoạt động ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}</h3>
                <p className="text-xs text-slate-500 font-medium">Danh sách các từ vựng đã tương tác</p>
              </div>
              <button 
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isLoadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
              ) : activityDetails.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {activityDetails.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          item.status === 'NEW' ? 'bg-indigo-50 text-indigo-600' : 
                          item.status === 'LEARNING' ? 'bg-amber-50 text-amber-600' :
                          item.status === 'REVIEW' ? 'bg-blue-50 text-blue-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {item.status === 'NEW' ? <BookOpen size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {item.word}
                            {item.type && <span className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{item.type}</span>}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1">{item.meaning}</div>
                        </div>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                        item.status === 'NEW' ? 'bg-indigo-100 text-indigo-600' :
                        item.status === 'LEARNING' ? 'bg-amber-100 text-amber-700' :
                        item.status === 'REVIEW' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Activity size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-sm">Không có dữ liệu chi tiết cho ngày này</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityHeatmap;
