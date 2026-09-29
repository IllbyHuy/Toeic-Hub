import React, { useState } from 'react';
import StreakModal from './StreakModal';

const TIERS = [
  {min:0,name:'Lửa khởi động',a:'#FF7A00',b:'#FFC800',core:'#FFF0A8',tc:'#FF9600',size:92,glow:0},
  {min:30,name:'Lửa đỏ (1 tháng)',a:'#E8262B',b:'#FF9F1C',core:'#FFE0A0',tc:'#F0452A',size:96,glow:8},
  {min:100,name:'Lửa hồng (100 ngày)',a:'#D6249F',b:'#FF7A59',core:'#FFD9EC',tc:'#D6249F',size:100,glow:12},
  {min:180,name:'Lửa tím rực (6 tháng)',a:'#6C3BFF',b:'#FF4FD8',core:'#F3DDFF',tc:'#8A4DFF',size:108,glow:16},
  {min:365,name:'Lửa huyền thoại (1 năm)',a:'#0A7CFF',b:'#22E6D8',core:'#FFFFFF',tc:'#0A9BFF',size:120,glow:22}
];
const tierOf = (s) => [...TIERS].reverse().find(t => s >= t.min) || TIERS[0];
const tickIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const snowIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px"><path d="M12 2v20M3.5 7l17 10M3.5 17l17-10"/></svg>`;
const EVERY = 7;
const MAX_FREEZE = 2;

