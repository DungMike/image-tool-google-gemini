import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { toast } from 'react-toastify';
import { 
  SpeakerWaveIcon, 
  ArrowDownTrayIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

// Atoms
import { 
  sortedVoicesAtom, 
  updateVoiceAtom, 
  resetVoicesAtom,
  upsertVoiceAtom 
} from '@/state/atoms';

// Components
import { TTSInput } from '@/components/TTSInput';
import { VoiceGallery } from '@/components/VoiceGallery';
import { TTSRegenerateModal } from '@/components/TTSRegenerateModal';
import { ApiKeyStatus } from '@/components/ApiKeyStatus';
import { BatchProgress } from '@/components/BatchProgress';

// Utils
import { parsePrompts, validatePrompts } from '@/utils/promptParser';
import { batchGenerateVoices, regenerateVoice, TTS_MODELS } from '@/utils/ttsGeneration';
import { exportVoicesToZip, validateVoiceExport, estimateZipSize } from '@/utils/audioExport';
import { getApiKeysStats } from '@/utils/apiKeyRotation';

// Types
import type { 
  TTSGenerationConfig, 
  TTSBatchProgress,
  TTSModel,
  ChunkingConfig 
} from '@/types';

export function VoiceGeneration() {
  // Input state
  const [textareaValue, setTextareaValue] = useState('');

  const [textsPerVoice, setTextsPerVoice] = useState(1);
  const [selectedModel, setSelectedModel] = useState<TTSModel>('gemini-2.5-flash-preview-tts');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Chunking configuration
  const [chunkingConfig, setChunkingConfig] = useState<ChunkingConfig>({
    sentencesPerChunk: 5,
    maxWordsPerChunk: 2000,
    enabled: false,
  });
  
  // Atom-based voice management
  const [voices] = useAtom(sortedVoicesAtom);
  const [, updateVoice] = useAtom(updateVoiceAtom);
  const [, resetVoices] = useAtom(resetVoicesAtom);
  const [, upsertVoice] = useAtom(upsertVoiceAtom);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<TTSBatchProgress>({
    total: 0,
    completed: 0,
    failed: 0,
  });
  
  // Modal state
  const [regenerateModal, setRegenerateModal] = useState<{
    isOpen: boolean;
    voiceId: string;
    currentText: string;
    currentVoice: string;
    currentModel: TTSModel;
    currentCustomPrompt?: string;
  }>({
    isOpen: false,
    voiceId: '',
    currentText: '',
    currentVoice: 'Kore',
    currentModel: 'gemini-2.5-flash-preview-tts',
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Handle batch generation
  const handleGenerate = useCallback(async () => {
    try {
      // Check API keys availability for voice service
      const keyStats = getApiKeysStats();
      if (keyStats.voice.availableKeys === 0) {
        toast.error('No available API keys for voice generation. All keys have reached their daily limit.');
        return;
      }
      
      // Parse and validate texts with chunking
      const parsedTexts = await parsePrompts(textareaValue, undefined, chunkingConfig);
      const { valid: validTexts, invalid: invalidTexts, warnings } = validatePrompts(
        parsedTexts.prompts, 
        chunkingConfig.maxWordsPerChunk
      );
      
      if (invalidTexts.length > 0) {
        toast.warning(`${invalidTexts.length} invalid texts were skipped`);
      }
      
      if (warnings.length > 0) {
        console.warn('Validation warnings:', warnings);
        warnings.forEach(warning => toast.warning(warning));
      }
      
      if (validTexts.length === 0) {
        toast.error('No valid texts found');
        return;
      }
      
      // Calculate total voices to generate
      const totalVoices = validTexts.length * textsPerVoice;
      
      // Get selected model info for rate limit checking
      const modelInfo = TTS_MODELS.find(m => m.id === selectedModel);
      const dailyLimit = modelInfo?.rateLimit.requestsPerDay || 50;
      
      // Warn if generating many voices or approaching limits
      if (totalVoices > 20) {
        const confirm = window.confirm(
          `You're about to generate ${totalVoices} voices. This may take a long time and use significant API quota. Continue?`
        );
        if (!confirm) return;
      }
      
      if (totalVoices > dailyLimit * keyStats.voice.availableKeys) {
        const confirm = window.confirm(
          `Warning: You're requesting ${totalVoices} voices but have a daily limit of ${dailyLimit * keyStats.voice.availableKeys} across all keys. Some requests may fail. Continue?`
        );
        if (!confirm) return;
      }
      
      // Reset voices and initialize generation state
      resetVoices();
      setIsGenerating(true);
      setBatchProgress({
        total: totalVoices,
        completed: 0,
        failed: 0,
      });
      
      const config: TTSGenerationConfig = {
        textsPerVoice,
        concurrentRequests: 5,
        model: selectedModel,
        voiceName: selectedVoice,
        customPrompt: customPrompt.trim() || undefined,
        chunkingConfig,
      };
      
      console.log('🎯 Starting voice generation with config:', {
        textsCount: validTexts.length,
        textsPerVoice,
        totalVoices,
        chunkingEnabled: chunkingConfig.enabled,
        chunkingConfig: chunkingConfig.enabled ? chunkingConfig : 'disabled'
      });
      
      // Generate single timestamp for this batch to ensure consistent IDs
      const timestamp = Date.now();
      
      // Start generation with progress tracking and real-time voice updates
      // batchGenerateVoices will create initial voices and update them as they complete
      const results = await batchGenerateVoices(
        validTexts,
        config,
        (progress, completedVoices) => {
          setBatchProgress(progress);
          
          // Update voices in real-time as they complete/initialize
          if (completedVoices && completedVoices.length > 0) {
            console.log('📥 Received voices in callback:', completedVoices.map(v => ({ id: v.id, filename: v.filename, status: v.status })));
            // Use upsertVoice to handle both add and update
            completedVoices.forEach(voice => {
              upsertVoice(voice);
            });
          }
        },
        timestamp // Pass consistent timestamp
      );
      
      console.log('🏁 Voice generation completed. Final results:', {
        total: results.length,
        successful: results.filter(v => v.status === 'success').length,
        failed: results.filter(v => v.status === 'error').length,
        orderedFilenames: results.map(v => v.filename)
      });
      
      // Show completion toast
      const successful = results.filter(voice => voice.status === 'success').length;
      const failed = results.filter(voice => voice.status === 'error').length;
      
      if (successful > 0) {
        toast.success(`Generated ${successful} voices successfully!`);
      }
      
      if (failed > 0) {
        toast.warning(`${failed} voices failed to generate`);
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [textareaValue, textsPerVoice, selectedModel, selectedVoice, customPrompt, chunkingConfig, resetVoices, upsertVoice]);

  // Handle single voice regeneration
  const handleRegenerateVoice = useCallback((voiceId: string, currentText: string, currentVoice: string, currentCustomPrompt?: string) => {
    setRegenerateModal({
      isOpen: true,
      voiceId,
      currentText,
      currentVoice,
      currentModel: selectedModel,
      currentCustomPrompt,
    });
  }, [selectedModel]);

  // Handle regenerate modal submit
  const handleRegenerateSubmit = useCallback(async (newText: string, voiceName: string, model?: TTSModel, customPrompt?: string) => {
    const { voiceId } = regenerateModal;
    const originalVoice = voices.find(voice => voice.id === voiceId);
    
    if (!originalVoice) {
      toast.error('Original voice not found');
      return;
    }
    
    setIsRegenerating(true);
    
    try {
      const useModel = model || selectedModel;
      const newVoice = await regenerateVoice(voiceId, newText, originalVoice, useModel, voiceName, customPrompt);
      
      // Update the voice in atom storage
      updateVoice({ id: voiceId, voice: newVoice });
      
      if (newVoice.status === 'success') {
        toast.success(`Voice regenerated successfully! New filename: ${newVoice.filename}`);
      } else {
        toast.error(`Regeneration failed: ${newVoice.error}`);
      }
      
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error(`Regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegenerating(false);
    }
  }, [regenerateModal, voices, selectedModel, updateVoice]);

  // Handle export all voices
  const handleExportAll = useCallback(async () => {
    const validation = validateVoiceExport(voices);
    
    if (!validation.canExport) {
      toast.error('No voices available for export');
      return;
    }
    
    if (validation.issues.length > 0) {
      const issuesText = validation.issues.join('\n');
      const confirm = window.confirm(`Export Issues:\n\n${issuesText}\n\nContinue with export?`);
      if (!confirm) return;
    }
    
    setIsExporting(true);
    
    try {
      const { estimatedSizeMB } = estimateZipSize(voices);
      
      await exportVoicesToZip(
        voices,
        `batch_generated_voices_${new Date().toISOString().split('T')[0]}.zip`,
        (current, total) => {
          // Could add export progress here if needed
          console.log(`Exporting: ${current}/${total}`);
        }
      );
      
      toast.success(`Successfully exported ${validation.successfulCount} voices (~${estimatedSizeMB}MB)`);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [voices]);

  // Calculate stats for display
  const stats = {
    total: voices.length,
    successful: voices.filter(voice => voice.status === 'success').length,
    failed: voices.filter(voice => voice.status === 'error').length,
    generating: voices.filter(voice => voice.status === 'generating').length,
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <SpeakerWaveIcon className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Batch Voice Generator
                </h1>
                <p className="text-sm text-gray-600">
                  Generate multiple voices from texts using Google Gemini TTS API
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
                {stats.total > 0 && (
                  <>
                    <span>Total: {stats.total}</span>
                    <span className="text-green-600">✓ {stats.successful}</span>
                    {stats.failed > 0 && <span className="text-red-600">✗ {stats.failed}</span>}
                  </>
                )}
              </div>
              
              <button
                onClick={handleExportAll}
                disabled={stats.successful === 0 || isExporting}
                className="btn-secondary text-sm"
                title="Download all successful voices as ZIP"
              >
                {isExporting ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Export All ({stats.successful})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* API Key Status */}
            <ApiKeyStatus service="voice" />
            
            {/* TTS Info */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-gray-900">TTS Info</h3>
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Flash Model:</span>
                  <span>100/day per key</span>
                </div>
                <div className="flex justify-between">
                  <span>Pro Model:</span>
                  <span>50/day per key</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Limit:</span>
                  <span>10/min per key</span>
                </div>
                <div className="flex justify-between">
                  <span>Voices:</span>
                  <span>30+ available</span>
                </div>
              </div>
            </div>


          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Input Section */}
            <div className="card p-6">
              <TTSInput
                textareaValue={textareaValue}
                onTextareaChange={setTextareaValue}
                textsPerVoice={textsPerVoice}
                onTextsPerVoiceChange={setTextsPerVoice}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
                chunkingConfig={chunkingConfig}
                onChunkingConfigChange={setChunkingConfig}
                disabled={isGenerating}
              />
              
              {/* Generate Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !textareaValue.trim()}
                  className="btn-primary w-full py-3 text-base"
                >
                  {isGenerating ? (
                    <>
                      <div className="loading-spinner w-5 h-5 mr-2" />
                      Generating Voices...
                    </>
                  ) : (
                    <>
                      <SpeakerWaveIcon className="w-5 h-5 mr-2" />
                      Generate Voices
                    </>
                  )}
                </button>
                
                {!textareaValue.trim() && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Enter texts or upload a file to get started
                  </p>
                )}
              </div>
            </div>

            {/* Batch Progress */}
            <BatchProgress 
              progress={batchProgress} 
              isVisible={isGenerating || batchProgress.total > 0} 
            />

            {/* Voice Gallery */}
            <VoiceGallery
              voices={voices}
              onRegenerateVoice={handleRegenerateVoice}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      </main>

      {/* Regenerate Modal */}
      <TTSRegenerateModal
        isOpen={regenerateModal.isOpen}
        onClose={() => setRegenerateModal(prev => ({ ...prev, isOpen: false }))}
        currentText={regenerateModal.currentText}
        currentVoice={regenerateModal.currentVoice}
        currentModel={regenerateModal.currentModel}
        currentCustomPrompt={regenerateModal.currentCustomPrompt}
        onRegenerate={handleRegenerateSubmit}
        isLoading={isRegenerating}
      />
    </div>
  );
}
