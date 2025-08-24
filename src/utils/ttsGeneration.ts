import { GoogleGenAI } from '@google/genai';
import pLimit from 'p-limit';
import type { GeneratedVoice, TTSGenerationConfig, TTSModel, TTSModelInfo, VoiceConfig, TTSProgressCallback } from '@/types';
import { getNextAvailableApiKey, markApiKeyUsed, calculateWaitTime } from './apiKeyRotation';

const CONCURRENT_REQUESTS = parseInt(import.meta.env.VITE_CONCURRENT_REQUESTS) || 5;

// Available TTS models với thông tin chi tiết
export const TTS_MODELS: TTSModelInfo[] = [
  {
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini 2.5 Flash TTS',
    description: 'Fast text-to-speech with good quality',
    rateLimit: {
      requestsPerMinute: 10,
      tokensPerMinute: 10000,
      requestsPerDay: 100,
    },
  },
  {
    id: 'gemini-2.5-pro-preview-tts',
    name: 'Gemini 2.5 Pro TTS',
    description: 'High-quality text-to-speech with natural voice',
    rateLimit: {
      requestsPerMinute: 10,
      tokensPerMinute: 10000,
      requestsPerDay: 50,
    },
  },
];

// Available voice configurations
export const VOICE_CONFIGS: VoiceConfig[] = [
  { name: 'Zephyr', description: 'Bright tone', category: 'bright' },
  { name: 'Puck', description: 'Upbeat energy', category: 'upbeat' },
  { name: 'Charon', description: 'Informative delivery', category: 'informative' },
  { name: 'Kore', description: 'Firm and confident', category: 'firm' },
  { name: 'Fenrir', description: 'Excitable personality', category: 'excitable' },
  { name: 'Leda', description: 'Youthful voice', category: 'youthful' },
  { name: 'Orus', description: 'Firm and steady', category: 'firm' },
  { name: 'Aoede', description: 'Breezy and light', category: 'breezy' },
  { name: 'Callirrhoe', description: 'Easy-going manner', category: 'easy-going' },
  { name: 'Autonoe', description: 'Bright and clear', category: 'bright' },
  { name: 'Enceladus', description: 'Breathy quality', category: 'breathy' },
  { name: 'Iapetus', description: 'Clear articulation', category: 'clear' },
  { name: 'Umbriel', description: 'Easy-going style', category: 'easy-going' },
  { name: 'Algieba', description: 'Smooth delivery', category: 'smooth' },
  { name: 'Despina', description: 'Smooth and flowing', category: 'smooth' },
  { name: 'Erinome', description: 'Clear pronunciation', category: 'clear' },
  { name: 'Algenib', description: 'Gravelly texture', category: 'gravelly' },
  { name: 'Rasalgethi', description: 'Informative tone', category: 'informative' },
  { name: 'Laomedeia', description: 'Upbeat energy', category: 'upbeat' },
  { name: 'Achernar', description: 'Soft and gentle', category: 'soft' },
  { name: 'Alnilam', description: 'Firm delivery', category: 'firm' },
  { name: 'Schedar', description: 'Even temperament', category: 'even' },
  { name: 'Gacrux', description: 'Mature voice', category: 'mature' },
  { name: 'Pulcherrima', description: 'Forward projection', category: 'forward' },
  { name: 'Achird', description: 'Friendly manner', category: 'friendly' },
  { name: 'Zubenelgenubi', description: 'Casual style', category: 'casual' },
  { name: 'Vindemiatrix', description: 'Gentle approach', category: 'gentle' },
  { name: 'Sadachbia', description: 'Lively energy', category: 'lively' },
  { name: 'Sadaltager', description: 'Knowledgeable tone', category: 'knowledgeable' },
  { name: 'Sulafat', description: 'Warm and inviting', category: 'warm' },
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

// Format text cho TTS với custom prompt
function formatTextForTTS(text: string, customPrompt?: string): string {
  if (customPrompt && customPrompt.trim()) {
    return `${customPrompt.trim()}: ${text}`;
  }
  return text;
}

// Convert raw PCM data to proper WAV format
async function convertRawPCMToWAV(rawPCMBase64: string): Promise<string> {
  try {
    // Decode the base64 PCM data
    const pcmData = atob(rawPCMBase64);
    const pcmBytes = new Uint8Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      pcmBytes[i] = pcmData.charCodeAt(i);
    }
    
    console.log('🔄 Converting raw PCM to WAV, data length:', pcmBytes.length);
    
    // Try different sample rates that Google might use
    const possibleSampleRates = [24000, 22050, 16000, 44100, 48000];
    const numChannels = 1; // Mono (Google TTS is typically mono)
    const bitsPerSample = 16; // 16-bit (most common)
    
    // Calculate expected duration for each sample rate to find the most reasonable one
    let bestSampleRate = 24000; // Default
    const expectedDurationRange = [1, 30]; // Expect 1-30 seconds for typical TTS
    
    for (const sampleRate of possibleSampleRates) {
      const bytesPerSample = bitsPerSample / 8;
      const bytesPerSecond = sampleRate * numChannels * bytesPerSample;
      const duration = pcmBytes.length / bytesPerSecond;
      
      console.log(`📊 Sample rate ${sampleRate}Hz would give duration: ${duration.toFixed(2)}s`);
      
      if (duration >= expectedDurationRange[0] && duration <= expectedDurationRange[1]) {
        bestSampleRate = sampleRate;
        console.log(`✅ Using sample rate: ${bestSampleRate}Hz (duration: ${duration.toFixed(2)}s)`);
        break;
      }
    }
    
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = bestSampleRate * blockAlign;
    const dataSize = pcmBytes.length;
    const fileSize = 36 + dataSize;
    
    console.log(`🎵 WAV parameters: ${bestSampleRate}Hz, ${numChannels} channel(s), ${bitsPerSample}-bit`);
    
    // Create WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, fileSize, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, bestSampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample
    
    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true); // Subchunk2Size
    
    // Combine header and PCM data
    const wavBuffer = new Uint8Array(44 + dataSize);
    wavBuffer.set(new Uint8Array(header), 0);
    wavBuffer.set(pcmBytes, 44);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < wavBuffer.length; i++) {
      binary += String.fromCharCode(wavBuffer[i]);
    }
    const base64WAV = btoa(binary);
    
    const estimatedDuration = dataSize / byteRate;
    console.log(`✅ Successfully converted raw PCM to WAV format (estimated duration: ${estimatedDuration.toFixed(2)}s)`);
    
    return `data:audio/wav;base64,${base64WAV}`;
    
  } catch (error) {
    console.error('❌ Error converting raw PCM to WAV:', error);
    // Fallback to original data
    return `data:audio/wav;base64,${rawPCMBase64}`;
  }
}

