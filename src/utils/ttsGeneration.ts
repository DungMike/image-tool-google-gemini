import { GoogleGenAI } from '@google/genai';
// Using batch processing with 8 parallel calls per batch (2 calls per key × 4 keys)
import type { GeneratedVoice, TTSGenerationConfig, TTSModel, TTSModelInfo, VoiceConfig, TTSProgressCallback } from '@/types';
import { getApiKeys, getNextAvailableApiKey, markApiKeyUsed } from './apiKeyRotation';

// Batch processing configuration - process 8 voices in parallel, then wait before next batch

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

// Generate filename based on chunk and voice index
function generateOrderedFilename(chunkIndex: number, voiceIndex: number, textsPerVoice: number): string {
  const chunkStr = (chunkIndex + 1).toString().padStart(3, '0'); // 001, 002, 003...
  
  if (textsPerVoice > 1) {
    const voiceStr = String.fromCharCode(65 + voiceIndex); // A, B, C...
    return `chunk_${chunkStr}_voice_${voiceStr}`;
  } else {
    return `chunk_${chunkStr}`;
  }
}

// Create ordered voice ID
function createOrderedVoiceId(chunkIndex: number, voiceIndex: number, timestamp: number): string {
  const chunkStr = chunkIndex.toString().padStart(3, '0');
  const voiceStr = voiceIndex.toString().padStart(2, '0');
  return `voice_${chunkStr}_${voiceStr}_${timestamp}`;
}

// Convert raw PCM data to proper WAV format (browser-compatible, following Google Gemini TTS docs)
async function convertRawPCMToWAV(rawPCMBase64: string): Promise<string> {
  try {
    console.log('🔄 Converting raw PCM to WAV (browser-compatible), data length:', rawPCMBase64.length);
    
    // Decode the base64 PCM data
    const pcmData = atob(rawPCMBase64);
    const pcmBytes = new Uint8Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      pcmBytes[i] = pcmData.charCodeAt(i);
    }
    
    console.log('📦 PCM buffer size:', pcmBytes.length, 'bytes');
    
    // Google Gemini TTS parameters (from official docs)
    const channels = 1;        // Mono
    const sampleRate = 24000;  // 24kHz (Google Gemini TTS default)
    const bitsPerSample = 16;  // 16-bit
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmBytes.length;
    const fileSize = 36 + dataSize;
    
    // Calculate duration
    const duration = dataSize / byteRate;
    console.log(`🎵 Google Gemini TTS parameters: ${sampleRate}Hz, ${channels} channel(s), ${bitsPerSample}-bit, duration: ${duration.toFixed(2)}s`);
    
    // Create WAV header (44 bytes) - following WAV format specification
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false);    // "RIFF" (big-endian)
    view.setUint32(4, fileSize, true);       // File size - 8 (little-endian)
    view.setUint32(8, 0x57415645, false);    // "WAVE" (big-endian)
    
    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false);   // "fmt " (big-endian)
    view.setUint32(16, 16, true);            // Subchunk1Size (16 for PCM) (little-endian)
    view.setUint16(20, 1, true);             // AudioFormat (1 for PCM) (little-endian)
    view.setUint16(22, channels, true);      // NumChannels (little-endian)
    view.setUint32(24, sampleRate, true);    // SampleRate (little-endian)
    view.setUint32(28, byteRate, true);      // ByteRate (little-endian)
    view.setUint16(32, blockAlign, true);    // BlockAlign (little-endian)
    view.setUint16(34, bitsPerSample, true); // BitsPerSample (little-endian)
    
    // data sub-chunk
    view.setUint32(36, 0x64617461, false);   // "data" (big-endian)
    view.setUint32(40, dataSize, true);      // Subchunk2Size (little-endian)
    
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
    
    console.log(`✅ Successfully converted PCM to WAV format (${wavBuffer.length} bytes, ${duration.toFixed(2)}s duration)`);
    
    return `data:audio/wav;base64,${base64WAV}`;
    
  } catch (error) {
    console.error('❌ Error converting raw PCM to WAV:', error);
    // Fallback to original data
    return `data:audio/wav;base64,${rawPCMBase64}`;
  }
}

// API Call Counter for testing
let API_CALL_COUNT = 0;
let API_CALLS_LOG: Array<{
  timestamp: number;
  text: string;
  model: string;
  voiceName: string;
  keyIndex: number;
  success: boolean;
}> = [];

// Reset API call counter
export function resetApiCallCounter() {
  API_CALL_COUNT = 0;
  API_CALLS_LOG = [];
  console.log('🔄 API call counter reset');
}

