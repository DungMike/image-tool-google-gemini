import { useState, useCallback } from 'react';
import { 
  ArrowDownTrayIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import type { GeneratedImage } from '@/types';
import { downloadImage } from '@/utils/imageGeneration';
import { toast } from 'react-toastify';

interface ImageGalleryProps {
  images: GeneratedImage[];
  onRegenerateImage: (imageId: string, currentPrompt: string) => void;
  isGenerating?: boolean;
}

interface ImageCardProps {
  image: GeneratedImage;
  onRegenerate: (imageId: string, currentPrompt: string) => void;
}

// Component cho từng image card
function ImageCard({ image, onRegenerate }: ImageCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  // Handle download image
  const handleDownload = useCallback(async () => {
    if (image.status !== 'success' || !image.imageUrl) return;
    
    setIsDownloading(true);
    try {
      const filename = `generated_${image.id}.jpg`;
      await downloadImage(image.imageUrl, filename);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  }, [image]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    onRegenerate(image.id, image.prompt);
  }, [image.id, image.prompt, onRegenerate]);

  // Truncate prompt for display
  const truncatedPrompt = image.prompt.length > 100 
    ? `${image.prompt.substring(0, 100)}...` 
    : image.prompt;

  return (
    <div className="card overflow-hidden">
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100">
        {image.status === 'generating' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="loading-spinner w-8 h-8 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Generating...</p>
            </div>
          </div>
        )}

        {image.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50">
            <div className="text-center p-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 mb-1">Generation failed</p>
              <p className="text-xs text-red-500">{image.error}</p>
            </div>
          </div>
        )}

        {image.status === 'success' && image.imageUrl && (
          <>
            {!isImageLoaded && !isImageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="loading-spinner w-6 h-6" />
              </div>
            )}
            
            <img
              src={image.imageUrl}
              alt={image.prompt}
              className={`
                w-full h-full object-cover transition-opacity duration-300
                ${isImageLoaded ? 'opacity-100 image-fade-in' : 'opacity-0'}
              `}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setIsImageError(true)}
            />
            
            {isImageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center p-4">
                  <ExclamationTriangleIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Failed to load image</p>
                </div>
              </div>
            )}

            {/* Image Overlay Actions */}
            {isImageLoaded && (
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => window.open(image.imageUrl, '_blank')}
                    className="p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors duration-200"
                    title="View full size"
                  >
                    <EyeIcon className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Prompt */}
        <div className="mb-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {showFullPrompt ? image.prompt : truncatedPrompt}
          </p>
          {image.prompt.length > 100 && (
            <button
              onClick={() => setShowFullPrompt(!showFullPrompt)}
              className="text-xs text-primary-600 hover:text-primary-700 mt-1"
            >
              {showFullPrompt ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <ClockIcon className="w-3 h-3" />
          <span>{new Date(image.timestamp).toLocaleString()}</span>
          {image.originalPrompt !== image.prompt && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
              Regenerated
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={image.status !== 'success' || isDownloading}
            className="btn-primary flex-1 text-xs"
            title="Download image"
          >
            {isDownloading ? (
              <>
                <div className="loading-spinner w-3 h-3 mr-1" />
                Downloading...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-3 h-3 mr-1" />
                Download
              </>
            )}
          </button>

          <button
            onClick={handleRegenerate}
            disabled={image.status === 'generating'}
            className="btn-secondary text-xs"
            title="Regenerate with new prompt"
          >
            <ArrowPathIcon className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Main ImageGallery component
export function ImageGallery({ images, onRegenerateImage, isGenerating = false }: ImageGalleryProps) {
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'generating'>('all');

  // Filter images based on selected filter
  const filteredImages = images.filter(image => {
    if (filter === 'all') return true;
    return image.status === filter;
  });

  // Get statistics
  const stats = {
    total: images.length,
    success: images.filter(img => img.status === 'success').length,
    error: images.filter(img => img.status === 'error').length,
    generating: images.filter(img => img.status === 'generating').length,
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <EyeIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No images yet</h3>
        <p className="text-gray-500">
          Enter some prompts and click "Generate Images" to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Generated Images</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span>Total: {stats.total}</span>
            <span className="text-green-600">Success: {stats.success}</span>
            {stats.error > 0 && <span className="text-red-600">Failed: {stats.error}</span>}
            {stats.generating > 0 && <span className="text-blue-600">Generating: {stats.generating}</span>}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'success', label: 'Success', count: stats.success },
            { key: 'error', label: 'Failed', count: stats.error },
            { key: 'generating', label: 'Generating', count: stats.generating },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              disabled={count === 0}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200
                ${filter === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Generation Status */}
      {isGenerating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="loading-spinner w-5 h-5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Generating images...</p>
              <p className="text-xs text-blue-700">
                This may take a few minutes. Images will appear as they're completed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onRegenerate={onRegenerateImage}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No images match the current filter.</p>
        </div>
      )}
    </div>
  );
}
