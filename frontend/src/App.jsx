import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Bell, CheckCircle } from 'lucide-react';
import api from './services/api';
import { useSocket } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VerifyEmail from './pages/Auth/VerifyEmail';
import OAuthSuccess from './pages/Auth/OAuthSuccess';
import Vocabulary from './pages/Vocabulary';
import Tips from './pages/Tips';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Dictionary from './pages/Dictionary';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Messages from './pages/Messages';
import ForgotPassword from './pages/Auth/ForgotPassword';
import FloatingChatButton from './components/FloatingChatButton';
import StudySession from './pages/StudySession';
import PostDetail from './pages/PostDetail';
import TipDetail from './pages/TipDetail';
import ClickSpark from './components/ClickSpark';
import NotificationDropdown from './components/NotificationDropdown';
import StrokeText from './components/StrokeText';
import Footer from './components/Footer';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showNotifications && notifications.some(n => !n.isRead)) {
      handleMarkAsRead();
    }
  }, [showNotifications]);

  useEffect(() => {
    if (socket && user?.id) {
      // Join personal room to receive personal messages and notifications
      socket.emit('join_group', user.id);

      socket.on('new_notification', (notification) => {
        toast(notification.content, {
          icon: '🔔',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
        setNotifications(prev => [notification, ...prev]);
      });

      socket.on('new_direct_message', (msg) => {
        // Only toast if it's from someone else
        if (msg.senderId !== user.id) {
          toast.success(`Tin nhắn mới: ${msg.content}`, {
            icon: '💬',
            duration: 4000,
          });
        }
      });
    }
    return () => {
      if (socket) {
        socket.off('new_notification');
        socket.off('new_direct_message');
      }
    };
  }, [socket]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  
  const authPaths = ['/login', '/register', '/forgot-password', '/verify-email', '/reset-password'];
  const isAuthPage = authPaths.some(path => location.pathname.startsWith(path));
  const isLandingPage = location.pathname === '/';
  const hideHeaderFooter = isAuthPage; // Only hide on auth pages, NOT landing page

  return (
    <ClickSpark sparkColor='#3b82f6' sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
      <div className={`min-h-screen font-sans relative z-10 flex flex-col ${isAuthPage ? 'bg-white' : ''}`} style={{ background: hideHeaderFooter ? '#ffffff' : '#f8fafc' }}>
        <Toaster position="bottom-right" />
        {/* Header */}
        {!hideHeaderFooter && (
        <header className="sticky top-0 z-50 bg-bg-sec border-b border-border transition-all">
          <div className="max-w-[1180px] mx-auto px-5 sm:px-10 h-[68px] flex items-center justify-between relative z-20">
            <Link to="/" className="flex items-center gap-1.5 cursor-pointer group">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="transition-transform group-hover:scale-105">
                <rect width="32" height="32" rx="10" fill="#111827" />
                <path d="M11 11c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2h-.5v6.5c0 1.1-.9 2-2 2h-1c-1.1 0-2-.9-2-2V14h-.5c-1.1 0-2-.9-2-2v-1z" fill="white" />
                <circle cx="26" cy="6" r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2"/>
              </svg>
              <div className="flex items-baseline mt-1 tracking-tight">
                <span className="font-bold text-[19px] text-gray-900">toeic</span>
                <span className="font-bold text-[22px] text-indigo-500 mx-[1px]">.</span>
                <span className="font-bold text-[19px] text-indigo-500">hub</span>
              </div>
            </Link>
            <nav className="flex items-center gap-6 text-[12px] font-mono uppercase ml-4">
              <Link to="/feed" className={`transition-colors ${isActive('/feed') ? 'text-accent' : 'text-text-sec hover:text-text-main'}`}>Bảng tin</Link>
              
              {token ? (
                <>
                  <Link to="/vocabulary" className={`hidden sm:block transition-colors ${isActive('/vocabulary') ? 'text-accent' : 'text-text-sec hover:text-text-main'}`}>Từ vựng</Link>
                  <Link to="/tips" className={`hidden md:block transition-colors ${isActive('/tips') ? 'text-accent' : 'text-text-sec hover:text-text-main'}`}>Tips</Link>
                  <Link to="/groups" className={`hidden lg:block transition-colors ${isActive('/groups') ? 'text-accent' : 'text-text-sec hover:text-text-main'}`}>Cộng đồng</Link>
                
                <div className="flex items-center gap-2 sm:gap-3 border-l border-border pl-2 sm:pl-4 ml-1 sm:ml-2">
                  <div className="relative" ref={notificationRef}>
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 rounded hover:bg-bg-main transition-colors text-text-sec"
                    >
                      <Bell size={20} />
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-bg-sec"></span>
                        </span>
                      )}
                    </button>
                    
                    {showNotifications && (
                      <NotificationDropdown 
                        notifications={notifications}
                        setNotifications={setNotifications}
                        handleMarkAsRead={handleMarkAsRead}
                        setShowNotifications={setShowNotifications}
                      />
                    )}
                  </div>

                  <Link to={`/users/${user?.id}`} className="flex items-center gap-2 font-mono uppercase text-text-main hover:bg-bg-main px-3 py-1.5 rounded transition-colors cursor-pointer text-[12px]">
                    <div className="relative">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <span className="text-lg leading-none">👋</span>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-bg-sec bg-green-500"></div>
                    </div>
                    {user?.fullName?.split(' ').pop()}
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="text-[10px] font-mono bg-red-500 text-white px-2 py-1 rounded">ADMIN</Link>
                  )}
                  {isLandingPage ? (
                    <Link to="/feed" className="bg-[#4361ee] text-white text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-md hover:bg-blue-700 transition-colors shadow-sm ml-2">
                      VÀO BẢNG TIN ↗
                    </Link>
                  ) : (
                    <button 
                      onClick={handleLogout}
                      className="font-mono text-[11px] uppercase text-text-sec hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded transition-all duration-300"
                    >
                      Đăng xuất
                    </button>
                  )}
                </div>
              </>
            ) : (
                <div className="flex items-center gap-3 ml-4">
                  <Link to="/login" className="text-[11px] font-bold uppercase text-text-sec hover:text-text-main transition-colors hidden sm:block">Đăng nhập</Link>
                  <Link to="/register" className="bg-[#4361ee] text-white text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-md hover:bg-blue-700 transition-colors shadow-sm ml-2">
                    THỬ TOEICHUB ↗
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </header>
      )}

      {/* Content */}
      <main className={`flex-1 w-full relative z-10 ${hideHeaderFooter ? '' : 'max-w-7xl mx-auto px-4 py-8'}`}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<Home />} />
          <Route path="/users/:id" element={<PublicProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/oauth-success" element={<OAuthSuccess />} />
          <Route path="/messages/:id" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/dictionary" element={<ProtectedRoute><Dictionary /></ProtectedRoute>} />
          <Route path="/vocabulary" element={<ProtectedRoute><Vocabulary /></ProtectedRoute>} />
          <Route path="/vocabulary/study" element={<ProtectedRoute><StudySession /></ProtectedRoute>} />
          <Route path="/tips" element={<ProtectedRoute><Tips /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/tips/:id" element={<TipDetail />} />
        </Routes>
      </main>
      <div className="relative z-20">
        <FloatingChatButton />
      </div>
      {!hideHeaderFooter && <Footer />}
    </div>
    </ClickSpark>
  );
}

export default App;
