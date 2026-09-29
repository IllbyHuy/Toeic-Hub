import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const ImageModal = ({ src, alt, onClose }) => {
  useEffect(() => {
    // Prevent scrolling on body when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!src) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all z-50"
      >
        <X size={24} />
      </button>
      <img 
        src={src} 
        alt={alt || 'Phóng to ảnh'} 
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
};

export default ImageModal;
