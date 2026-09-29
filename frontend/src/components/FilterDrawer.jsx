import React, { useEffect, useRef } from 'react';
import { X, Filter, Check } from 'lucide-react';

const FilterDrawer = ({ 
  isOpen, 
  onClose, 
  activeFilter, 
  setActiveFilter, 
  sortBy, 
  setSortBy,
  resultCount 
}) => {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filters = [
    { id: 'ALL', label: 'Tất cả kỹ năng' },
    { id: 'LISTENING', label: 'Listening (Part 1-4)' },
    { id: 'READING', label: 'Reading (Part 5-7)' },
    { id: 'GENERAL', label: 'General / Khác' }
  ];

  const sorts = [
    { id: 'NEWEST', label: 'Mới nhất' },
    { id: 'TOP', label: 'Nhiều Like Nhất' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={drawerRef}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Filter size={20} className="text-primary" />
            Bộ Lọc Tìm Kiếm
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Lọc theo kỹ năng */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Kỹ Năng TOEIC</h3>
            <div className="space-y-2">
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    activeFilter === f.id 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="font-semibold">{f.label}</span>
                  {activeFilter === f.id && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>

          {/* Sắp xếp */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Sắp xếp theo</h3>
            <div className="grid grid-cols-2 gap-3">
              {sorts.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id)}
                  className={`py-3 px-2 text-center rounded-xl font-semibold transition-all border-2 ${
                    sortBy === s.id 
                      ? 'border-primary bg-primary text-white shadow-md shadow-primary/20' 
                      : 'border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer with Live Result Count */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <button 
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 transition flex items-center justify-center gap-2"
          >
            Hiển thị {resultCount} kết quả
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterDrawer;
