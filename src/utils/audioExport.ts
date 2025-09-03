import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { GeneratedVoice } from '@/types';
import { audioDataToBase64 } from './ttsGeneration';

// Tạo tên file an toàn cho ZIP
function sanitizeFilename(text: string, maxLength: number = 50): string {
  return text
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Loại bỏ ký tự đặc biệt
    .replace(/\s+/g, '_') // Thay space bằng underscore
    .substring(0, maxLength) // Giới hạn độ dài
    .toLowerCase();
}

// Tạo tên file duy nhất - sử dụng ordered filename nếu có
function generateUniqueFilename(
  voice: GeneratedVoice,
  index: number, 
  extension: string = 'wav'
): string {
  // Ưu tiên sử dụng filename có thứ tự từ voice object
  if (voice.filename) {
    return `${voice.filename}.${extension}`;
  }
  
  // Fallback về format cũ nếu không có filename
  const sanitizedText = sanitizeFilename(voice.text);
  const sanitizedVoice = sanitizeFilename(voice.voiceName);
  const timestamp = Date.now();
  return `${index + 1}_${sanitizedVoice}_${sanitizedText}_${timestamp}.${extension}`;
}

// Export voices thành ZIP file
export async function exportVoicesToZip(
  voices: GeneratedVoice[],
  zipFilename: string = 'generated_voices.zip',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const successfulVoices = voices.filter(voice => voice.status === 'success' && voice.audioData);
  
  if (successfulVoices.length === 0) {
    throw new Error('No successful voices to export');
  }
  
  try {
    // Tạo manifest file với thông tin về các voices
    const manifest = {
      exportDate: new Date().toISOString(),
      totalVoices: successfulVoices.length,
      voices: successfulVoices.map((voice, index) => ({
        filename: generateUniqueFilename(voice, index),
        originalText: voice.originalText,
        finalText: voice.text,
        voiceName: voice.voiceName,
        customPrompt: voice.customPrompt,
        generatedAt: new Date(voice.timestamp).toISOString(),
        voiceId: voice.id,
        duration: voice.duration,
        chunkIndex: voice.chunkIndex,
        voiceIndex: voice.voiceIndex,
        orderedFilename: voice.filename,
      })),
    };
    
    // Thêm manifest vào ZIP
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    
    // Tạo README file
    const readme = `# Generated Voices Export

Export Date: ${new Date().toLocaleString()}
Total Voices: ${successfulVoices.length}

## File Structure
- manifest.json: Contains metadata about all voices
- *.wav: Generated audio files
- README.txt: This file

## Audio Naming Convention
Files are named as: {index}_{voice}_{sanitized_text}_{timestamp}.wav

## Texts Used
${successfulVoices.map((voice, index) => `${index + 1}. [${voice.voiceName}] ${voice.originalText}${voice.customPrompt ? ` (${voice.customPrompt})` : ''}`).join('\n')}

Generated with Batch Voice Generator using Google Gemini TTS API
`;
    
    zip.file('README.txt', readme);
    
    // Download và thêm từng voice vào ZIP
    const downloadPromises = successfulVoices.map(async (voice, index) => {
      try {
        onProgress?.(index, successfulVoices.length);
        
        const base64Data = await audioDataToBase64(voice.audioData!);
        const filename = generateUniqueFilename(voice, index);
        
        zip.file(filename, base64Data, { base64: true });
        
        console.log(`Added voice ${index + 1}/${successfulVoices.length}: ${filename} (${voice.filename || 'legacy format'})`);
      } catch (error) {
        console.error(`Failed to add voice ${index + 1} to ZIP:`, error);
        // Thêm error file thay vì audio
        const errorFilename = generateUniqueFilename(voice, index, 'error.txt');
        const errorContent = `Failed to export voice
Original Text: ${voice.originalText}
Final Text: ${voice.text}
Voice Name: ${voice.voiceName}
Custom Prompt: ${voice.customPrompt || 'None'}
Ordered Filename: ${voice.filename || 'N/A'}
Chunk Index: ${voice.chunkIndex ?? 'N/A'}
Voice Index: ${voice.voiceIndex ?? 'N/A'}
Error: ${error instanceof Error ? error.message : 'Unknown error'}
Generated At: ${new Date(voice.timestamp).toLocaleString()}`;
        
        zip.file(errorFilename, errorContent);
      }
    });
    
    // Đợi tất cả voices được download và thêm vào ZIP
    await Promise.all(downloadPromises);
    
    onProgress?.(successfulVoices.length, successfulVoices.length);
    
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
    
    console.log(`Successfully exported ${successfulVoices.length} voices to ${zipFilename}`);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw error;
  }
}

