import { GoogleGenAI } from '@google/genai';
import pLimit from 'p-limit';
import type { GeneratedImage, GenerationConfig, BatchGenerationProgress, ImagenModel, ImagenModelInfo } from '@/types';
import { getNextAvailableApiKey, markApiKeyUsed, calculateWaitTime, getApiKeys } from './apiKeyRotation';
import { formatPromptForGemini } from './promptParser';

const CONCURRENT_REQUESTS = parseInt(import.meta.env.VITE_CONCURRENT_REQUESTS) || 5;

// Available Imagen models với thông tin chi tiết
export const IMAGEN_MODELS: ImagenModelInfo[] = [
  {
    id: 'imagen-3.0-generate-002',
    name: 'Imagen 3.0',
    description: 'Balanced quality and speed, recommended for most use cases',
    speed: 'Standard',
    quality: 'Standard',
    rateLimitPerMinute: 20,
    rateLimitPerDay: 1000,
  },
  {
    id: 'imagen-4.0-generate-001',
    name: 'Imagen 4.0 Standard',
    description: 'Higher quality images with improved prompt adherence',
    speed: 'Standard',
    quality: 'High',
    rateLimitPerMinute: 10,
    rateLimitPerDay: 70,
  },
  {
    id: 'imagen-4.0-ultra-generate-001',
    name: 'Imagen 4.0 Ultra',
    description: 'Highest quality images, slower generation',
    speed: 'Slow',
    quality: 'Ultra',
    rateLimitPerMinute: 5,
    rateLimitPerDay: 30,
  },
  {
    id: 'imagen-4.0-fast-generate-001',
    name: 'Imagen 4.0 Fast',
    description: 'Faster generation with good quality',
    speed: 'Fast',
    quality: 'Standard',
    rateLimitPerMinute: 10,
    rateLimitPerDay: 70,
  },
  {
    id: 'gemini-2.5-flash-image-preview',
    name: 'Gemini 2.5 Flash Image Preview',
    description: 'Native image generation with Gemini 2.5 Flash model',
    speed: 'Fast',
    quality: 'High',
    rateLimitPerMinute: 500,
    rateLimitPerDay: 2000,
  },
  {
    id: 'gemini-2.0-flash-preview-image-generation',
    name: 'Gemini 2.0 Flash Image Generation',
    description: 'Native image generation with Gemini 2.0 Flash model',
    speed: 'Fast',
    quality: 'Standard',
    rateLimitPerMinute: 500,
    rateLimitPerDay: 2000,
  },
];

// Khởi tạo Google GenAI client với API key
function createGenAIClient(apiKey: string) {
  return new GoogleGenAI({
    apiKey,
  });
}

// Retry logic với exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Nếu là lỗi rate limit, đợi lâu hơn
      if (error instanceof Error && error.message.includes('429')) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Nếu là lỗi API key không hợp lệ, không retry
      if (error instanceof Error && (
        error.message.includes('API key') ||
        error.message.includes('401') ||
        error.message.includes('403')
      )) {
        throw error;
      }
      
      // Cho các lỗi khác, đợi và retry
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Generate single image using different APIs based on model
async function generateSingleImage(
  prompt: string,
  keyIndex: number,
  apiKey: string,
  model: ImagenModel = 'imagen-3.0-generate-002',
  aspectRatio?: string
): Promise<string> {
  const genAI = createGenAIClient(apiKey);
  
  try {
    const formattedPrompt = formatPromptForGemini(prompt, aspectRatio);
    
    // Switch between different APIs based on model type
    switch (model) {
      case 'gemini-2.5-flash-image-preview': {
        // Use generateContent API for Gemini models
        const response = await genAI.models.generateContent({
          model,
          contents: formattedPrompt,
        });
        
        // Handle Gemini response structure
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.data) {
                const base64Image = `data:image/png;base64,${part.inlineData.data}`;
                markApiKeyUsed('image', keyIndex, true);
                return base64Image;
              }
            }
          }
        }
        throw new Error('No image data found in Gemini response');
      }
      
      default: {
        // Use generateImages API for Imagen models
        const response = await genAI.models.generateImages({
          model,
          prompt: formattedPrompt,
          config: {
            numberOfImages: 1,
            // Có thể thêm các config khác như:
            aspectRatio: aspectRatio || '16:9',
            // safetyFilterLevel: 'block_some',
            // personGeneration: 'dont_allow'
          },
        });
        
        // Handle Imagen response structure
        if (response.generatedImages && response.generatedImages.length > 0) {
          for (const generatedImage of response.generatedImages) {
            const imageBytes = generatedImage.image?.imageBytes;
            if (!imageBytes) {
              throw new Error('No image bytes generated from API response');
            }
            const base64Image = `data:image/png;base64,${imageBytes}`;
            markApiKeyUsed('image', keyIndex, true);
            return base64Image;
          }
        }
        throw new Error('No images generated from Imagen API response');
      }
    }
    
  } catch (error) {
    console.error(`Error generating image for prompt "${prompt}" with model "${model}":`, error);
    markApiKeyUsed('image', keyIndex, false);
    throw error;
  }
}

