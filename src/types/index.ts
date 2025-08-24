export interface GeneratedImage {
  id: string;
  prompt: string;
  originalPrompt: string;
  imageUrl: string;
  imageData?: string; // base64 data
  status: 'generating' | 'success' | 'error';
  error?: string;
  timestamp: number;
}

export interface ApiKeyStatus {
  requestCount: number;
  lastResetDate: string;
  isBlocked: boolean;
  lastUsed: number;
}

export interface ServiceApiKeyStatus {
  image: ApiKeyStatus;
  voice: ApiKeyStatus;
}

export interface ApiKeyRotationState {
  [key: string]: ServiceApiKeyStatus;
}

export type ImagenModel = 
  | 'imagen-3.0-generate-002'
  | 'imagen-4.0-generate-001'
  | 'imagen-4.0-ultra-generate-001'
  | 'imagen-4.0-fast-generate-001';

export interface ImagenModelInfo {
  id: ImagenModel;
  name: string;
  description: string;
  speed: 'Fast' | 'Standard' | 'Slow';
  quality: 'Standard' | 'High' | 'Ultra';
}

export interface GenerationConfig {
  imagesPerPrompt: number;
  concurrentRequests: number;
  model: ImagenModel;
  safetySettings?: any;
}

export interface ParsedPrompts {
  prompts: string[];
  source: 'textarea' | 'csv' | 'json' | 'txt';
  filename?: string;
}

export interface BatchGenerationProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  currentModel?: ImagenModel;
  onRegenerate: (newPrompt: string, model?: ImagenModel) => Promise<void>;
  isLoading: boolean;
}

export type FileType = 'csv' | 'json' | 'txt';

export interface UploadedFile {
  file: File;
  type: FileType;
  content: string;
}

// TTS Types
export type TTSModel = 
  | 'gemini-2.5-flash-preview-tts'
  | 'gemini-2.5-pro-preview-tts';

export interface TTSModelInfo {
  id: TTSModel;
  name: string;
  description: string;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay: number;
  };
}

export interface VoiceConfig {
  name: string;
  description: string;
  category: 'bright' | 'upbeat' | 'informative' | 'firm' | 'excitable' | 'youthful' | 'breezy' | 'easy-going' | 'breathy' | 'clear' | 'smooth' | 'gravelly' | 'soft' | 'mature' | 'casual' | 'forward' | 'even' | 'friendly' | 'lively' | 'knowledgeable' | 'warm' | 'gentle';
}

export interface GeneratedVoice {
  id: string;
  text: string;
  originalText: string;
  customPrompt?: string;
  voiceName: string;
  audioUrl?: string;
  audioData?: string; // base64 audio data
  status: 'generating' | 'success' | 'error';
  error?: string;
  timestamp: number;
  duration?: number; // in seconds
}

export interface TTSGenerationConfig {
  textsPerVoice: number;
  concurrentRequests: number;
  model: TTSModel;
  voiceName: string;
  customPrompt?: string;
}

export interface TTSBatchProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export interface TTSRegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentText: string;
  currentVoice: string;
  currentModel?: TTSModel;
  currentCustomPrompt?: string;
  onRegenerate: (newText: string, voiceName: string, model?: TTSModel, customPrompt?: string) => Promise<void>;
  isLoading: boolean;
}
