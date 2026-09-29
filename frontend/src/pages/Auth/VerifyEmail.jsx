import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import gsap from 'gsap';
import AuthLayout from './AuthLayout';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const navigate = useNavigate();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  const cardRef = useRef(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/feed');
      return;
    }
    if (!email) return;

    gsap.fromTo(cardRef.current, 
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }
    );
  }, [email, navigate]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const pastedData = value.slice(0, 6).split('');
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (pastedData[i] && /^\d+$/.test(pastedData[i])) {
          newOtp[i] = pastedData[i];
        }
      }
      setOtp(newOtp);
      const lastIndex = Math.min(pastedData.length, 5);
      if (inputRefs.current[lastIndex]) {
        inputRefs.current[lastIndex].focus();
      }
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Vui lòng nhập đủ 6 số OTP');
      gsap.fromTo(cardRef.current, { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, {x: 0}) });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp: otpCode });
      toast.success('Xác minh thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã OTP không hợp lệ');
      gsap.fromTo(cardRef.current, { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, {x: 0}) });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('Đã gửi lại mã OTP vào email của bạn');
      setOtp(['', '', '', '', '', '']); 
      inputRefs.current[0].focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi lại mã');
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Không tìm thấy email cần xác thực!</h2>
          <button onClick={() => navigate('/register')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm">
            Quay lại Đăng ký
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <section ref={cardRef}>
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mb-6">
            <ShieldCheck className="text-indigo-600 w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Xác thực tài khoản</h1>
          <p className="mt-2 text-[15px] text-gray-500">
            Chúng tôi đã gửi một mã 6 số tới email <br />
            <strong className="text-indigo-600 font-medium">{email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="flex justify-between gap-2 mt-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={el => inputRefs.current[idx] = el}
                type="text"
                maxLength={6}
                className="w-12 h-14 bg-white text-gray-900 text-center text-xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              />
            ))}
          </div>
          
          <p className="text-xs text-gray-500 -mt-2 font-medium text-center">Bạn có thể dán toàn bộ mã vào ô đầu tiên.</p>

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-[15px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 mt-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Xác thực và hoàn tất'}
          </button>

          <div className="flex justify-center items-center mt-2">
            <button 
              type="button" 
              onClick={handleResend}
              disabled={resendLoading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {resendLoading ? <Loader2 className="animate-spin w-4 h-4 inline" /> : 'Gửi lại mã OTP'}
            </button>
          </div>
        </form>
        
        <p className="mt-8 text-center text-sm text-gray-500">
          Chưa có tài khoản? <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">Tạo tài khoản mới</Link>
        </p>
      </section>
    </AuthLayout>
  );
};

export default VerifyEmail;