// Get API call statistics
export function getApiCallStats() {
  return {
    totalCalls: API_CALL_COUNT,
    callsLog: API_CALLS_LOG,
    successfulCalls: API_CALLS_LOG.filter(call => call.success).length,
    failedCalls: API_CALLS_LOG.filter(call => !call.success).length,
  };
}

// Batch processing configuration
const BATCH_SIZE = 4; // Process 8 voices in parallel (2 per key × 4 keys)
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds between batches to respect rate limits

// Helper function to wait
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process voices in parallel batches
async function processBatch(
  voiceObjects: GeneratedVoice[],
  config: TTSGenerationConfig,
  batchIndex: number,
  totalBatches: number
): Promise<{ completed: number; failed: number }> {
  console.log(`🚀 Processing batch ${batchIndex + 1}/${totalBatches} with ${voiceObjects.length} voices in parallel`);
  
  const promises = voiceObjects.map(async (voiceObj, index) => {
    try {
      console.log(`🎯 Starting voice ${index + 1}/${voiceObjects.length} in batch ${batchIndex + 1}: ${voiceObj.filename}`);
      
      // Generate voice with automatic key rotation
      const audioData = await generateVoiceWithRotation(
        voiceObj.text,
        config.model,
        config.voiceName,
        config.apiKeyIndexStart,
        config.customPrompt,
      );
      
      // Update voice object with audio data
      voiceObj.audioUrl = audioData;
      voiceObj.audioData = audioData; // For compatibility with VoiceGallery component
      voiceObj.status = 'success';
      
      console.log(`✅ Voice completed in batch ${batchIndex + 1}: ${voiceObj.filename}`);
      return { success: true, voiceObj };
      
    } catch (error) {
      console.error(`❌ Failed to generate voice in batch ${batchIndex + 1} for "${voiceObj.text}":`, error);
      
      // Update voice object with error
      voiceObj.status = 'error';
      voiceObj.error = error instanceof Error ? error.message : 'Unknown error';
      
      return { success: false, voiceObj };
    }
  });
  
  // Wait for all promises in this batch to complete
  const results = await Promise.all(promises);
  
  // Count successful and failed generations
  const completed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`🏁 Batch ${batchIndex + 1} completed: ${completed} successful, ${failed} failed`);
  
  return { completed, failed };
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
  // Increment API call counter for monitoring
  API_CALL_COUNT++;
  
  console.log(`🔢 API CALL #${API_CALL_COUNT} - Key Index: ${keyIndex}, Text: "${text.substring(0, 30)}..."`);
  
  const callInfo = {
    timestamp: Date.now(),
    text: text.substring(0, 50),
    model,
    voiceName,
    keyIndex,
    success: true
  };
  
  const genAI = createGenAIClient(apiKey);
  
  try {
    const formattedText = formatTextForTTS(text, customPrompt);
    
    // 🚀 REAL API CALL to Google Gemini TTS
    console.log(`🎤 Calling Gemini TTS API for "${formattedText.substring(0, 30)}..."`);
    
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
    
    // Get model info for rate limit tracking
    const modelInfo = TTS_MODELS.find(m => m.id === model);
    
    // Log audio data info for debugging
    console.log(`✅ Audio data received (${audioData.length} chars) for key ${keyIndex}`);
    
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
        callInfo.success = true;
        API_CALLS_LOG.push(callInfo);
        markApiKeyUsed('voice', keyIndex, true, model, undefined, modelInfo?.rateLimit.requestsPerDay);
        return `data:audio/wav;base64,${audioData}`;
      }
      
      // Check if it's MP3
      if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
        console.log('✅ MP3 format detected');
        callInfo.success = true;
        API_CALLS_LOG.push(callInfo);
        markApiKeyUsed('voice', keyIndex, true, model, undefined, modelInfo?.rateLimit.requestsPerDay);
        return `data:audio/mpeg;base64,${audioData}`;
      }
      
      // Check if it's OGG
      if (headerString.includes('OggS')) {
        console.log('✅ OGG format detected');
        callInfo.success = true;
        API_CALLS_LOG.push(callInfo);
        markApiKeyUsed('voice', keyIndex, true, model, undefined, modelInfo?.rateLimit.requestsPerDay);
        return `data:audio/ogg;base64,${audioData}`;
      }
      
      // For everything else (likely raw PCM from Google Gemini), convert to WAV
      console.log('🔄 No standard audio header detected - treating as raw PCM');
      console.log('🔍 Raw data pattern:', Array.from(bytes.slice(0, 8)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
      
      const convertedAudioData = await convertRawPCMToWAV(audioData);
      callInfo.success = true;
      API_CALLS_LOG.push(callInfo);
      markApiKeyUsed('voice', keyIndex, true, model, undefined, modelInfo?.rateLimit.requestsPerDay);
      return convertedAudioData;
      
    } catch (error) {
      console.error('❌ Error analyzing audio format:', error);
      // Last resort fallback - try to convert as PCM
      try {
        console.log('🔄 Last resort: converting as raw PCM...');
        const convertedAudioData = await convertRawPCMToWAV(audioData);
        callInfo.success = true;
        API_CALLS_LOG.push(callInfo);
        markApiKeyUsed('voice', keyIndex, true, model, undefined, modelInfo?.rateLimit.requestsPerDay);
        return convertedAudioData;
      } catch (conversionError) {
        console.error('❌ PCM conversion also failed:', conversionError);
        callInfo.success = true;
        API_CALLS_LOG.push(callInfo);
        markApiKeyUsed('voice', keyIndex, true, model, undefined, modelInfo?.rateLimit.requestsPerDay);
        return `data:audio/wav;base64,${audioData}`;
      }
    }
    
  } catch (error) {
    console.error(`❌ Error generating voice for text "${text}":`, error);
    const modelInfo = TTS_MODELS.find(m => m.id === model);
    
    // Log failed call
    callInfo.success = false;
    API_CALLS_LOG.push(callInfo);
    
    markApiKeyUsed('voice', keyIndex, false, model, undefined, modelInfo?.rateLimit.requestsPerDay);
    throw error;
  }
}

