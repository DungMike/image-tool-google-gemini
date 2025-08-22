import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { GeneratedImage } from '@/types';
import { imageUrlToBase64 } from './imageGeneration';

// Tạo tên file an toàn cho ZIP
function sanitizeFilename(text: string, maxLength: number = 50): string {
  return text
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Loại bỏ ký tự đặc biệt
    .replace(/\s+/g, '_') // Thay space bằng underscore
    .substring(0, maxLength) // Giới hạn độ dài
    .toLowerCase();
}

// Tạo tên file duy nhất
function generateUniqueFilename(
  prompt: string, 
  index: number, 
  extension: string = 'jpg'
): string {
  const sanitized = sanitizeFilename(prompt);
  const timestamp = Date.now();
  return `${index + 1}_${sanitized}_${timestamp}.${extension}`;
}

// Export images thành ZIP file
export async function exportImagesToZip(
  images: GeneratedImage[],
  zipFilename: string = 'generated_images.zip',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const successfulImages = images.filter(img => img.status === 'success' && img.imageUrl);
  
  if (successfulImages.length === 0) {
    throw new Error('No successful images to export');
  }
  
  try {
    // Tạo manifest file với thông tin về các images
    const manifest = {
      exportDate: new Date().toISOString(),
      totalImages: successfulImages.length,
      images: successfulImages.map((img, index) => ({
        filename: generateUniqueFilename(img.prompt, index),
        originalPrompt: img.originalPrompt,
        finalPrompt: img.prompt,
        generatedAt: new Date(img.timestamp).toISOString(),
        imageId: img.id,
      })),
    };
    
    // Thêm manifest vào ZIP
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    
    // Tạo README file
    const readme = `# Generated Images Export

Export Date: ${new Date().toLocaleString()}
Total Images: ${successfulImages.length}

## File Structure
- manifest.json: Contains metadata about all images
- *.jpg: Generated image files
- README.txt: This file

## Image Naming Convention
Files are named as: {index}_{sanitized_prompt}_{timestamp}.jpg

## Prompts Used
${successfulImages.map((img, index) => `${index + 1}. ${img.originalPrompt}`).join('\n')}

Generated with Batch Image Generator using Google Gemini API
`;
    
    zip.file('README.txt', readme);
    
    // Download và thêm từng image vào ZIP
    const downloadPromises = successfulImages.map(async (image, index) => {
      try {
        onProgress?.(index, successfulImages.length);
        
        const base64Data = await imageUrlToBase64(image.imageUrl);
        const filename = generateUniqueFilename(image.prompt, index);
        
        zip.file(filename, base64Data, { base64: true });
        
        console.log(`Added image ${index + 1}/${successfulImages.length}: ${filename}`);
      } catch (error) {
        console.error(`Failed to add image ${index + 1} to ZIP:`, error);
        // Thêm error file thay vì image
        const errorFilename = generateUniqueFilename(image.prompt, index, 'error.txt');
        const errorContent = `Failed to download image
Original Prompt: ${image.originalPrompt}
Final Prompt: ${image.prompt}
Error: ${error instanceof Error ? error.message : 'Unknown error'}
Generated At: ${new Date(image.timestamp).toLocaleString()}
Image URL: ${image.imageUrl}`;
        
        zip.file(errorFilename, errorContent);
      }
    });
    
    // Đợi tất cả images được download và thêm vào ZIP
    await Promise.all(downloadPromises);
    
    onProgress?.(successfulImages.length, successfulImages.length);
    
    // Generate ZIP file
    console.log('Generating ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // Balanced compression
      },
    });
    
    // Download ZIP file
    saveAs(zipBlob, zipFilename);
    
    console.log(`Successfully exported ${successfulImages.length} images to ${zipFilename}`);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw error;
  }
}

// Export single image với metadata
export async function exportSingleImageWithMetadata(
  image: GeneratedImage,
  filename?: string
): Promise<void> {
  if (image.status !== 'success' || !image.imageUrl) {
    throw new Error('Cannot export unsuccessful image');
  }
  
  const zip = new JSZip();
  const imageName = filename || generateUniqueFilename(image.prompt, 0);
  const metadataName = imageName.replace(/\.[^/.]+$/, '_metadata.json');
  
  try {
    // Thêm image vào ZIP
    const base64Data = await imageUrlToBase64(image.imageUrl);
    zip.file(imageName, base64Data, { base64: true });
    
    // Tạo metadata
    const metadata = {
      originalPrompt: image.originalPrompt,
      finalPrompt: image.prompt,
      generatedAt: new Date(image.timestamp).toISOString(),
      imageId: image.id,
      exportDate: new Date().toISOString(),
    };
    
    // Thêm metadata vào ZIP
    zip.file(metadataName, JSON.stringify(metadata, null, 2));
    
    // Generate và download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = imageName.replace(/\.[^/.]+$/, '_with_metadata.zip');
    
    saveAs(zipBlob, zipName);
    
    console.log(`Successfully exported single image with metadata: ${zipName}`);
  } catch (error) {
    console.error('Error exporting single image with metadata:', error);
    throw error;
  }
}

// Tính toán kích thước ước tính của ZIP file
export function estimateZipSize(images: GeneratedImage[]): {
  estimatedSizeMB: number;
  imageCount: number;
} {
  const successfulImages = images.filter(img => img.status === 'success');
  
  // Ước tính mỗi image ~200KB (có thể thay đổi tùy thuộc vào chất lượng)
  const averageImageSizeKB = 200;
  const estimatedSizeKB = successfulImages.length * averageImageSizeKB;
  const estimatedSizeMB = Math.round((estimatedSizeKB / 1024) * 100) / 100;
  
  return {
    estimatedSizeMB,
    imageCount: successfulImages.length,
  };
}

// Validate trước khi export
export function validateExport(images: GeneratedImage[]): {
  canExport: boolean;
  issues: string[];
  successfulCount: number;
  failedCount: number;
} {
  const issues: string[] = [];
  const successfulImages = images.filter(img => img.status === 'success' && img.imageUrl);
  const failedImages = images.filter(img => img.status !== 'success');
  
  if (images.length === 0) {
    issues.push('No images to export');
  }
  
  if (successfulImages.length === 0) {
    issues.push('No successful images to export');
  }
  
  if (failedImages.length > 0) {
    issues.push(`${failedImages.length} images failed to generate and will be skipped`);
  }
  
  // Kiểm tra kích thước ước tính
  const { estimatedSizeMB } = estimateZipSize(images);
  if (estimatedSizeMB > 100) {
    issues.push(`Large export size (~${estimatedSizeMB}MB) - download may take time`);
  }
  
  return {
    canExport: successfulImages.length > 0,
    issues,
    successfulCount: successfulImages.length,
    failedCount: failedImages.length,
  };
}