export default function FireStreak({ streakCount = 0, activityLogs = [], dailyStats = [] }) {
  const [showModal, setShowModal] = useState(false);

  // Transform activity logs
  const DAY = 864e5;
  const dn = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
  const todayDn = dn(new Date());
  const utc = n => new Date(n * DAY);
  const wd = n => (utc(n).getUTCDay() + 6) % 7;
  const names = ['T2','T3','T4','T5','T6','T7','CN'];
  
  const S = { done: [], frozen: [], freezes: 1 };
  activityLogs.forEach(log => {
    const d = new Date(log.date);
    S.done.push(dn(d));
  });
  const has = n => S.done.includes(n);
  const fz = n => S.frozen.includes(n);
  
  const left = EVERY - (streakCount % EVERY);
  const full = S.freezes >= MAX_FREEZE;
  const t = todayDn;
  const ok = has(t);
  const T = tierOf(streakCount);

  const renderCell = (n, today, lb) => {
    const c = ['duo-c'];
    if (has(n)) c.push('done');
    else if (fz(n)) c.push('frozen');
    else c.push('e');
    if (n === today) c.push('today');
    
    return (
      <span key={n} className={c.join(' ')} title={fz(n) ? 'Ngày được băng bảo vệ' : ''}>
        {has(n) ? <span dangerouslySetInnerHTML={{__html: tickIcon}}/> : fz(n) ? <span dangerouslySetInnerHTML={{__html: snowIcon}}/> : lb}
      </span>
    );
  };

  const m = t - wd(t);

  return (
    <div className="w-full relative font-sans">
      <style>{`
        .duo-card { --bg:#fff; --card:#fff; --ink:#3C3C3C; --mute:#8A8A8A; --line:#E5E5E5; --gray:#F0F0F0; --org:#FF9600; --orgL:#FFF3DC; --grn:#58CC02; --ice:#1CB0F6; --iceL:#E3F5FE; color: var(--ink); width: 100%; display: flex; flex-direction: column; }
        .duo-hero { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 16px 0; }
        .duo-flame { width: 92px; height: 92px; transform-origin: 50% 90%; transition: filter .4s, opacity .4s; }
        .duo-flame.off { filter: grayscale(1); opacity: .4; }
        .duo-num { font-size: 72px; font-weight: 900; line-height: 1; color: var(--tc, var(--org)); font-variant-numeric: tabular-nums; transition: color .4s; }
        .duo-unit { margin: 0; font-size: 20px; font-weight: 800; color: var(--tc, var(--org)); }
        
        .duo-status { margin: 0 0 16px 0; padding: 12px 14px; border-radius: 14px; display: flex; gap: 10px; align-items: center; font-weight: 700; font-size: 14px; border: 2px dashed var(--line); color: var(--mute); }
        .duo-status.ok { border: 2px solid var(--grn); color: var(--ink); background: color-mix(in srgb,var(--grn) 12%,transparent); }
        .duo-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--line); flex: none; }
        .duo-status.ok .duo-dot { background: var(--grn); }
        
        .duo-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px 4px; text-align: center; margin-bottom: 16px; }
        .duo-h { font-size: 12px; font-weight: 800; color: var(--mute); margin-bottom: 4px; }
        .duo-c { justify-self: center; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 13px; font-weight: 800; border: 3px solid transparent; background: var(--gray); }
        .duo-c.e { color: var(--mute); } .duo-c.done { background: var(--org); } .duo-c.frozen { background: var(--ice); }
        .duo-c.today { border-color: var(--org); } .duo-c.done.today, .duo-c.frozen.today { border-color: transparent; }
        
        .duo-fz { padding: 14px; border-radius: 16px; background: var(--iceL); border: 2px solid var(--ice); margin-bottom: 16px; }
        .duo-fz .t { display: flex; justify-content: space-between; align-items: center; font-weight: 900; }
        .duo-fz .t span { color: var(--ice); display: flex; gap: 4px; align-items: center; }
        .duo-fz p { margin: 6px 0 0; font-size: 13px; font-weight: 700; color: var(--mute); }
        .meter { height: 10px; border-radius: 99px; background: var(--gray); overflow: hidden; margin: 8px 0 2px; }
        .meter i { display: block; height: 100%; border-radius: inherit; background: var(--grn); transition: width .5s; }
        .duo-fz .meter i { background: var(--ice); }
      `}</style>

      <div className="duo-card" style={{ '--tc': T.tc }}>
        <div className="duo-hero">
          <svg className={`duo-flame ${ok ? '' : 'off'}`} viewBox="0 0 64 64" aria-hidden="true" style={{ width: T.size, height: T.size, filter: (ok && T.glow) ? `drop-shadow(0 0 ${T.glow}px ${T.tc})` : '' }}>
            <defs><linearGradient id="g_main" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={T.a}/><stop offset="1" stopColor={T.b}/></linearGradient></defs>
            <path fill="url(#g_main)" d="M33 3c1 11 15 18 15 34a16 16 0 0 1-32 0c0-9 4-14 9-18 0 7 3 10 6 10-2-9-1-18 2-26z"/>
            <path fill={T.core} d="M32 60a8.5 8.5 0 0 1-8.5-8.5c0-5 3.5-7 5.5-11 1 3 3 4 4 4-1-3 0-6 1-8 3 5 6.5 8 6.5 13.5A8.5 8.5 0 0 1 32 60z"/>
          </svg>
          <div>
            <div className="duo-num">{streakCount}</div>
            <p className="duo-unit">ngày liên tiếp</p>
          </div>
        </div>

        <div className={`duo-status ${ok ? 'ok' : ''}`}>
          <span className="duo-dot"></span>
          <span>{ok ? 'Hôm nay đã được ghi nhận tự động.' : 'Chưa có hoạt động hôm nay. Học một bài, hệ thống sẽ tự ghi nhận.'}</span>
        </div>

        <div className="duo-grid">
          {names.map(x => <span key={x} className="duo-h">{x}</span>)}
          {Array.from({length: 7}, (_, i) => renderCell(m + i, t, ''))}
        </div>

        <div className="duo-fz">
          <div className="t">Băng bảo vệ chuỗi<span>
            <span style={{opacity: S.freezes > 0 ? 1 : 0.25}} dangerouslySetInnerHTML={{__html: snowIcon}}/>
            <span style={{opacity: S.freezes > 1 ? 1 : 0.25}} dangerouslySetInnerHTML={{__html: snowIcon}}/>
          </span></div>
          <div className="meter"><i style={{width: `${full ? 100 : ((EVERY - left) / EVERY) * 100}%`}}></i></div>
          <p>
            {full ? 'Kho băng đã đầy. Hãy dùng băng khi lỡ ngày.' : `Còn ${left} ngày nữa để nhận thêm 1 băng. Lỡ 1 ngày, hệ thống tự dùng băng.`}
          </p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="w-full py-3.5 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[12px] rounded-xl transition-colors"
        >
          Xem chi tiết & BXH
        </button>
      </div>

      <StreakModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        streakCount={streakCount}
        activityLogs={activityLogs}
        dailyStats={dailyStats}
      />
    </div>
  );
}
