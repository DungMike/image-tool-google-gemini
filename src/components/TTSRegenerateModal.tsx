import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowPathIcon, LightBulbIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import type { TTSRegenerateModalProps, TTSModel } from '@/types';
import { TTSModelSelector } from './TTSModelSelector';
import { VoiceSelector } from './VoiceSelector';

export function TTSRegenerateModal({
  isOpen,
  onClose,
  currentText,
  currentVoice,
  currentModel = 'gemini-2.5-flash-preview-tts',
  currentCustomPrompt = '',
  onRegenerate,
  isLoading,
}: TTSRegenerateModalProps) {
  const [newText, setNewText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(currentVoice);
  const [selectedModel, setSelectedModel] = useState<TTSModel>(currentModel);
  const [customPrompt, setCustomPrompt] = useState(currentCustomPrompt);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with current values when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewText(currentText);
      setSelectedVoice(currentVoice);
      setSelectedModel(currentModel);
      setCustomPrompt(currentCustomPrompt);
      setShowSuggestions(false);
      // Focus textarea after modal animation
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentText, currentVoice, currentModel, currentCustomPrompt]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedText = newText.trim();
    if (!trimmedText) return;
    
    try {
      await onRegenerate(trimmedText, selectedVoice, selectedModel, customPrompt.trim() || undefined);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
      console.error('Regeneration failed:', error);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Voice generation suggestions
  const suggestions = [
    'Use clear punctuation for better pacing and natural pauses',
    'Keep sentences concise for clearer pronunciation',
    'Use custom prompts to add emotion: "cheerfully", "slowly", "with excitement"',
    'Different voices have unique characteristics - try various options',
    'Avoid complex abbreviations or technical jargon for better results',
  ];

  // Quick custom prompt examples
  const promptExamples = [
    { label: 'Cheerfully', value: 'Say cheerfully' },
    { label: 'Slowly', value: 'Read slowly and clearly' },
    { label: 'With emotion', value: 'Speak with emotion and feeling' },
    { label: 'Professionally', value: 'Speak in a professional tone' },
    { label: 'Energetically', value: 'Say with high energy and enthusiasm' },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <SpeakerWaveIcon className="w-6 h-6 text-primary-600" />
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Regenerate Voice
                </Dialog.Title>
                <p className="text-sm text-gray-600 mt-1">
                  Modify the text, voice, or settings to generate a new version
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Settings Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Text:</span>
                  <p className="text-gray-900 truncate">{currentText}</p>
                </div>
                <div>
                  <span className="text-gray-500">Voice:</span>
                  <p className="text-gray-900">{currentVoice}</p>
                </div>
                <div>
                  <span className="text-gray-500">Custom Prompt:</span>
                  <p className="text-gray-900">{currentCustomPrompt || 'None'}</p>
                </div>
              </div>
            </div>

            {/* New Settings Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Text Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="new-text" className="block text-sm font-medium text-gray-700">
                      Text to Generate
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      <LightBulbIcon className="w-3 h-3" />
                      {showSuggestions ? 'Hide Tips' : 'Show Tips'}
                    </button>
                  </div>
                  
                  <textarea
                    ref={textareaRef}
                    id="new-text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Enter your text here..."
                    className="input-field min-h-[80px] resize-y"
                    rows={3}
                  />
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      Press Cmd/Ctrl + Enter to regenerate
                    </p>
                    <p className="text-xs text-gray-500">
                      {newText.length} characters
                    </p>
                  </div>
                </div>

                {/* Custom Prompt Input */}
                <div>
                  <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Prompt (Optional)
                  </label>
                  <input
                    id="custom-prompt"
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    disabled={isLoading}
                    placeholder="e.g., Say cheerfully, Read slowly with emotion"
                    className="input-field"
                  />
                  
                  {/* Quick Prompt Examples */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-2">Quick examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {promptExamples.map((example) => (
                        <button
                          key={example.label}
                          type="button"
                          onClick={() => setCustomPrompt(example.value)}
                          disabled={isLoading}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
                        >
                          {example.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Model Selection */}
                <div>
                  <TTSModelSelector
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    disabled={isLoading}
                  />
                </div>

                {/* Voice Selection */}
                <div>
                  <VoiceSelector
                    selectedVoice={selectedVoice}
                    onVoiceChange={setSelectedVoice}
                    disabled={isLoading}
                  />
                </div>

                {/* Suggestions */}
                {showSuggestions && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Tips for Better Voice Generation
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={
                      isLoading || 
                      !newText.trim() || 
                      (
                        newText.trim() === currentText.trim() && 
                        selectedVoice === currentVoice && 
                        selectedModel === currentModel &&
                        customPrompt.trim() === currentCustomPrompt.trim()
                      )
                    }
                    className="btn-primary"
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spinner w-4 h-4 mr-2" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2" />
                        Regenerate Voice
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