// Generate voice với automatic key rotation
export async function generateVoiceWithRotation(
  text: string, 
  model: TTSModel = 'gemini-2.5-flash-preview-tts',
  voiceName: string = 'Kore',
  apiKeyIndexStart: number,
  customPrompt?: string
): Promise<string> {
  const keys = getApiKeys()
  console.log(  "🚀 ~ generateVoiceWithRotation ~ keys:", keys)
  console.log(  "🚀 ~ generateVoiceWithRotation apiKeyIndexStart", apiKeyIndexStart)
  const keyInfor = keys[apiKeyIndexStart -1]
  console.log("🚀 ~ generateVoiceWithRotation ~ keyInfor:", keyInfor)
  return withRetry(
    () => generateSingleVoice(text, apiKeyIndexStart, keyInfor, model, voiceName, customPrompt),
    3,
    1000
  );
}

// Batch generate voices với sequential processing để tránh rate limit
export async function batchGenerateVoices(
  texts: string[],
  config: TTSGenerationConfig,
  onProgress?: TTSProgressCallback,
  batchTimestamp?: number
): Promise<GeneratedVoice[]> {
  console.log("🚀 ~ batchGenerateVoices ~ config:", config)
  
  // Get model info
  const modelInfo = TTS_MODELS.find(m => m.id === config.model);
  console.log(`📊 Model: ${modelInfo?.name || config.model}, Sequential processing to avoid rate limits`);
  
  const results: GeneratedVoice[] = [];
  let completed = 0;
  let failed = 0;
  const timestamp = batchTimestamp || Date.now();
  
  // Tạo tất cả voice objects trước
  texts.forEach((text, chunkIndex) => {
    console.log(`🚀 ~ batchGenerateVoices ~ chunk ${chunkIndex + 1}:`, text)
    for (let voiceIndex = 0; voiceIndex < config.textsPerVoice; voiceIndex++) {
      // Tạo ordered ID và filename
      const voiceId = createOrderedVoiceId(chunkIndex, voiceIndex, timestamp);
      const filename = generateOrderedFilename(chunkIndex, voiceIndex, config.textsPerVoice);
      
      // Khởi tạo voice object với status generating và thông tin ordering
      const voiceObj: GeneratedVoice = {
        id: voiceId,
        text,
        originalText: text,
        customPrompt: config.customPrompt,
        voiceName: config.voiceName,
        status: 'generating',
        timestamp,
        chunkIndex,
        voiceIndex,
        filename,
      };
      
      results.push(voiceObj);
    }
  });
  
  // Send initial voices with "generating" status to UI immediately
  if (onProgress) {
    console.log('📤 Sending initial voices to UI:', results.map(v => ({ id: v.id, filename: v.filename, status: v.status })));
    onProgress({
      total: texts.length * config.textsPerVoice,
      completed: 0,
      failed: 0,
    }, results);
  }
  
  // Reset API call counter before starting
  const initialApiCalls = API_CALL_COUNT;
  console.log(`🔄 Starting batch generation. Current API calls: ${initialApiCalls}`);
  
  // Split voices into batches of BATCH_SIZE
  const batches: GeneratedVoice[][] = [];
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    batches.push(results.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`🚀 Processing ${results.length} voices in ${batches.length} batches of max ${BATCH_SIZE} voices each`);
  
  const startTime = Date.now();
  
  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    console.log(`📦 Starting batch ${batchIndex + 1}/${batches.length} with ${batch.length} voices`);
    
    // Send progress update before batch starts
    onProgress?.({
      total: results.length,
      completed,
      failed,
      current: `Processing batch ${batchIndex + 1}/${batches.length}`,
    });
    
    try {
      // Process this batch in parallel
      const batchResult = await processBatch(batch, config, batchIndex, batches.length);
      
      // Update counters
      completed += batchResult.completed;
      failed += batchResult.failed;
      
      console.log(`✅ Batch ${batchIndex + 1} completed: ${batchResult.completed} successful, ${batchResult.failed} failed`);
      
      // Send batch completion update with completed voices
      const completedVoicesInBatch = batch.filter(v => v.status === 'success' || v.status === 'error');
      onProgress?.({
        total: results.length,
        completed,
        failed,
        current: `Batch ${batchIndex + 1} completed`,
      }, completedVoicesInBatch);
      
    } catch (error) {
      console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
      
      // Mark all voices in this batch as failed
      batch.forEach(voiceObj => {
        if (voiceObj.status === 'generating') {
          voiceObj.status = 'error';
          voiceObj.error = 'Batch processing failed';
          failed++;
        }
      });
      
      // Send batch failure update
      onProgress?.({
        total: results.length,
        completed,
        failed,
        current: `Batch ${batchIndex + 1} failed`,
      }, batch);
    }
    
    // Wait between batches to respect rate limits (except for the last batch)
    if (batchIndex < batches.length - 1) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }
  
  const endTime = Date.now();
  
  // Calculate actual API calls made in this batch
  const finalApiCalls = API_CALL_COUNT;
  const apiCallsThisBatch = finalApiCalls - initialApiCalls;
  
  // Sắp xếp kết quả theo thứ tự trước khi trả về
  results.sort((a, b) => {
    if (a.chunkIndex !== b.chunkIndex) {
      return a.chunkIndex - b.chunkIndex;
    }
    return a.voiceIndex - b.voiceIndex;
  });
  
  // Detailed logging
  console.log('📋 Final ordered results:', results.map(r => ({ filename: r.filename, status: r.status })));
  console.log(`🏁 Batch generation completed in ${((endTime - startTime) / 1000).toFixed(2)}s:`);
  console.log(`   📦 Processed ${batches.length} batches of max ${BATCH_SIZE} voices each`);
  console.log(`   ✅ Successful: ${completed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   🚀 Real API calls made: ${apiCallsThisBatch}/${results.length}`);
  console.log(`   📊 Total session API calls: ${finalApiCalls}`);
  console.log(`   ⏳ Average time per voice: ${(((endTime - startTime) / results.length) / 1000).toFixed(2)}s`);
  console.log(`   🔥 Speed improvement: ~${Math.round(BATCH_SIZE)}x faster than sequential processing`);
  
  // Get API call stats
  const apiStats = getApiCallStats();
  console.log(`📈 API Call Statistics:`, {
    totalCalls: apiStats.totalCalls,
    successfulCalls: apiStats.successfulCalls,
    failedCalls: apiStats.failedCalls,
    successRate: `${((apiStats.successfulCalls / apiStats.totalCalls) * 100).toFixed(1)}%`
  });
  
  return results;
}

