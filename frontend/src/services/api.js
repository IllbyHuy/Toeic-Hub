import axios from 'axios';

// Tạo một instance của axios với cấu hình mặc định
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 30000, // Tăng lên 30s vì gọi AI khá lâu
});

// Middleware (Interceptor) chạy TRƯỚC KHI request được gửi đi
api.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (sau này lúc Login xong mình sẽ lưu vào đây)
    const token = localStorage.getItem('token');
    
    // Nếu có token thì tự động nhét vào Header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Middleware chạy TRƯỚC KHI nhận response về
api.interceptors.response.use(
  (response) => {
    // Trả về data luôn cho gọn, đỡ phải .data.data
    return response.data;
  },
  (error) => {
    // Xử lý lỗi tập trung ở đây (ví dụ: token hết hạn -> văng ra login)
    if (error.response && error.response.status === 401) {
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
