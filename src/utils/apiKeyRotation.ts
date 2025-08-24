import type { ApiKeyStatus, ServiceApiKeyStatus, ApiKeyRotationState } from '@/types';

const STORAGE_KEY = 'gemini_api_keys_status';

// Rate limits cho Image service (Imagen API)
const IMAGE_RATE_LIMIT_PER_DAY = 70; // Imagen daily limit
const IMAGE_RATE_LIMIT_PER_MINUTE = 10; // Imagen per minute limit

// Rate limits cho Voice service (TTS API) 
const VOICE_RATE_LIMIT_PER_DAY_FLASH = 100; // Flash TTS daily limit
const VOICE_RATE_LIMIT_PER_DAY_PRO = 50; // Pro TTS daily limit
const VOICE_RATE_LIMIT_PER_MINUTE = 10; // TTS per minute limit

export type ServiceType = 'image' | 'voice';

// Lấy tất cả API keys từ environment
export function getApiKeys(): string[] {
  const keys: string[] = [];
  let index = 1;
  
  while (true) {
    const key = import.meta.env[`VITE_GEMINI_API_KEY_${index}`];
    if (!key) break;
    keys.push(key);
    index++;
  }
  
  if (keys.length === 0) {
    console.warn('No API keys found in environment variables');
  }
  
  return keys;
}

// Lấy trạng thái của tất cả API keys từ localStorage
export function getApiKeysStatus(): ApiKeyRotationState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error parsing API keys status from localStorage:', error);
    return {};
  }
}

// Lưu trạng thái API keys vào localStorage
export function saveApiKeysStatus(status: ApiKeyRotationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Error saving API keys status to localStorage:', error);
  }
}

// Kiểm tra xem có phải ngày mới không
function isNewDay(lastResetDate: string): boolean {
  const today = new Date().toDateString();
  return lastResetDate !== today;
}

// Khởi tạo trạng thái cho key nếu chưa có
function initializeKeyStatus(key: string, service: ServiceType, status: ApiKeyRotationState): ApiKeyStatus {
  if (!status[key]) {
    status[key] = {
      image: {
        requestCount: 0,
        lastResetDate: new Date().toDateString(),
        isBlocked: false,
        lastUsed: 0,
      },
      voice: {
        requestCount: 0,
        lastResetDate: new Date().toDateString(),
        isBlocked: false,
        lastUsed: 0,
      },
    };
  }
  
  return status[key][service];
}

// Reset số lượng request nếu là ngày mới
function resetDailyCountIfNeeded(keyStatus: ApiKeyStatus): void {
  if (isNewDay(keyStatus.lastResetDate)) {
    keyStatus.requestCount = 0;
    keyStatus.lastResetDate = new Date().toDateString();
    keyStatus.isBlocked = false;
  }
}

// Kiểm tra rate limit per minute cho service cụ thể
function checkMinuteRateLimit(keyStatus: ApiKeyStatus, service: ServiceType): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  
  const rateLimit = service === 'image' ? IMAGE_RATE_LIMIT_PER_MINUTE : VOICE_RATE_LIMIT_PER_MINUTE;
  
  // Nếu lần sử dụng cuối cách đây ít hơn 1 phút và đã đạt limit per minute
  if (keyStatus.lastUsed > oneMinuteAgo) {
    // Đơn giản hóa: giả sử mỗi phút chỉ cho phép rate limit requests
    // Trong thực tế, bạn có thể cần tracking chi tiết hơn
    return false;
  }
  
  return true;
}

// Lấy API key khả dụng tiếp theo cho service cụ thể
export function getNextAvailableApiKey(service: ServiceType, ttsModel?: string): { key: string; index: number } | null {
  const keys = getApiKeys();
  if (keys.length === 0) return null;
  
  const status = getApiKeysStatus();
  
  // Tìm key khả dụng
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyStatus = initializeKeyStatus(key, service, status);
    
    // Reset daily count nếu cần
    resetDailyCountIfNeeded(keyStatus);
    
    // Kiểm tra daily limit dựa trên service và model
    let dailyLimit = IMAGE_RATE_LIMIT_PER_DAY;
    if (service === 'voice') {
      dailyLimit = ttsModel === 'gemini-2.5-pro-preview-tts' 
        ? VOICE_RATE_LIMIT_PER_DAY_PRO 
        : VOICE_RATE_LIMIT_PER_DAY_FLASH;
    }
    
    if (keyStatus.requestCount >= dailyLimit) {
      keyStatus.isBlocked = true;
      continue;
    }
    
    // Kiểm tra minute rate limit
    if (!checkMinuteRateLimit(keyStatus, service)) {
      continue;
    }
    
    // Key này khả dụng
    saveApiKeysStatus(status);
    return { key, index: i };
  }
  
  // Không có key nào khả dụng
  return null;
}