// Export single voice với metadata
export async function exportSingleVoiceWithMetadata(
  voice: GeneratedVoice,
  filename?: string
): Promise<void> {
  if (voice.status !== 'success' || !voice.audioData) {
    throw new Error('Cannot export unsuccessful voice');
  }
  
  const zip = new JSZip();
  const audioName = filename || generateUniqueFilename(voice, 0);
  const metadataName = audioName.replace(/\.[^/.]+$/, '_metadata.json');
  
  try {
    // Thêm audio vào ZIP
    const base64Data = await audioDataToBase64(voice.audioData);
    zip.file(audioName, base64Data, { base64: true });
    
    // Tạo metadata
    const metadata = {
      originalText: voice.originalText,
      finalText: voice.text,
      voiceName: voice.voiceName,
      customPrompt: voice.customPrompt,
      generatedAt: new Date(voice.timestamp).toISOString(),
      voiceId: voice.id,
      duration: voice.duration,
      exportDate: new Date().toISOString(),
    };
    
    // Thêm metadata vào ZIP
    zip.file(metadataName, JSON.stringify(metadata, null, 2));
    
    // Generate và download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = audioName.replace(/\.[^/.]+$/, '_with_metadata.zip');
    
    saveAs(zipBlob, zipName);
    
    console.log(`Successfully exported single voice with metadata: ${zipName}`);
  } catch (error) {
    console.error('Error exporting single voice with metadata:', error);
    throw error;
  }
}

// Tính toán kích thước ước tính của ZIP file
export function estimateZipSize(voices: GeneratedVoice[]): {
  estimatedSizeMB: number;
  voiceCount: number;
} {
  const successfulVoices = voices.filter(voice => voice.status === 'success');
  
  // Ước tính mỗi audio file ~50KB (có thể thay đổi tùy thuộc vào độ dài)
  const averageAudioSizeKB = 50;
  const estimatedSizeKB = successfulVoices.length * averageAudioSizeKB;
  const estimatedSizeMB = Math.round((estimatedSizeKB / 1024) * 100) / 100;
  
  return {
    estimatedSizeMB,
    voiceCount: successfulVoices.length,
  };
}

// Validate trước khi export
export function validateVoiceExport(voices: GeneratedVoice[]): {
  canExport: boolean;
  issues: string[];
  successfulCount: number;
  failedCount: number;
} {
  const issues: string[] = [];
  const successfulVoices = voices.filter(voice => voice.status === 'success' && voice.audioData);
  const failedVoices = voices.filter(voice => voice.status !== 'success');
  
  if (voices.length === 0) {
    issues.push('No voices to export');
  }
  
  if (successfulVoices.length === 0) {
    issues.push('No successful voices to export');
  }
  
  if (failedVoices.length > 0) {
    issues.push(`${failedVoices.length} voices failed to generate and will be skipped`);
  }
  
  // Kiểm tra kích thước ước tính
  const { estimatedSizeMB } = estimateZipSize(voices);
  if (estimatedSizeMB > 50) {
    issues.push(`Large export size (~${estimatedSizeMB}MB) - download may take time`);
  }
  
  return {
    canExport: successfulVoices.length > 0,
    issues,
    successfulCount: successfulVoices.length,
    failedCount: failedVoices.length,
  };
}

