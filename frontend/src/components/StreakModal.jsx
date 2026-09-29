import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../services/api';

const TIERS = [
  {min:0,name:'Lửa khởi động',a:'#FF7A00',b:'#FFC800',core:'#FFF0A8',tc:'#FF9600',size:92,glow:0},
  {min:30,name:'Lửa đỏ (1 tháng)',a:'#E8262B',b:'#FF9F1C',core:'#FFE0A0',tc:'#F0452A',size:96,glow:8},
  {min:100,name:'Lửa hồng (100 ngày)',a:'#D6249F',b:'#FF7A59',core:'#FFD9EC',tc:'#D6249F',size:100,glow:12},
  {min:180,name:'Lửa tím rực (6 tháng)',a:'#6C3BFF',b:'#FF4FD8',core:'#F3DDFF',tc:'#8A4DFF',size:108,glow:16},
  {min:365,name:'Lửa huyền thoại (1 năm)',a:'#0A7CFF',b:'#22E6D8',core:'#FFFFFF',tc:'#0A9BFF',size:120,glow:22}
];
const tierOf = (s) => [...TIERS].reverse().find(t => s >= t.min) || TIERS[0];
const flameSvg = (c) => `<svg viewBox="0 0 64 64" style="width:100%;height:100%;display:inline-block"><path fill="${c}" d="M33 3c1 11 15 18 15 34a16 16 0 0 1-32 0c0-9 4-14 9-18 0 7 3 10 6 10-2-9-1-18 2-26z"/></svg>`;
const tickIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const snowIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px"><path d="M12 2v20M3.5 7l17 10M3.5 17l17-10"/></svg>`;
const EVERY = 7;
const MAX_FREEZE = 2;

