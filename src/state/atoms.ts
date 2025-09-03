import { atom } from 'jotai';
import type { ImagenModel, AspectRatio, TTSModel } from '@/types';

export const selectedModelAtom = atom<ImagenModel>('gemini-2.5-flash-image-preview');
export const aspectRatioAtom = atom<AspectRatio>('16:9');
export const selectedTTSModelAtom = atom<TTSModel>('gemini-2.5-flash-preview-tts');