// Đánh dấu key đã được sử dụng cho service cụ thể
export function markApiKeyUsed(service: ServiceType, keyIndex: number, success: boolean = true, ttsModel?: string): void {
  const keys = getApiKeys();
  if (keyIndex >= keys.length) return;
  
  const key = keys[keyIndex];
  const status = getApiKeysStatus();
  const keyStatus = initializeKeyStatus(key, service, status);
  
  if (success) {
    keyStatus.requestCount++;
    keyStatus.lastUsed = Date.now();
    
    // Kiểm tra xem có đạt daily limit không
    let dailyLimit = IMAGE_RATE_LIMIT_PER_DAY;
    if (service === 'voice') {
      dailyLimit = ttsModel === 'gemini-2.5-pro-preview-tts' 
        ? VOICE_RATE_LIMIT_PER_DAY_PRO 
        : VOICE_RATE_LIMIT_PER_DAY_FLASH;
    }
    
    if (keyStatus.requestCount >= dailyLimit) {
      keyStatus.isBlocked = true;
    }
  }
  
  saveApiKeysStatus(status);
}

// Lấy thông tin thống kê về việc sử dụng API keys cho cả 2 services
export function getApiKeysStats(): {
  totalKeys: number;
  image: {
    availableKeys: number;
    blockedKeys: number;
    dailyUsage: { [key: string]: number };
  };
  voice: {
    availableKeys: number;
    blockedKeys: number;
    dailyUsage: { [key: string]: number };
  };
} {
  const keys = getApiKeys();
  const status = getApiKeysStatus();
  
  const imageStats = { availableKeys: 0, blockedKeys: 0, dailyUsage: {} as { [key: string]: number } };
  const voiceStats = { availableKeys: 0, blockedKeys: 0, dailyUsage: {} as { [key: string]: number } };
  
  keys.forEach((key, index) => {
    // Image service stats
    const imageKeyStatus = initializeKeyStatus(key, 'image', status);
    resetDailyCountIfNeeded(imageKeyStatus);
    
    imageStats.dailyUsage[`Key ${index + 1}`] = imageKeyStatus.requestCount;
    
    if (imageKeyStatus.isBlocked || imageKeyStatus.requestCount >= IMAGE_RATE_LIMIT_PER_DAY) {
      imageStats.blockedKeys++;
    } else {
      imageStats.availableKeys++;
    }
    
    // Voice service stats
    const voiceKeyStatus = initializeKeyStatus(key, 'voice', status);
    resetDailyCountIfNeeded(voiceKeyStatus);
    
    voiceStats.dailyUsage[`Key ${index + 1}`] = voiceKeyStatus.requestCount;
    
    // Voice có 2 models với limits khác nhau, dùng limit thấp hơn để tính available
    const voiceDailyLimit = Math.min(VOICE_RATE_LIMIT_PER_DAY_FLASH, VOICE_RATE_LIMIT_PER_DAY_PRO);
    
    if (voiceKeyStatus.isBlocked || voiceKeyStatus.requestCount >= voiceDailyLimit) {
      voiceStats.blockedKeys++;
    } else {
      voiceStats.availableKeys++;
    }
  });
  
  return {
    totalKeys: keys.length,
    image: imageStats,
    voice: voiceStats,
  };
}

// Reset tất cả API keys (dùng cho testing hoặc reset thủ công)
export function resetAllApiKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Tính toán thời gian đợi để tránh rate limit per minute cho service cụ thể
export function calculateWaitTime(service: ServiceType): number {
  const rateLimit = service === 'image' ? IMAGE_RATE_LIMIT_PER_MINUTE : VOICE_RATE_LIMIT_PER_MINUTE;
  // Đơn giản hóa: đợi giữa các batch để tránh rate limit per minute
  return Math.ceil(60 / rateLimit) * 1000;
}