// Generate single voice using TTS API
async function generateSingleVoice(
  text: string,
  keyIndex: number,
  apiKey: string,
  model: TTSModel = 'gemini-2.5-flash-preview-tts',
  voiceName: string = 'Kore',
  customPrompt?: string
): Promise<string> {
  const genAI = createGenAIClient(apiKey);
  
  try {
    const formattedText = formatTextForTTS(text, customPrompt);
    
    // Sử dụng TTS API để tạo voice
    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: formattedText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });
    
    // Lấy audio data từ response
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      throw new Error('No audio data generated from API response');
    }
    
    // Validate base64 data
    try {
      atob(audioData);
    } catch (error) {
      throw new Error('Invalid base64 audio data received from API');
    }
    
    // Log audio data info for debugging
    console.log('Audio data received:', {
      length: audioData.length,
      firstChars: audioData.substring(0, 50),
      lastChars: audioData.substring(audioData.length - 50)
    });
    
    // Analyze the audio format by looking at the header
    try {
      const binaryString = atob(audioData.substring(0, 100)); // First 100 base64 chars
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Log first 16 bytes as hex to identify format
      const hexHeader = Array.from(bytes.slice(0, 16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log('🔍 Audio header (hex):', hexHeader);
      
      // Check for common audio format signatures
      const headerString = String.fromCharCode(...bytes.slice(0, 12));
      console.log('🔍 Audio header (string):', headerString);
      
      // Check if it's a standard WAV file
      if (headerString.includes('RIFF') && headerString.includes('WAVE')) {
        console.log('✅ Standard WAV format detected');
        markApiKeyUsed('voice', keyIndex, true, model);
        return `data:audio/wav;base64,${audioData}`;
      }
      
      // Check if it's MP3
      if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
        console.log('✅ MP3 format detected');
        markApiKeyUsed('voice', keyIndex, true, model);
        return `data:audio/mpeg;base64,${audioData}`;
      }
      
      // Check if it's OGG
      if (headerString.includes('OggS')) {
        console.log('✅ OGG format detected');
        markApiKeyUsed('voice', keyIndex, true, model);
        return `data:audio/ogg;base64,${audioData}`;
      }
      
      // For everything else (likely raw PCM from Google Gemini), convert to WAV
      console.log('🔄 No standard audio header detected - treating as raw PCM');
      console.log('🔍 Raw data pattern:', Array.from(bytes.slice(0, 8)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
      
      const convertedAudioData = await convertRawPCMToWAV(audioData);
      markApiKeyUsed('voice', keyIndex, true, model);
      return convertedAudioData;
      
    } catch (error) {
      console.error('❌ Error analyzing audio format:', error);
      // Last resort fallback - try to convert as PCM
      try {
        console.log('🔄 Last resort: converting as raw PCM...');
        const convertedAudioData = await convertRawPCMToWAV(audioData);
        markApiKeyUsed('voice', keyIndex, true, model);
        return convertedAudioData;
      } catch (conversionError) {
        console.error('❌ PCM conversion also failed:', conversionError);
        markApiKeyUsed('voice', keyIndex, true, model);
        return `data:audio/wav;base64,${audioData}`;
      }
    }
    
  } catch (error) {
    console.error(`Error generating voice for text "${text}":`, error);
    markApiKeyUsed('voice', keyIndex, false, model);
    throw error;
  }
}

// Generate voice với automatic key rotation
export async function generateVoiceWithRotation(
  text: string, 
  model: TTSModel = 'gemini-2.5-flash-preview-tts',
  voiceName: string = 'Kore',
  customPrompt?: string
): Promise<string> {
  const keyInfo = getNextAvailableApiKey('voice', model);
  
  if (!keyInfo) {
    throw new Error('No available API keys. All keys have reached their daily limit.');
  }
  
  return withRetry(
    () => generateSingleVoice(text, keyInfo.index, keyInfo.key, model, voiceName, customPrompt),
    3,
    1000
  );
}

// Batch generate voices với progress tracking and real-time updates
export async function batchGenerateVoices(
  texts: string[],
  config: TTSGenerationConfig,
  onProgress?: TTSProgressCallback
): Promise<GeneratedVoice[]> {
  console.log("🚀 ~ batchGenerateVoices ~ config:", config)
  const limit = pLimit(CONCURRENT_REQUESTS);
  const results: GeneratedVoice[] = [];
  let completed = 0;
  let failed = 0;
  
  // Tạo tasks cho tất cả voices cần generate
  const tasks: Array<() => Promise<void>> = [];
  
  texts.forEach((text, textIndex) => {
    console.log("🚀 ~ batchGenerateVoices ~ text:", text)
    for (let voiceIndex = 0; voiceIndex < config.textsPerVoice; voiceIndex++) {
      const voiceId = `${textIndex}-${voiceIndex}-${Date.now()}`;
      
      // Khởi tạo voice object với status generating
      const voiceObj: GeneratedVoice = {
        id: voiceId,
        text,
        originalText: text,
        customPrompt: config.customPrompt,
        voiceName: config.voiceName,
        status: 'generating',
        timestamp: Date.now(),
      };
      
      results.push(voiceObj);
      
      // Tạo task để generate voice này
      tasks.push(() => limit(async () => {
        try {
          onProgress?.({
            total: texts.length * config.textsPerVoice,
            completed,
            failed,
            current: text,
          });
          
          const audioData = await generateVoiceWithRotation(
            text, 
            config.model, 
            config.voiceName, 
            config.customPrompt
          );
          
          // Cập nhật kết quả
          const resultIndex = results.findIndex(r => r.id === voiceId);
          if (resultIndex >= 0) {
            results[resultIndex] = {
              ...results[resultIndex],
              audioData,
              status: 'success',
            };
          }
          
          completed++;
          
          // Gửi completed voice qua callback để hiển thị real-time
          const completedVoice = results[resultIndex];
          if (completedVoice) {
            console.log(`✅ Voice completed: ${completedVoice.id}`);
            onProgress?.({
              total: texts.length * config.textsPerVoice,
              completed,
              failed,
              current: text,
            }, [completedVoice]);
          }
          
        } catch (error) {
          console.error(`Failed to generate voice for text "${text}":`, error);
          
          // Cập nhật kết quả với lỗi
          const resultIndex = results.findIndex(r => r.id === voiceId);
          if (resultIndex >= 0) {
            results[resultIndex] = {
              ...results[resultIndex],
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
          
          failed++;
          
          // Gửi failed voice qua callback để hiển thị real-time
          const failedVoice = results[resultIndex];
          if (failedVoice) {
            console.log(`❌ Voice failed: ${failedVoice.id}`);
            onProgress?.({
              total: texts.length * config.textsPerVoice,
              completed,
              failed,
              current: text,
            }, [failedVoice]);
          }
        }
      }));
    }
  });
  
  // Thực hiện tất cả tasks với rate limiting
  const batchSize = Math.min(10, CONCURRENT_REQUESTS);
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    
    // Chạy batch hiện tại
    await Promise.all(batch.map(task => task()));
    
    // Đợi giữa các batch để tránh rate limit
    if (i + batchSize < tasks.length) {
      const waitTime = calculateWaitTime('voice');
      console.log(`Waiting ${waitTime}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return results;
}

// Regenerate single voice
export async function regenerateVoice(
  voiceId: string,
  newText: string,
  originalVoice: GeneratedVoice,
  model: TTSModel = 'gemini-2.5-flash-preview-tts',
  voiceName: string = 'Kore',
  customPrompt?: string
): Promise<GeneratedVoice> {
  try {
    const audioData = await generateVoiceWithRotation(newText, model, voiceName, customPrompt);
    
    return {
      ...originalVoice,
      id: `${voiceId}-regenerated-${Date.now()}`,
      text: newText,
      voiceName,
      customPrompt,
      audioData,
      status: 'success',
      timestamp: Date.now(),
      error: undefined,
    };
  } catch (error) {
    console.error(`Failed to regenerate voice:`, error);
    
    return {
      ...originalVoice,
      id: `${voiceId}-regenerated-${Date.now()}`,
      text: newText,
      voiceName,
      customPrompt,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };
  }
}

// Download audio as blob
export async function downloadAudio(audioData: string, filename: string): Promise<void> {
      try {
      let blob: Blob;
      
      // Kiểm tra nếu là base64 data URL
      if (audioData.startsWith('data:')) {
        // Convert base64 data URL thành blob
        const response = await fetch(audioData);
        blob = await response.blob();
      } else {
        // Nếu là base64 string thuần
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'audio/wav' });
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
    console.error('Error downloading audio:', error);
    throw error;
  }
}

// Convert audio data to base64 (for ZIP export)
export async function audioDataToBase64(audioData: string): Promise<string> {
  try {
    // Nếu đã là base64 data URL, chỉ cần extract base64 part
    if (audioData.startsWith('data:')) {
      const base64Part = audioData.split(',')[1];
      if (base64Part) {
        return base64Part;
      }
    }
    
    // Nếu đã là base64 string thuần
    return audioData;
  } catch (error) {
    console.error('Error converting audio to base64:', error);
    throw error;
  }
}

// Validate audio data
export function isValidAudioData(audioData: string): boolean {
  try {
    // Kiểm tra base64 data URL
    if (audioData.startsWith('data:audio/')) {
      return true;
    }
    
    // Kiểm tra base64 string thuần
    if (audioData.length > 0) {
      atob(audioData); // Thử decode base64
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

// Get voice by name
export function getVoiceByName(name: string): VoiceConfig | undefined {
  return VOICE_CONFIGS.find(voice => voice.name === name);
}

// Get voices by category
export function getVoicesByCategory(category: VoiceConfig['category']): VoiceConfig[] {
  return VOICE_CONFIGS.filter(voice => voice.category === category);
}

// Get model by id
export function getTTSModelById(id: TTSModel): TTSModelInfo | undefined {
  return TTS_MODELS.find(model => model.id === id);
}
