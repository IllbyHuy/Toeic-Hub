import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/PostCard';
import { Loader2, ArrowLeft } from 'lucide-react';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/posts/${id}`);
        setPost(res.data || res);
      } catch (err) {
        setError('Không tìm thấy bài viết hoặc bài viết đã bị xóa.');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center p-20 text-red-500 font-bold bg-red-50 rounded-2xl max-w-2xl mx-auto">
        {error}
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 block mx-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-4 font-semibold px-4 py-2 bg-white rounded-xl shadow-sm w-fit"
      >
        <ArrowLeft size={18} /> Quay lại
      </button>
      
      <PostCard post={post} />
    </div>
  );
};

export default PostDetail;
