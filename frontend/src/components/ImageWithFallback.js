import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

const ImageWithFallback = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc = null,
  showPlaceholder = true,
  onError = null,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = (e) => {
    console.warn(`Failed to load image: ${src}`);
    setImageError(true);
    setIsLoading(false);
    
    if (onError) {
      onError(e);
    }
    
    // Try fallback image if provided
    if (fallbackSrc && e.target.src !== fallbackSrc) {
      e.target.src = fallbackSrc;
      setImageError(false);
      return;
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  // If image failed and no fallback, show placeholder
  if (imageError && showPlaceholder) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        {...props}
      >
        <div className="text-center">
          <ImageIcon size={24} className="mx-auto mb-1" />
          <span className="text-xs">No Image</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div 
          className={`absolute inset-0 flex items-center justify-center bg-gray-100 ${className}`}
        >
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        {...props}
      />
    </div>
  );
};

export default ImageWithFallback; 