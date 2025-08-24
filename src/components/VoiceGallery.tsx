import React, { useState, useCallback, useRef } from 'react';
import { 
  ArrowDownTrayIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import type { GeneratedVoice } from '@/types';
import { downloadAudio } from '@/utils/ttsGeneration';
import { toast } from 'react-toastify';

interface VoiceGalleryProps {
  voices: GeneratedVoice[];
  onRegenerateVoice: (voiceId: string, currentText: string, currentVoice: string, currentCustomPrompt?: string) => void;
  isGenerating?: boolean;
}

interface VoiceCardProps {
  voice: GeneratedVoice;
  onRegenerate: (voiceId: string, currentText: string, currentVoice: string, currentCustomPrompt?: string) => void;
}

// Component cho từng voice card
function VoiceCard({ voice, onRegenerate }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Web Audio API fallback for unsupported formats
  const playWithWebAudioAPI = useCallback(async (audioData: string) => {
    try {
      console.log('🔄 Trying Web Audio API fallback...');
      
      const response = await fetch(audioData);
      const arrayBuffer = await response.arrayBuffer();
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        console.log('🎵 Web Audio API playback ended');
        setIsPlaying(false);
      };
      
      source.start(0);
      setIsPlaying(true);
      console.log('✅ Web Audio API playback started successfully');
      toast.success('Playing audio (Web Audio API)');
      
    } catch (error) {
      console.error('❌ Web Audio API failed:', error);
      toast.error('Audio format not supported by browser');
    }
  }, []);

  // Handle play/pause audio
  const handlePlayPause = useCallback(async () => {
    if (!voice.audioData || voice.status !== 'success') return;

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Set audio source if not set
      if (!audio.src) {
        console.log('Setting audio source:', voice.audioData.substring(0, 100) + '...');
        audio.src = voice.audioData;
      }
      
      try {
        await audio.play();
        setIsPlaying(true);
        console.log('✅ Audio element playback successful');
      } catch (error) {
        console.error('❌ Audio element failed:', error);
        console.log('Audio element error details:', {
          error: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState
        });
        
        // Try Web Audio API as fallback
        await playWithWebAudioAPI(voice.audioData);
      }
    }
  }, [voice.audioData, voice.status, isPlaying, playWithWebAudioAPI]);

  // Handle audio events
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleAudioError = useCallback(() => {
    setIsPlaying(false);
    toast.error('Error playing audio');
  }, []);

  // Handle download audio
  const handleDownload = useCallback(async () => {
    if (voice.status !== 'success' || !voice.audioData) return;
    
    setIsDownloading(true);
    try {
      const filename = `voice_${voice.voiceName}_${voice.id}.wav`;
      await downloadAudio(voice.audioData, filename);
      toast.success('Audio downloaded successfully!');
    } catch (error) {
      console.error('Error downloading audio:', error);
      toast.error('Failed to download audio');
    } finally {
      setIsDownloading(false);
    }
  }, [voice]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    onRegenerate(voice.id, voice.text, voice.voiceName, voice.customPrompt);
  }, [voice.id, voice.text, voice.voiceName, voice.customPrompt, onRegenerate]);

  // Truncate text for display
  const truncatedText = voice.text.length > 100 
    ? `${voice.text.substring(0, 100)}...` 
    : voice.text;

  return (
    <div className="card overflow-hidden">
      {/* Voice Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SpeakerWaveIcon className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-gray-900">{voice.voiceName}</span>
          </div>
          <div className="flex items-center gap-2">
            {voice.status === 'generating' && (
              <div className="loading-spinner w-4 h-4" />
            )}
            {voice.status === 'success' && (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            )}
            {voice.status === 'error' && (
              <div className="w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
        </div>
      </div>

      {/* Audio Player Section */}
      <div className="p-4">
        {voice.status === 'generating' && (
          <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="loading-spinner w-8 h-8 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Generating voice...</p>
            </div>
          </div>
        )}

        {voice.status === 'error' && (
          <div className="flex items-center justify-center py-8 bg-red-50 rounded-lg">
            <div className="text-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 mb-1">Generation failed</p>
              <p className="text-xs text-red-500">{voice.error}</p>
            </div>
          </div>
        )}

        {voice.status === 'success' && voice.audioData && (
          <div className="space-y-3">
            {/* Audio Player */}
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <button
                  onClick={handlePlayPause}
                  className="flex items-center justify-center w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors duration-200"
                >
                  {isPlaying ? (
                    <PauseIcon className="w-6 h-6" />
                  ) : (
                    <PlayIcon className="w-6 h-6 ml-0.5" />
                  )}
                </button>
              </div>
              
              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                onEnded={handleAudioEnded}
                onError={handleAudioError}
                preload="none"
              />
            </div>
          </div>
        )}

        {/* Text Content */}
        <div className="mt-4 space-y-2">
          <div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {showFullText ? voice.text : truncatedText}
            </p>
            {voice.text.length > 100 && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="text-xs text-primary-600 hover:text-primary-700 mt-1"
              >
                {showFullText ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Custom Prompt Display */}
          {voice.customPrompt && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
              <p className="text-xs text-yellow-800">
                <span className="font-medium">Custom prompt:</span> {voice.customPrompt}
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
          <ClockIcon className="w-3 h-3" />
          <span>{new Date(voice.timestamp).toLocaleString()}</span>
          {voice.originalText !== voice.text && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
              Regenerated
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleDownload}
            disabled={voice.status !== 'success' || isDownloading}
            className="btn-primary flex-1 text-xs"
            title="Download audio"
          >
            {isDownloading ? (
              <>
                <div className="loading-spinner w-3 h-3 mr-1" />
                Downloading...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-3 h-3 mr-1" />
                Download
              </>
            )}
          </button>

          <button
            onClick={handleRegenerate}
            disabled={voice.status === 'generating'}
            className="btn-secondary text-xs"
            title="Regenerate with new settings"
          >
            <ArrowPathIcon className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Main VoiceGallery component
export function VoiceGallery({ voices, onRegenerateVoice, isGenerating = false }: VoiceGalleryProps) {
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'generating'>('all');

  // Filter voices based on selected filter
  const filteredVoices = voices.filter(voice => {
    if (filter === 'all') return true;
    return voice.status === filter;
  });

  // Get statistics
  const stats = {
    total: voices.length,
    success: voices.filter(voice => voice.status === 'success').length,
    error: voices.filter(voice => voice.status === 'error').length,
    generating: voices.filter(voice => voice.status === 'generating').length,
  };

  if (voices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <SpeakerWaveIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No voices yet</h3>
        <p className="text-gray-500">
          Enter some texts and click "Generate Voices" to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Generated Voices</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span>Total: {stats.total}</span>
            <span className="text-green-600">Success: {stats.success}</span>
            {stats.error > 0 && <span className="text-red-600">Failed: {stats.error}</span>}
            {stats.generating > 0 && <span className="text-blue-600">Generating: {stats.generating}</span>}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'success', label: 'Success', count: stats.success },
            { key: 'error', label: 'Failed', count: stats.error },
            { key: 'generating', label: 'Generating', count: stats.generating },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              disabled={count === 0}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200
                ${filter === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Generation Status */}
      {isGenerating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="loading-spinner w-5 h-5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Generating voices...</p>
              <p className="text-xs text-blue-700">
                This may take a few minutes. Voices will appear as they're completed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Voices Grid */}
      {filteredVoices.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVoices.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              onRegenerate={onRegenerateVoice}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No voices match the current filter.</p>
        </div>
      )}
    </div>
  );
}

