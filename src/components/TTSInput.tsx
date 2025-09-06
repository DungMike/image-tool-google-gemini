import { useState, useCallback } from 'react';
import { InformationCircleIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import type { TTSModel, ChunkingConfig } from '@/types';
import { toast } from 'react-toastify';
import { TTSModelSelector } from './TTSModelSelector';
import { VoiceSelector } from './VoiceSelector';
import { getApiKeys } from '@/utils/apiKeyRotation';

interface TTSInputProps {
  textareaValue: string;
  onTextareaChange: (value: string) => void;
  textsPerVoice: number;
  onTextsPerVoiceChange: (value: number) => void;
  selectedModel: TTSModel;
  onModelChange: (model: TTSModel) => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  chunkingConfig: ChunkingConfig;
  onChunkingConfigChange: (config: ChunkingConfig) => void;
  disabled?: boolean;
  selectedKey: number;
  onKeyChange: (key: number) => void;
}

export function TTSInput({
  textareaValue,
  onTextareaChange,
  textsPerVoice,
  onTextsPerVoiceChange,
  selectedModel,
  onModelChange,
  selectedVoice,
  onVoiceChange,
  customPrompt,
  onCustomPromptChange,
  chunkingConfig,
  onChunkingConfigChange,
  disabled = false,
  selectedKey,
  onKeyChange,
}: TTSInputProps) {

  console.log("selectedKey", selectedKey)
  const [showGuidance, setShowGuidance] = useState(false);

  // Load example texts
  const handleLoadExamples = useCallback(() => {
    const examples = [
      'Welcome to our service! We are excited to help you today.',
      'The weather is beautiful today. Perfect for a walk in the park.',
      'Technology continues to evolve at an incredible pace.',
      'Reading books is one of the most enriching activities you can do.',
      'Thank you for choosing us. Have a wonderful day!',
    ];
    onTextareaChange(examples.join('\n'));
    toast.info('Example texts loaded!');
  }, [onTextareaChange]);
  const keys = getApiKeys()
  console.log("keys", keys.length)

  return (
    <div className="space-y-6">
      {/* Header với guidance toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SpeakerWaveIcon className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Input Texts for Voice Generation</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowGuidance(!showGuidance)}
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
        >
          <InformationCircleIcon className="h-4 w-4" />
          {showGuidance ? 'Hide Guidance' : 'Show Guidance'}
        </button>
      </div>

      {/* Voice Generation Guidance */}
      {showGuidance && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">Voice Generation Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Keep texts concise and clear for better pronunciation</li>
            <li>• Use punctuation to control pacing and pauses</li>
            <li>• Avoid complex abbreviations or technical jargon</li>
            <li>• Use custom prompts to add emotion or style (e.g., "cheerfully", "slowly")</li>
            <li>• Different voices have unique characteristics - experiment to find the best fit</li>
          </ul>
        </div>
      )}

      {/* Textarea Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="texts-textarea" className="block text-sm font-medium text-gray-700">
            Enter Texts (one per line)
          </label>
          <button
            type="button"
            onClick={handleLoadExamples}
            disabled={disabled}
            className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            Load Examples
          </button>
        </div>
        
        <textarea
          id="texts-textarea"
          value={textareaValue}
          onChange={(e) => onTextareaChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter your texts here, one per line...&#10;Example:&#10;Welcome to our service!&#10;Thank you for choosing us.&#10;Have a wonderful day!"
          className="input-field min-h-[120px] resize-y custom-scrollbar"
          rows={6}
        />
        
        {textareaValue && (
          <p className="text-xs text-gray-500">
            {textareaValue.split('\n').filter(line => line.trim()).length} texts entered
          </p>
        )}
      </div>

      {/* OR Divider */}
      {/* <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-50 px-2 text-gray-500">OR</span>
        </div>
      </div> */}

      {/* File Upload */}
      {/* <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Upload File (CSV, JSON, TXT)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Templates:</span>
            {(['csv', 'json', 'txt'] as FileType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleDownloadTemplate(type)}
                className="text-xs text-primary-600 hover:text-primary-700 uppercase"
              >
                {type}
              </button>
            ))}
          </div>
        </div> */}

        {/* File Drop Zone */}
        {/* <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
            ${isDragOver 
              ? 'border-primary-500 bg-primary-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt"
            onChange={handleFileInputChange}
            disabled={disabled}
            className="hidden"
          />
          
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">CSV, JSON, or TXT files only</p>
        </div> */}

        {/* Uploaded File Display */}
        {/* {uploadedFile && (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-3">
              <DocumentArrowUpIcon className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">{uploadedFile.file.name}</p>
                <p className="text-xs text-green-700">
                  {uploadedFile.type.toUpperCase()} • {(uploadedFile.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div> */}

      {/* Generation Config */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-gray-700">Voice Generation Settings</h3>
        
        {/* Model Selection */}
        <TTSModelSelector
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          disabled={disabled}
        />
        
        {/* Voice Selection */}
        <VoiceSelector
          selectedVoice={selectedVoice}
          onVoiceChange={onVoiceChange}
          disabled={disabled}
        />
        
        <div className="flex items-center gap-4">
          <label htmlFor="voices-key" className="text-sm text-gray-600 whitespace-nowrap">
            Key use
          </label>
          <select
            id="ces-key"
            value={selectedKey}
            onChange={(e) => onKeyChange(parseInt(e.target.value))}
            className="input-field w-20"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
        </div>
        {/* Custom Prompt */}
        <div className="space-y-2">
          <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700">
            Custom Prompt (Optional)
          </label>
          <input
            id="custom-prompt"
            type="text"
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g., Say cheerfully, Read slowly with emotion, Speak in a deep voice"
            className="input-field"
          />
          <p className="text-xs text-gray-500">
            Add instructions for how the text should be spoken (tone, pace, emotion, etc.)
          </p>
        </div>
        
        {/* Voices per text */}
        <div className="flex items-center gap-4">
          <label htmlFor="voices-per-text" className="text-sm text-gray-600 whitespace-nowrap">
            Voices per text:
          </label>
          <select
            id="voices-per-text"
            value={textsPerVoice}
            onChange={(e) => onTextsPerVoiceChange(parseInt(e.target.value))}
            disabled={disabled}
            className="input-field w-20"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
          
          <p className="text-xs text-gray-500">
            Higher numbers will use more API quota
          </p>
        </div>
      </div>

      {/* Text Chunking Configuration */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Text Chunking</h3>
            <p className="text-xs text-gray-500">Combine multiple sentences into single audio files</p>
          </div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={chunkingConfig.enabled}
              onChange={(e) => onChunkingConfigChange({ ...chunkingConfig, enabled: e.target.checked })}
              disabled={disabled}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">Enable</span>
          </label>
        </div>
        
        {chunkingConfig.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sentences per Chunk */}
            <div className="space-y-2">
              <label htmlFor="sentences-per-chunk" className="block text-sm font-medium text-gray-700">
                Sentences per Chunk
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sentences-per-chunk"
                  type="number"
                  min="1"
                  max="20"
                  value={chunkingConfig.sentencesPerChunk}
                  onChange={(e) => onChunkingConfigChange({ 
                    ...chunkingConfig, 
                    sentencesPerChunk: parseInt(e.target.value) 
                  })}
                  disabled={disabled}
                  className="input-field w-20"
                />
                <span className="text-xs text-gray-500">(1-20)</span>
              </div>
            </div>
            
            {/* Max Words per Chunk */}
            <div className="space-y-2">
              <label htmlFor="max-words-chunk" className="block text-sm font-medium text-gray-700">
                Max Words per Chunk
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="max-words-chunk"
                  type="number"
                  min="100"
                  max="4000"
                  value={chunkingConfig.maxWordsPerChunk}
                  onChange={(e) => onChunkingConfigChange({ 
                    ...chunkingConfig, 
                    maxWordsPerChunk:  parseInt(e.target.value)
                  })}
                  disabled={disabled}
                  className="input-field w-24"
                />
                <span className="text-xs text-gray-500">(≤4000)</span>
              </div>
            </div>
          </div>
        )}
        
        {chunkingConfig.enabled && (
          <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-gray-200">
            <p>• Gom nhiều câu ngắn thành một đoạn để tạo audio dài hơn</p>
            <p>• Giúp tối ưu hóa việc tạo audio từ văn bản có nhiều câu ngắn</p>
            <p>• Mặc định: 5 câu/chunk, tối đa 2000 từ/chunk</p>
          </div>
        )}
      </div>
    </div>
  );
}

