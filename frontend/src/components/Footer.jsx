import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MessagesSquare, Sparkles } from 'lucide-react';
import StrokeText from './StrokeText';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 mt-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 group mb-6">
              <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-200 group-hover:scale-105 transition-transform duration-300">
                T
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                toeic.<span className="text-indigo-600">hub</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Nền tảng luyện thi TOEIC thông minh, ứng dụng thuật toán lặp lại ngắt quãng (SRS) giúp bạn nhớ từ vựng lâu hơn và hiệu quả hơn.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-800 mb-4 uppercase tracking-wider text-xs">Học tập</h4>
            <ul className="space-y-3">
              <li><Link to="/vocabulary" className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">3000 Từ vựng TOEIC</Link></li>
              <li><Link to="/tips" className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Ngữ pháp & Mẹo thi</Link></li>
              <li><a href="#" className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Thi thử (Sắp ra mắt)</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-800 mb-4 uppercase tracking-wider text-xs">Cộng đồng</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Bảng tin</Link></li>
              <li><Link to="/groups" className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Nhóm học tập</Link></li>
              <li><Link to="/profile" className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Thành tích cá nhân</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-800 mb-4 uppercase tracking-wider text-xs">Liên hệ</h4>
            <ul className="space-y-3 text-sm text-slate-500 font-medium">
              <li>Email: contact@toeichub.com</li>
              <li>Hotline: 1800 1234</li>
              <li>Giờ làm việc: 8:00 - 22:00</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} Toeic-Hub. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-all">
              <span className="sr-only">Facebook</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