// Generate image với automatic key rotation
export async function generateImageWithRotation(
  prompt: string, 
  model: ImagenModel = 'imagen-3.0-generate-002',
  aspectRatio?: string
): Promise<string> {
  const modelInfo = IMAGEN_MODELS.find(m => m.id === model);
  const keyInfo = getNextAvailableApiKey('image', undefined, modelInfo?.rateLimitPerDay);
  
  if (!keyInfo) {
    throw new Error('No available API keys. All keys have reached their daily limit.');
  }
  
  return withRetry(
    () => generateSingleImage(prompt, keyInfo.index, keyInfo.key, model, aspectRatio),
    3,
    1000
  );
}

// Batch generate images với progress tracking
export async function batchGenerateImages(
  prompts: string[],
  config: GenerationConfig,
  onProgress?: (progress: BatchGenerationProgress) => void
): Promise<GeneratedImage[]> {
  // Get model-specific concurrent requests limit
  const modelInfo = IMAGEN_MODELS.find(m => m.id === config.model);
  const keys = getApiKeys();
  const concurrentLimit = (modelInfo?.rateLimitPerMinute || CONCURRENT_REQUESTS) * keys.length;
  console.log("🚀 ~ batchGenerateImages ~ concurrentLimit:", concurrentLimit)
  
  const limit = pLimit(concurrentLimit);
  const results: GeneratedImage[] = [];
  let completed = 0;
  let failed = 0;
  
  // Tạo tasks cho tất cả images cần generate
  const tasks: Array<() => Promise<void>> = [];
  
  prompts.forEach((prompt, promptIndex) => {
    for (let imageIndex = 0; imageIndex < config.imagesPerPrompt; imageIndex++) {
      const imageId = `${promptIndex}-${imageIndex}-${Date.now()}`;
      
      // Khởi tạo image object với status generating
      const imageObj: GeneratedImage = {
        id: imageId,
        prompt,
        originalPrompt: prompt,
        imageUrl: '',
        status: 'generating',
        timestamp: Date.now(),
      };
      
      results.push(imageObj);
      
      // Tạo task để generate image này
      tasks.push(() => limit(async () => {
        try {
          onProgress?.({
            total: prompts.length * config.imagesPerPrompt,
            completed,
            failed,
            current: prompt,
          });
          
          const imageUrl = await generateImageWithRotation(prompt, config.model, config.aspectRatio);
          
          // Cập nhật kết quả
          const resultIndex = results.findIndex(r => r.id === imageId);
          if (resultIndex >= 0) {
            results[resultIndex] = {
              ...results[resultIndex],
              imageUrl,
              status: 'success',
            };
          }
          
          completed++;
          
        } catch (error) {
          console.error(`Failed to generate image for prompt "${prompt}":`, error);
          
          // Cập nhật kết quả với lỗi
          const resultIndex = results.findIndex(r => r.id === imageId);
          if (resultIndex >= 0) {
            results[resultIndex] = {
              ...results[resultIndex],
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
          
          failed++;
        }
        
        // Cập nhật progress
        onProgress?.({
          total: prompts.length * config.imagesPerPrompt,
          completed,
          failed,
        });
      }));
    }
  });
  
  // Thực hiện tất cả tasks với rate limiting
  const batchSize = concurrentLimit || CONCURRENT_REQUESTS;
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    
    // Chạy batch hiện tại
    await Promise.all(batch.map(task => task()));
    
    // Đợi giữa các batch để tránh rate limit
    if (i + batchSize < tasks.length) {
      const modelInfo = IMAGEN_MODELS.find(m => m.id === config.model);
      const waitTime = calculateWaitTime('image', modelInfo?.rateLimitPerMinute);
      console.log(`Waiting ${waitTime}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return results;
}

// Regenerate single image
export async function regenerateImage(
  imageId: string,
  newPrompt: string,
  originalImage: GeneratedImage,
  model: ImagenModel = 'imagen-3.0-generate-002'
): Promise<GeneratedImage> {
  try {
    const imageUrl = await generateImageWithRotation(newPrompt, model);
    
    return {
      ...originalImage,
      id: `${imageId}-regenerated-${Date.now()}`,
      prompt: newPrompt,
      imageUrl,
      status: 'success',
      timestamp: Date.now(),
      error: undefined,
    };
  } catch (error) {
    console.error(`Failed to regenerate image:`, error);
    
    return {
      ...originalImage,
      id: `${imageId}-regenerated-${Date.now()}`,
      prompt: newPrompt,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };
  }
}

// Download image as blob (hỗ trợ cả base64 data URLs)
export async function downloadImage(imageUrl: string, filename: string): Promise<void> {
  try {
    let blob: Blob;
    
    // Kiểm tra nếu là base64 data URL
    if (imageUrl.startsWith('data:')) {
      // Convert base64 data URL thành blob
      const response = await fetch(imageUrl);
      blob = await response.blob();
    } else {
      // Fetch từ URL thông thường
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      blob = await response.blob();
    }
    
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Convert image URL to base64 (for ZIP export)
export async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    // Nếu đã là base64 data URL, chỉ cần extract base64 part
    if (imageUrl.startsWith('data:')) {
      const base64Part = imageUrl.split(',')[1];
      if (base64Part) {
        return base64Part;
      }
    }
    
    // Nếu là URL thông thường, fetch và convert
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
      };
        reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Validate image URL (bao gồm cả base64 data URLs)
export function isValidImageUrl(url: string): boolean {
  try {
    // Kiểm tra base64 data URL
    if (url.startsWith('data:image/')) {
      return true;
    }
    
    // Kiểm tra HTTP/HTTPS URL
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