// Regenerate single voice
export async function regenerateVoice(
  voiceId: string,
  newText: string,
  originalVoice: GeneratedVoice,
  model: TTSModel = 'gemini-2.5-flash-preview-tts',
  voiceName: string = 'Kore',
  apiKeyIndexStart: number,
  customPrompt?: string
): Promise<GeneratedVoice> {
  try {
    const audioData = await generateVoiceWithRotation(newText, model, voiceName, apiKeyIndexStart, customPrompt);
    const timestamp = Date.now();
    
    // Tạo filename mới cho regenerated voice
    const newFilename = originalVoice.filename 
      ? `${originalVoice.filename}_regenerated`
      : `regenerated_${timestamp}`;
    
    return {
      ...originalVoice,
      id: `${voiceId}-regenerated-${timestamp}`,
      text: newText,
      voiceName,
      customPrompt,
      audioData,
      status: 'success',
      timestamp,
      filename: newFilename,
      error: undefined,
    };
  } catch (error) {
    console.error(`Failed to regenerate voice:`, error);
    const timestamp = Date.now();
    
    // Tạo filename mới cho failed regenerated voice
    const newFilename = originalVoice.filename 
      ? `${originalVoice.filename}_regenerated_failed`
      : `regenerated_failed_${timestamp}`;
    
    return {
      ...originalVoice,
      id: `${voiceId}-regenerated-${timestamp}`,
      text: newText,
      voiceName,
      customPrompt,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
      filename: newFilename,
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
