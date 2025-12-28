import React, { useEffect, useState } from 'react';
import { generateDownloadUrl } from '../api/storage';

interface S3ImageProps {
  path: string;
  alt: string;
  className?: string;
}

export const S3Image: React.FC<S3ImageProps> = ({ path, alt, className = '' }) => {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPresignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = await generateDownloadUrl(path);
        setPresignedUrl(url);
      } catch (err) {
        console.error('Failed to generate presigned URL for image:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPresignedUrl();
  }, [path]);

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
        style={{ minHeight: '200px' }}
      >
        <div className="text-center text-gray-500">
          <div className="inline-block animate-spin text-2xl mb-2">⟳</div>
          <div className="text-sm">Loading image...</div>
        </div>
      </div>
    );
  }

  if (error || !presignedUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 border border-red-200 rounded ${className}`}
        style={{ minHeight: '150px' }}
      >
        <div className="text-center text-red-600">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm">Failed to load image</div>
          {error && <div className="text-xs mt-1 text-gray-600">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <img
      src={presignedUrl}
      alt={alt}
      className={className}
      onError={() => {
        console.error('Image load error:', path);
        setError('Failed to display image');
      }}
    />
  );
};
