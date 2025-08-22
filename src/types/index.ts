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

export interface ApiKeyRotationState {
  [key: string]: ApiKeyStatus;
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
