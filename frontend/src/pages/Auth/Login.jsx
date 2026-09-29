import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import gsap from 'gsap';
import api from '../../services/api';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const cardRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/feed');
      return;
    }
    gsap.fromTo(cardRef.current, 
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }
    );
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password, rememberMe });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/feed');
      toast.success('Đăng nhập thành công!');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi đăng nhập');
      gsap.fromTo(cardRef.current, 
        { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, {x: 0}) }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <section ref={cardRef}>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Đăng nhập</h1>
        <p className="mt-2 text-[15px] text-gray-500">Chào mừng bạn trở lại. Tiếp tục lộ trình học của bạn.</p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email hoặc tài khoản</label>
            <input 
              type="email" 
              required 
              className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-400"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
              <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Quên mật khẩu?</Link>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-400 pr-12"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 transition-colors hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-600">
            <input 
              type="checkbox" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
            /> Duy trì đăng nhập 30 ngày
          </label>
          <button 
            type="submit" 
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-[15px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="relative my-6 flex items-center">
          <span className="h-px flex-1 bg-gray-200"></span>
          <span className="px-3 text-xs text-gray-400">Hoặc đăng nhập bằng</span>
          <span className="h-px flex-1 bg-gray-200"></span>
        </div>
        
        <button type="button" onClick={() => window.location.href = 'http://localhost:5000/api/v1/auth/google'} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Tiếp tục với Google
        </button>
        
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => toast('Chưa hỗ trợ!')} className="flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"/></svg>
            Facebook
          </button>
          <button type="button" onClick={() => window.location.href = 'http://localhost:5000/api/v1/auth/github'} className="flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#111827"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>
            GitHub
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Chưa có tài khoản? <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">Tạo tài khoản mới</Link>
        </p>
      </section>
    </AuthLayout>
  );
};

export default Login;