export default function StreakModal({ isOpen, onClose, streakCount = 0, activityLogs = [], dailyStats = [] }) {
  const [view, setView] = useState('me'); // 'me' | 'rank'
  const [span, setSpan] = useState('week'); // 'week' | 'month'
  const [mode, setMode] = useState('s'); // 's' | 'w'
  const [mOff, setMOff] = useState(0);
  const [leaderboard, setLeaderboard] = useState(null);
  const [nudged, setNudged] = useState(new Set());

  useEffect(() => {
    if (view === 'rank' && !leaderboard) {
      api.get('/users/leaderboard').then(res => setLeaderboard(res.data)).catch(console.error);
    }
  }, [view, leaderboard]);

  const [loadingNudged, setLoadingNudged] = useState(new Set());

  const handleNudge = async (userToNudge) => {
    setLoadingNudged(prev => new Set(prev).add(userToNudge.name));
    try {
      await api.post('/users/nudge', { receiverId: userToNudge.id });
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success(`Hệ thống đã gửi email nhắc nhở đến ${userToNudge.name}!`);
        setNudged(prev => new Set(prev).add(userToNudge.name));
      });
    } catch (err) {
      console.error(err);
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Có lỗi xảy ra khi nhắc nhở');
      });
    } finally {
      setLoadingNudged(prev => {
        const next = new Set(prev);
        next.delete(userToNudge.name);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  // Transform activity logs to simple array of timestamps
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
  
  const bestStreak = () => {
    const a = [...new Set([...S.done])].sort((x, y) => x - y);
    let b = 0, r = 0, p = null;
    for (const n of a) { r = (p !== null && n === p + 1) ? r : 0; if (has(n)) r++; b = Math.max(b, r); p = n; }
    return b;
  };
  
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

  const renderCalendar = () => {
    if (span === 'week') {
      const m = t - wd(t);
      return (
        <div className="duo-grid">
          {names.map(x => <span key={x} className="duo-h">{x}</span>)}
          {Array.from({length: 7}, (_, i) => renderCell(m + i, t, ''))}
        </div>
      );
    }
    const b = utc(t);
    const y = b.getUTCFullYear();
    const mo = b.getUTCMonth() + mOff;
    const f = Math.floor(Date.UTC(y, mo, 1) / DAY);
    const len = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    const d0 = new Date(Date.UTC(y, mo, 1));
    
    const empties = [];
    for (let i = 0; i < wd(f); i++) empties.push(<span key={`e-${i}`}></span>);
    const cells = [];
    for (let d = 0; d < len; d++) cells.push(renderCell(f + d, t, d + 1));
    
    return (
      <>
        <div className="duo-nav">
          <button onClick={() => setMOff(mOff - 1)}>‹</button>
          <span>Tháng {d0.getUTCMonth() + 1} / {d0.getUTCFullYear()}</span>
          <button onClick={() => setMOff(mOff + 1)}>›</button>
        </div>
        <div className="duo-grid">
          {names.map(x => <span key={x} className="duo-h">{x}</span>)}
          {empties}
          {cells}
        </div>
      </>
    );
  };

  const renderTierCard = () => {
    const i = TIERS.indexOf(T);
    const N = TIERS[i + 1];
    const best = tierOf(bestStreak()).name;
    const pct = N ? ((streakCount - T.min) / (N.min - T.min)) * 100 : 100;

    return (
      <div className="duo-tier">
        <div className="t" style={{color: T.tc}}>{T.name}</div>
        <div className="chips">
          {TIERS.map((x, j) => (
            <span key={j} className="chip" style={{opacity: j <= i ? 1 : 0.35}}>
              <span dangerouslySetInnerHTML={{__html: flameSvg(x.tc)}} style={{width: 26, height: 26}} />
              {x.min ? x.min + ' ngày' : 'Bắt đầu'}
            </span>
          ))}
        </div>
        <div className="meter"><i style={{width: `${pct}%`, background: T.tc}}></i></div>
        <p>
          {N ? `Còn ` : 'Bạn đã đạt cấp lửa cao nhất! '}
          {N && <b>{N.min - streakCount} ngày</b>}
          {N && ` nữa để lên "${N.name}". `}
          Cấp cao nhất từng đạt: {best}.
        </p>
      </div>
    );
  };

  const renderRank = () => {
    if (!leaderboard) return <div style={{padding: 40, textAlign: 'center', fontWeight: 'bold', color: 'var(--mute)'}}>Đang tải...</div>;
    const { topUsers, currentUser } = leaderboard;
    const list = topUsers;
    const learned = list.filter(p => p.studiedToday).length;
    const cols = ['#1CB0F6','#CE82FF','#FF86D0','#2B70C9','#58A700','#FF4B4B','#EA9B00'];

    return (
      <>
        <div className="duo-seg" style={{marginTop: 0}}>
          <button aria-selected={mode === 's'} onClick={() => setMode('s')}>Chuỗi</button>
          <button aria-selected={mode === 'w'} onClick={() => setMode('w')}>Hôm nay</button>
        </div>
        <div className="duo-panel">
          <p className="goal">Bảng xếp hạng hệ thống</p>
          <div className="meter"><i style={{width: `${(learned / list.length) * 100}%`}}></i></div>
          <p className="sub">{learned}/{list.length} người đã học hôm nay</p>
          <div className="flex flex-col gap-2 mt-4">
            {list.map((p, i) => (
              <div key={p.id} className={`duo-row ${p.id === currentUser?.id ? 'me' : ''} ${p.studiedToday ? 'on' : ''}`}>
                <span className={`rk ${i < 3 ? 'm' + (i + 1) : ''}`}>{i + 1}</span>
                <span className="av" style={{background: cols[p.name.charCodeAt(0) % 7]}}>
                  {p.avatar ? <img src={p.avatar} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : p.name[0]}
                </span>
                <div className="who">
                  <b>{p.id === currentUser?.id ? 'Bạn' : p.name}</b>
                  <span>{p.studiedToday ? 'Đã học hôm nay' : 'Chưa học hôm nay'}</span>
                </div>
                {p.id !== currentUser?.id && !p.studiedToday && (
                  <button 
                    className="nudge flex items-center justify-center" 
                    disabled={nudged.has(p.name) || loadingNudged.has(p.name)}
                    onClick={() => handleNudge(p)}
                  >
                    {loadingNudged.has(p.name) ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : nudged.has(p.name) ? 'Đã nhắc' : 'Nhắc'}
                  </button>
                )}
                <span className="val" style={{marginLeft: p.id === currentUser?.id || p.studiedToday ? 'auto' : 0}}>
                  {mode === 's' ? p.streak : (p.studiedToday ? '1/1' : '0/1')}
                  {mode === 's' && <span style={{display: 'flex', alignItems: 'center', width: 18, height: 18, transform: 'translateY(-2px)'}} dangerouslySetInnerHTML={{__html: flameSvg(tierOf(p.streak).tc)}} />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="duo-overlay" onClick={onClose}>
      <style>{`
        :root{--bg:#fff;--card:#fff;--ink:#3C3C3C;--mute:#8A8A8A;--line:#E5E5E5;--gray:#F0F0F0;--org:#FF9600;--orgL:#FFF3DC;--grn:#58CC02;--ice:#1CB0F6;--iceL:#E3F5FE;}
        .duo-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .duo-modal { background: var(--bg); border-radius: 24px; width: 100%; max-width: 420px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; color: var(--ink); position: relative; }
        .duo-close { position: absolute; top: 16px; right: 16px; background: var(--gray); border: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--mute); z-index: 10; font-weight: bold; }
        .duo-hero { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 32px 16px 16px; }
        .duo-flame { width: 92px; height: 92px; transform-origin: 50% 90%; transition: filter .4s, opacity .4s; }
        .duo-flame.off { filter: grayscale(1); opacity: .4; }
        .duo-num { font-size: 72px; font-weight: 900; line-height: 1; color: var(--tc, var(--org)); font-variant-numeric: tabular-nums; transition: color .4s; }
        .duo-unit { margin: 0; font-size: 20px; font-weight: 800; color: var(--tc, var(--org)); }
        
        .duo-status { margin: 0 16px; padding: 12px 14px; border-radius: 14px; display: flex; gap: 10px; align-items: center; font-weight: 700; font-size: 14px; border: 2px dashed var(--line); color: var(--mute); }
        .duo-status.ok { border: 2px solid var(--grn); color: var(--ink); background: color-mix(in srgb,var(--grn) 12%,transparent); }
        .duo-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--line); flex: none; }
        .duo-status.ok .duo-dot { background: var(--grn); }
        
        .duo-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 14px; background: var(--gray); margin: 16px 16px 12px; }
        .duo-seg button { all: unset; box-sizing: border-box; padding: 8px; border-radius: 10px; text-align: center; font-weight: 800; color: var(--mute); cursor: pointer; }
        .duo-seg button[aria-selected=true] { background: var(--card); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.15); }
        
        .duo-body { flex: 1; overflow-y: auto; padding: 0 16px 24px; }
        
        .duo-panel { border: 2px solid var(--line); border-radius: 20px; padding: 14px 12px; background: var(--card); }
        .duo-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px 4px; text-align: center; }
        .duo-h { font-size: 12px; font-weight: 800; color: var(--mute); }
        .duo-c { justify-self: center; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 13px; font-weight: 800; border: 3px solid transparent; background: var(--gray); }
        .duo-c.e { color: var(--mute); } .duo-c.done { background: var(--org); } .duo-c.frozen { background: var(--ice); }
        .duo-c.today { border-color: var(--org); } .duo-c.done.today, .duo-c.frozen.today { border-color: transparent; }
        .duo-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: 800; }
        .duo-nav button { all: unset; cursor: pointer; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; background: var(--gray); }
        
        .duo-fz { margin-top: 12px; padding: 14px; border-radius: 16px; background: var(--iceL); border: 2px solid var(--ice); }
        .duo-fz .t { display: flex; justify-content: space-between; align-items: center; font-weight: 900; }
        .duo-fz .t span { color: var(--ice); display: flex; gap: 4px; align-items: center; }
        .duo-fz p { margin: 6px 0 0; font-size: 13px; font-weight: 700; color: var(--mute); }
        .meter { height: 10px; border-radius: 99px; background: var(--gray); overflow: hidden; margin: 8px 0 2px; }
        .meter i { display: block; height: 100%; border-radius: inherit; background: var(--grn); transition: width .5s; }
        .duo-fz .meter i { background: var(--ice); }
        
        .duo-tier { margin-top: 12px; padding: 14px; border-radius: 16px; border: 2px solid var(--line); background: var(--card); }
        .duo-tier .t { font-weight: 900; font-size: 17px; }
        .duo-tier .chips { display: flex; justify-content: space-between; margin: 10px 0 4px; }
        .duo-tier .chip { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; font-weight: 800; color: var(--mute); }
        .duo-tier p { margin: 6px 0 0; font-size: 13px; font-weight: 700; color: var(--mute); }
        
        .duo-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; text-align: center; }
        .duo-stat { border: 2px solid var(--line); border-radius: 14px; padding: 10px 4px; background: var(--card); }
        .duo-stat b { display: block; font-size: 22px; font-weight: 900; } .duo-stat span { font-size: 12px; font-weight: 700; color: var(--mute); }
        
        .goal { margin: 0 0 4px; font-weight: 800; font-size: 15px; } .sub { font-size: 13px; font-weight: 700; color: var(--mute); margin: 0 0 10px; }
        .duo-row { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 14px; border: 2px solid transparent; }
        .duo-row.me { background: var(--orgL); border-color: var(--org); }
        .rk { width: 26px; text-align: center; font-weight: 900; color: var(--mute); } .rk.m1 { color: #E6AD00; } .rk.m2 { color: #9AA5AD; } .rk.m3 { color: #C77B3B; }
        .av { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 900; flex: none; position: relative; }
        .av::after { content: ""; position: absolute; right: -2px; bottom: -2px; width: 12px; height: 12px; border-radius: 50%; background: var(--line); border: 2px solid var(--card); }
        .duo-row.on .av::after { background: var(--grn); }
        .who { flex: 1; min-width: 0; } .who b { display: block; font-size: 15px; } .who span { font-size: 12px; font-weight: 700; color: var(--mute); } .duo-row.on .who span { color: var(--grn); }
        .val { font-weight: 900; color: var(--org); display: flex; align-items: center; justify-content: flex-end; gap: 2px; font-size: 17px; }
        .nudge { all: unset; cursor: pointer; padding: 6px 10px; border-radius: 10px; font-size: 12px; font-weight: 800; color: var(--ice); border: 2px solid var(--line); margin-left: auto; }
        .nudge[disabled] { color: var(--mute); cursor: default; }
      `}</style>

      <div className="duo-modal" onClick={e => e.stopPropagation()}>
        <button className="duo-close" onClick={onClose}>✕</button>
        <div className="duo-hero" style={{ '--tc': T.tc }}>
          <svg className={`duo-flame ${ok ? '' : 'off'}`} viewBox="0 0 64 64" aria-hidden="true" style={{ width: T.size, height: T.size, filter: (ok && T.glow) ? `drop-shadow(0 0 ${T.glow}px ${T.tc})` : '' }}>
            <defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={T.a}/><stop offset="1" stopColor={T.b}/></linearGradient></defs>
            <path fill="url(#g)" d="M33 3c1 11 15 18 15 34a16 16 0 0 1-32 0c0-9 4-14 9-18 0 7 3 10 6 10-2-9-1-18 2-26z"/>
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

        <div className="duo-seg" role="tablist">
          <button role="tab" aria-selected={view === 'me'} onClick={() => setView('me')}>Của tôi</button>
          <button role="tab" aria-selected={view === 'rank'} onClick={() => setView('rank')}>Bảng xếp hạng</button>
        </div>

        <div className="duo-body">
          {view === 'me' ? (
            <>
              <div className="duo-seg" style={{marginTop: 0, marginInline: 0}}>
                <button aria-selected={span === 'week'} onClick={() => setSpan('week')}>Tuần</button>
                <button aria-selected={span === 'month'} onClick={() => setSpan('month')}>Tháng</button>
              </div>
              <div className="duo-panel">
                {renderCalendar()}
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
              {renderTierCard()}
              <div className="duo-stats">
                <div className="duo-stat"><b>{leaderboard?.currentUser?.rank || '-'}</b><span>Thứ hạng</span></div>
                <div className="duo-stat"><b>{bestStreak()}</b><span>Kỷ lục</span></div>
                <div className="duo-stat"><b>{S.done.length}</b><span>Tổng ngày</span></div>
              </div>
            </>
          ) : (
            renderRank()
          )}
        </div>
      </div>
    </div>
  );
}
