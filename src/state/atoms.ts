import { atom } from 'jotai';
import type { ImagenModel, AspectRatio, TTSModel, GeneratedVoice } from '@/types';

// Removed queue interface - using simple sequential processing

export const selectedModelAtom = atom<ImagenModel>('gemini-2.5-flash-image-preview');
export const aspectRatioAtom = atom<AspectRatio>('16:9');
export const selectedTTSModelAtom = atom<TTSModel>('gemini-2.5-flash-preview-tts');

// TTS Voice Storage với ordered management
export const orderedVoicesAtom = atom<GeneratedVoice[]>([]);

// Helper atom để sắp xếp voices theo thứ tự chính xác
export const sortedVoicesAtom = atom(
  (get) => {
    const voices = get(orderedVoicesAtom);
    return [...voices].sort((a, b) => {
      // Sắp xếp theo chunkIndex trước, sau đó theo voiceIndex
      if (a.chunkIndex !== b.chunkIndex) {
        return a.chunkIndex - b.chunkIndex;
      }
      return a.voiceIndex - b.voiceIndex;
    });
  }
);

// Helper atom để cập nhật một voice cụ thể
export const updateVoiceAtom = atom(
  null,
  (get, set, update: { id: string; voice: Partial<GeneratedVoice> }) => {
    const voices = get(orderedVoicesAtom);
    const updatedVoices = voices.map(voice => 
      voice.id === update.id 
        ? { ...voice, ...update.voice }
        : voice
    );
    set(orderedVoicesAtom, updatedVoices);
  }
);

// Helper atom để upsert (add or update) một voice
export const upsertVoiceAtom = atom(
  null,
  (get, set, voice: GeneratedVoice) => {
    const voices = get(orderedVoicesAtom);
    const existingIndex = voices.findIndex(v => v.id === voice.id);
    
    if (existingIndex >= 0) {
      // Update existing voice
      const updatedVoices = [...voices];
      updatedVoices[existingIndex] = voice;
      set(orderedVoicesAtom, updatedVoices);
    } else {
      // Add new voice
      set(orderedVoicesAtom, [...voices, voice]);
    }
  }
);

// Helper atom để thêm voices mới
export const addVoicesAtom = atom(
  null,
  (get, set, newVoices: GeneratedVoice[]) => {
    const currentVoices = get(orderedVoicesAtom);
    set(orderedVoicesAtom, [...currentVoices, ...newVoices]);
  }
);

// Helper atom để reset voices
export const resetVoicesAtom = atom(
  null,
  (_get, set) => {
    set(orderedVoicesAtom, []);
  }
);

// Removed queue management atoms - using simple sequential processing
