import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import gsap from 'gsap';
import StrokeText from '../../components/StrokeText';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Enter Email, 2: Enter OTP & New Password
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/feed');
      return;
    }
    gsap.fromTo(cardRef.current, 
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }
    );
  }, [step, navigate]); // re-animate on step change

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) {
      toast.error('Vui lòng nhập email');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Đã gửi mã OTP khôi phục vào email');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
      gsap.fromTo(cardRef.current, { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, {x: 0}) });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      toast.error('Vui lòng nhập đủ 6 số OTP');
      gsap.fromTo(cardRef.current, { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, {x: 0}) });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp');
      gsap.fromTo(cardRef.current, { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, {x: 0}) });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp: otpString, newPassword });
      toast.success('Khôi phục mật khẩu thành công! Vui lòng đăng nhập lại.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
      gsap.fromTo(cardRef.current, { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, {x: 0}) });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col items-center justify-center p-4 overflow-y-auto selection:bg-blue-100">
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium transition-colors">
        <ArrowLeft size={20} /> Quay lại trang chủ
      </Link>
      
      <div className="mb-8 mt-12 sm:mt-0">
        <StrokeText 
          text="Toeic-Hub" 
          className="text-4xl" 
          strokeWidth="1.5px" 
          strokeColor="#3b82f6" 
          fillColor="transparent" 
        />
      </div>

      <div ref={cardRef} className="w-full max-w-[420px] bg-white border border-slate-200 rounded-[24px] p-8 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mb-6">
            <ShieldCheck className="text-blue-600 w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            {step === 1 ? 'Khôi phục mật khẩu' : 'Xác thực tài khoản'}
          </h1>
          <p className="text-slate-500 text-sm text-center">
            {step === 1 
              ? 'Nhập email tài khoản của bạn để nhận mã OTP khôi phục.' 
              : `Chúng tôi đã gửi một mã gồm 6 số tới email ${email}`}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Email của bạn</label>
              <input
                type="email"
                required
                className="w-full bg-slate-50 text-slate-900 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 font-medium"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2 shadow-lg shadow-blue-600/20 flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Gửi mã khôi phục'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
            
            <div className="flex justify-between gap-2 mt-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  maxLength={6} // allow paste
                  className="w-12 h-14 bg-slate-50 text-slate-900 text-center text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                />
              ))}
            </div>
            
            <p className="text-xs text-slate-500 -mt-2 font-medium">Bạn có thể dán toàn bộ mã vào ô đầu tiên.</p>

            <div className="space-y-1.5 mt-2">
              <label className="block text-sm font-semibold text-slate-700">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-slate-50 text-slate-900 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 font-medium pr-12"
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="w-full bg-slate-50 text-slate-900 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 font-medium pr-12"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2 flex justify-center items-center shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Xác thực và hoàn tất'}
            </button>

            <div className="flex justify-between items-center mt-2">
              <button type="button" onClick={handleSendOtp} disabled={loading} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Gửi lại mã
              </button>
            </div>
          </form>
        )}

      </div>
      
      <div className="mt-8 text-center pb-8">
        <Link to="/login" className="text-slate-500 hover:text-blue-600 text-sm font-bold transition-colors flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Quay lại đăng nhập
        </Link>
      </div>

    </div>
  );
};

export default ForgotPassword;
