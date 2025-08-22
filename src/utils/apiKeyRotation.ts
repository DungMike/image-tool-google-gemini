import type { ApiKeyStatus, ApiKeyRotationState } from '@/types';

const STORAGE_KEY = 'gemini_api_keys_status';
const RATE_LIMIT_PER_DAY = parseInt(import.meta.env.VITE_RATE_LIMIT_PER_DAY) || 70;
const RATE_LIMIT_PER_MINUTE = parseInt(import.meta.env.VITE_RATE_LIMIT_PER_MINUTE) || 10;

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
function initializeKeyStatus(key: string, status: ApiKeyRotationState): ApiKeyStatus {
  if (!status[key]) {
    status[key] = {
      requestCount: 0,
      lastResetDate: new Date().toDateString(),
      isBlocked: false,
      lastUsed: 0,
    };
  }
  return status[key];
}

// Reset số lượng request nếu là ngày mới
function resetDailyCountIfNeeded(keyStatus: ApiKeyStatus): void {
  if (isNewDay(keyStatus.lastResetDate)) {
    keyStatus.requestCount = 0;
    keyStatus.lastResetDate = new Date().toDateString();
    keyStatus.isBlocked = false;
  }
}

// Kiểm tra rate limit per minute
function checkMinuteRateLimit(keyStatus: ApiKeyStatus): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  
  // Nếu lần sử dụng cuối cách đây ít hơn 1 phút và đã đạt limit per minute
  if (keyStatus.lastUsed > oneMinuteAgo) {
    // Đơn giản hóa: giả sử mỗi phút chỉ cho phép RATE_LIMIT_PER_MINUTE requests
    // Trong thực tế, bạn có thể cần tracking chi tiết hơn
    return false;
  }
  
  return true;
}

// Lấy API key khả dụng tiếp theo
export function getNextAvailableApiKey(): { key: string; index: number } | null {
  const keys = getApiKeys();
  if (keys.length === 0) return null;
  
  const status = getApiKeysStatus();
  
  // Tìm key khả dụng
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyStatus = initializeKeyStatus(key, status);
    
    // Reset daily count nếu cần
    resetDailyCountIfNeeded(keyStatus);
    
    // Kiểm tra daily limit
    if (keyStatus.requestCount >= RATE_LIMIT_PER_DAY) {
      keyStatus.isBlocked = true;
      continue;
    }
    
    // Kiểm tra minute rate limit (đơn giản hóa)
    if (!checkMinuteRateLimit(keyStatus)) {
      continue;
    }
    
    // Key này khả dụng
    saveApiKeysStatus(status);
    return { key, index: i };
  }
  
  // Không có key nào khả dụng
  return null;
}

// Đánh dấu key đã được sử dụng
export function markApiKeyUsed(keyIndex: number, success: boolean = true): void {
  const keys = getApiKeys();
  if (keyIndex >= keys.length) return;
  
  const key = keys[keyIndex];
  const status = getApiKeysStatus();
  const keyStatus = initializeKeyStatus(key, status);
  
  if (success) {
    keyStatus.requestCount++;
    keyStatus.lastUsed = Date.now();
    
    // Kiểm tra xem có đạt daily limit không
    if (keyStatus.requestCount >= RATE_LIMIT_PER_DAY) {
      keyStatus.isBlocked = true;
    }
  }
  
  saveApiKeysStatus(status);
}

// Lấy thông tin thống kê về việc sử dụng API keys
export function getApiKeysStats(): {
  totalKeys: number;
  availableKeys: number;
  blockedKeys: number;
  dailyUsage: { [key: string]: number };
} {
  const keys = getApiKeys();
  const status = getApiKeysStatus();
  
  let availableKeys = 0;
  let blockedKeys = 0;
  const dailyUsage: { [key: string]: number } = {};
  
  keys.forEach((key, index) => {
    const keyStatus = initializeKeyStatus(key, status);
    resetDailyCountIfNeeded(keyStatus);
    
    dailyUsage[`Key ${index + 1}`] = keyStatus.requestCount;
    
    if (keyStatus.isBlocked || keyStatus.requestCount >= RATE_LIMIT_PER_DAY) {
      blockedKeys++;
    } else {
      availableKeys++;
    }
  });
  
  return {
    totalKeys: keys.length,
    availableKeys,
    blockedKeys,
    dailyUsage,
  };
}

// Reset tất cả API keys (dùng cho testing hoặc reset thủ công)
export function resetAllApiKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Tính toán thời gian đợi để tránh rate limit per minute
export function calculateWaitTime(): number {
  // Đơn giản hóa: đợi 6 giây giữa các batch để tránh rate limit per minute
  return Math.ceil(60 / RATE_LIMIT_PER_MINUTE) * 1000;
}
