import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  SparklesIcon, 
  ArrowDownTrayIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

// Components
import { PromptInput } from '@/components/PromptInput';
import { ImageGallery } from '@/components/ImageGallery';
import { RegenerateModal } from '@/components/RegenerateModal';
import { ApiKeyStatus } from '@/components/ApiKeyStatus';
import { BatchProgress } from '@/components/BatchProgress';

// Utils
import { parsePrompts, validatePrompts } from '@/utils/promptParser';
import { batchGenerateImages, regenerateImage } from '@/utils/imageGeneration';
import { exportImagesToZip, validateExport, estimateZipSize } from '@/utils/zipExport';
import { getApiKeysStats } from '@/utils/apiKeyRotation';

// Types
import type { 
  GeneratedImage, 
  UploadedFile, 
  GenerationConfig, 
  BatchGenerationProgress,
  ImagenModel 
} from '@/types';

export function Home() {
  // Input state
  const [textareaValue, setTextareaValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [imagesPerPrompt, setImagesPerPrompt] = useState(1);
  const [selectedModel, setSelectedModel] = useState<ImagenModel>('imagen-3.0-generate-002');
  
  // Generation state
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchGenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
  });
  
  // Modal state
  const [regenerateModal, setRegenerateModal] = useState<{
    isOpen: boolean;
    imageId: string;
    currentPrompt: string;
    currentModel: ImagenModel;
  }>({
    isOpen: false,
    imageId: '',
    currentPrompt: '',
    currentModel: 'imagen-3.0-generate-002',
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Handle batch generation
  const handleGenerate = useCallback(async () => {
    try {
      // Check API keys availability for image service
      const keyStats = getApiKeysStats();
      if (keyStats.image.availableKeys === 0) {
        toast.error('No available API keys for image generation. All keys have reached their daily limit.');
        return;
      }
      
      // Parse and validate prompts
      const parsedPrompts = await parsePrompts(textareaValue, uploadedFile || undefined);
      const { valid: validPrompts, invalid: invalidPrompts } = validatePrompts(parsedPrompts.prompts);
      
      if (invalidPrompts.length > 0) {
        toast.warning(`${invalidPrompts.length} invalid prompts were skipped`);
      }
      
      if (validPrompts.length === 0) {
        toast.error('No valid prompts found');
        return;
      }
      
      // Calculate total images to generate
      const totalImages = validPrompts.length * imagesPerPrompt;
      
      // Warn if generating many images
      if (totalImages > 20) {
        const confirm = window.confirm(
          `You're about to generate ${totalImages} images. This may take a long time and use significant API quota. Continue?`
        );
        if (!confirm) return;
      }
      
      // Initialize generation state
      setIsGenerating(true);
      setBatchProgress({
        total: totalImages,
        completed: 0,
        failed: 0,
      });
      
      // Clear previous results
      setImages([]);
      
      const config: GenerationConfig = {
        imagesPerPrompt,
        concurrentRequests: 5,
        model: selectedModel,
      };
      
      // Start generation with progress tracking
      const results = await batchGenerateImages(
        validPrompts,
        config,
        (progress) => {
          setBatchProgress(progress);
        }
      );
      
      // Update images state
      setImages(results);
      
      // Show completion toast
      const successful = results.filter(img => img.status === 'success').length;
      const failed = results.filter(img => img.status === 'error').length;
      
      if (successful > 0) {
        toast.success(`Generated ${successful} images successfully!`);
      }
      
      if (failed > 0) {
        toast.warning(`${failed} images failed to generate`);
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [textareaValue, uploadedFile, imagesPerPrompt, selectedModel]);

  // Handle single image regeneration
  const handleRegenerateImage = useCallback((imageId: string, currentPrompt: string) => {
    setRegenerateModal({
      isOpen: true,
      imageId,
      currentPrompt,
      currentModel: selectedModel, // Use current selected model
    });
  }, [selectedModel]);

  // Handle regenerate modal submit
  const handleRegenerateSubmit = useCallback(async (newPrompt: string, model?: ImagenModel) => {
    const { imageId } = regenerateModal;
    const originalImage = images.find(img => img.id === imageId);
    
    if (!originalImage) {
      toast.error('Original image not found');
      return;
    }
    
    setIsRegenerating(true);
    
    try {
      const useModel = model || selectedModel;
      const newImage = await regenerateImage(imageId, newPrompt, originalImage, useModel);
      
      // Replace the original image with the new one
      setImages(prev => prev.map(img => 
        img.id === imageId ? newImage : img
      ));
      
      if (newImage.status === 'success') {
        toast.success('Image regenerated successfully!');
      } else {
        toast.error(`Regeneration failed: ${newImage.error}`);
      }
      
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error(`Regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegenerating(false);
    }
  }, [regenerateModal, images, selectedModel]);

  // Handle export all images
  const handleExportAll = useCallback(async () => {
    const validation = validateExport(images);
    
    if (!validation.canExport) {
      toast.error('No images available for export');
      return;
    }
    
    if (validation.issues.length > 0) {
      const issuesText = validation.issues.join('\n');
      const confirm = window.confirm(`Export Issues:\n\n${issuesText}\n\nContinue with export?`);
      if (!confirm) return;
    }
    
    setIsExporting(true);
    
    try {
      const { estimatedSizeMB } = estimateZipSize(images);
      
      await exportImagesToZip(
        images,
        `batch_generated_images_${new Date().toISOString().split('T')[0]}.zip`,
        (current, total) => {
          // Could add export progress here if needed
          console.log(`Exporting: ${current}/${total}`);
        }
      );
      
      toast.success(`Successfully exported ${validation.successfulCount} images (~${estimatedSizeMB}MB)`);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [images]);

  // Calculate stats for display
  const stats = {
    total: images.length,
    successful: images.filter(img => img.status === 'success').length,
    failed: images.filter(img => img.status === 'error').length,
    generating: images.filter(img => img.status === 'generating').length,
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <SparklesIcon className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Batch Image Generator
                </h1>
                <p className="text-sm text-gray-600">
                  Generate multiple images from prompts using Google Gemini API
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
                {stats.total > 0 && (
                  <>
                    <span>Total: {stats.total}</span>
                    <span className="text-green-600">✓ {stats.successful}</span>
                    {stats.failed > 0 && <span className="text-red-600">✗ {stats.failed}</span>}
                  </>
                )}
              </div>
              
              <button
                onClick={handleExportAll}
                disabled={stats.successful === 0 || isExporting}
                className="btn-secondary text-sm"
                title="Download all successful images as ZIP"
              >
                {isExporting ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Export All ({stats.successful})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* API Key Status */}
            <ApiKeyStatus service="image" />
            
            {/* Generation Info */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-gray-900">Generation Info</h3>
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Rate Limit:</span>
                  <span>10/min, 70/day per key</span>
                </div>
                <div className="flex justify-between">
                  <span>Concurrent:</span>
                  <span>5 requests max</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto Retry:</span>
                  <span>3 attempts</span>
                </div>
                <div className="flex justify-between">
                  <span>Key Rotation:</span>
                  <span>Automatic</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Input Section */}
            <div className="card p-6">
              <PromptInput
                textareaValue={textareaValue}
                onTextareaChange={setTextareaValue}
                uploadedFile={uploadedFile}
                onFileUpload={setUploadedFile}
                imagesPerPrompt={imagesPerPrompt}
                onImagesPerPromptChange={setImagesPerPrompt}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                disabled={isGenerating}
              />
              
              {/* Generate Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!textareaValue.trim() && !uploadedFile)}
                  className="btn-primary w-full py-3 text-base"
                >
                  {isGenerating ? (
                    <>
                      <div className="loading-spinner w-5 h-5 mr-2" />
                      Generating Images...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5 mr-2" />
                      Generate Images
                    </>
                  )}
                </button>
                
                {!textareaValue.trim() && !uploadedFile && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Enter prompts or upload a file to get started
                  </p>
                )}
              </div>
            </div>

            {/* Batch Progress */}
            <BatchProgress 
              progress={batchProgress} 
              isVisible={isGenerating || batchProgress.total > 0} 
            />

            {/* Image Gallery */}
            <ImageGallery
              images={images}
              onRegenerateImage={handleRegenerateImage}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      </main>

      {/* Regenerate Modal */}
      <RegenerateModal
        isOpen={regenerateModal.isOpen}
        onClose={() => setRegenerateModal(prev => ({ ...prev, isOpen: false }))}
        currentPrompt={regenerateModal.currentPrompt}
        currentModel={regenerateModal.currentModel}
        onRegenerate={handleRegenerateSubmit}
        isLoading={isRegenerating}
      />
    </div>
  );
}
