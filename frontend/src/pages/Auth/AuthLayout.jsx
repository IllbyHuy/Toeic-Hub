import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr] bg-white font-sans text-gray-900">
      {/* Left Column */}
      <aside className="relative hidden overflow-hidden lg:block bg-gray-900">
        <img 
          src="/auth-bg.png" 
          alt="Toeic-Hub Background" 
          className="absolute inset-0 h-full w-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-white text-lg font-extrabold text-gray-900">
              T<span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            <span className="text-xl font-bold tracking-tight text-white">toeic.<span className="text-indigo-300">hub</span></span>
          </Link>
          <div className="max-w-md pb-6">
            <p className="text-4xl font-bold leading-tight tracking-tight text-white">Một mục tiêu nhỏ.<br/>Cả bầu trời cơ hội.</p>
            <p className="mt-4 text-base leading-relaxed text-white/80">Đề thi, từ vựng và tiến trình học trong một không gian duy nhất.</p>
          </div>
        </div>
      </aside>

      {/* Right Column */}
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
            <span aria-hidden="true">←</span> Quay lại trang chủ
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 lg:hidden">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-gray-900 text-lg font-extrabold text-white">
              T<span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            <span className="text-xl font-bold tracking-tight text-gray-900">toeic.<span className="text-indigo-600">hub</span></span>
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
