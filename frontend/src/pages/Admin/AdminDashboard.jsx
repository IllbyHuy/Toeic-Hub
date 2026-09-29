import { useState, useEffect } from 'react';
import { Shield, Trash2, CheckCircle, AlertTriangle, Users, FileText } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatTimeAgo } from '../../utils/formatDate';

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ users: 0, posts: 0, groups: 0 });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user.role !== 'ADMIN') return;
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data || []);
    } catch (error) {
      console.error('Failed to fetch reports');
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/reports/${id}`, { status: 'RESOLVED' });
      setReports(reports.filter(r => r.id !== id));
      toast.success('Đã xử lý báo cáo');
    } catch (error) {
      toast.error('Lỗi khi xử lý báo cáo');
    }
  };

  const handleDismiss = async (id) => {
    try {
      await api.patch(`/reports/${id}`, { status: 'DISMISSED' });
      setReports(reports.filter(r => r.id !== id));
      toast.success('Đã bỏ qua báo cáo');
    } catch (error) {
      toast.error('Lỗi khi bỏ qua báo cáo');
    }
  };

  if (user.role !== 'ADMIN') {
    return (
      <div className="text-center py-20 text-slate-500">
        <Shield size={64} className="mx-auto mb-4 opacity-20" />
        <h2 className="text-2xl font-bold mb-2">Truy cập bị từ chối</h2>
        <p>Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Shield size={32} className="text-red-500" />
        <div>
          <h1 className="text-3xl font-black text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500">Quản lý nội dung và xử lý báo cáo</p>
        </div>
      </div>

      {/* Reports */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          Báo cáo chờ xử lý ({reports.length})
        </h2>

        {reports.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-400">
            <CheckCircle size={48} className="mx-auto mb-3 opacity-20" />
            <p>Không có báo cáo nào cần xử lý. Tuyệt vời!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="glass-card rounded-2xl p-5 border-l-4 border-l-amber-400">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{report.targetType}</span>
                      <span className="text-xs text-slate-500">{formatTimeAgo(report.createdAt)}</span>
                    </div>
                    <p className="text-slate-800 font-medium mb-1">Lý do: {report.reason}</p>
                    <p className="text-xs text-slate-500">Người báo cáo: {report.reporter?.fullName || 'Ẩn danh'}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleResolve(report.id)} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors">
                      Xử lý
                    </button>
                    <button onClick={() => handleDismiss(report.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors">
                      Bỏ qua
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
