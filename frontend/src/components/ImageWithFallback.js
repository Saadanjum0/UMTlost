import React, { useState } from 'react';
import { Package } from 'lucide-react';

const ImageWithFallback = ({ src, alt, className, fallbackIcon: FallbackIcon = Package }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  if (!src || imageError) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <FallbackIcon className="text-gray-400" size={48} />
      </div>
    );
  }

  return (
    <div className="relative">
      {imageLoading && (
        <div className={`${className} bg-gray-100 flex items-center justify-center absolute inset-0`}>
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ display: imageLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

export default ImageWithFallback; 