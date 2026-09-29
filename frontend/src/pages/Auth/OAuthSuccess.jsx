import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const OAuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      toast.error('Đăng nhập thất bại!');
      navigate('/login');
      return;
    }

    // Set token to localStorage
    localStorage.setItem('token', token);

    // Fetch user info with the new token
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        localStorage.setItem('user', JSON.stringify(res.data));
        toast.success('Đăng nhập mạng xã hội thành công!');
        navigate('/feed');
      })
      .catch(err => {
        console.error(err);
        toast.error('Lỗi lấy thông tin người dùng.');
        navigate('/login');
      });
  }, [token, navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Đang xác thực tài khoản...</h2>
        <p className="text-gray-500 mt-2">Vui lòng đợi trong giây lát</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
