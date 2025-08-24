import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowPathIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import type { RegenerateModalProps, ImagenModel } from '@/types';
import { ModelSelector } from './ModelSelector';

export function RegenerateModal({
  isOpen,
  onClose,
  currentPrompt,
  currentModel = 'imagen-3.0-generate-002',
  onRegenerate,
  isLoading,
}: RegenerateModalProps) {
  const [newPrompt, setNewPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ImagenModel>(currentModel);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with current prompt and model when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewPrompt(currentPrompt);
      setSelectedModel(currentModel);
      setShowSuggestions(false);
      // Focus textarea after modal animation
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentPrompt, currentModel]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedPrompt = newPrompt.trim();
    if (!trimmedPrompt) return;
    
    try {
      await onRegenerate(trimmedPrompt, selectedModel);
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

  // Prompt improvement suggestions
  const suggestions = [
    'Add style information (e.g., "in watercolor style", "photorealistic")',
    'Specify composition (e.g., "close-up portrait", "wide landscape view")',
    'Include lighting details (e.g., "golden hour lighting", "soft studio lighting")',
    'Add quality modifiers (e.g., "high quality", "detailed", "8K resolution")',
    'Describe mood or atmosphere (e.g., "serene", "dramatic", "mystical")',
  ];

  // Quick prompt enhancements
  const quickEnhancements = [
    { label: 'Add "high quality"', transform: (prompt: string) => `${prompt}, high quality` },
    { label: 'Add "detailed"', transform: (prompt: string) => `${prompt}, highly detailed` },
    { label: 'Add "photorealistic"', transform: (prompt: string) => `${prompt}, photorealistic` },
    { label: 'Add "8K resolution"', transform: (prompt: string) => `${prompt}, 8K resolution` },
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
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Regenerate Image
              </Dialog.Title>
              <p className="text-sm text-gray-600 mt-1">
                Modify the prompt to generate a new version of this image
              </p>
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
            {/* Current Prompt Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Original Prompt
              </label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <p className="text-sm text-gray-700">{currentPrompt}</p>
              </div>
            </div>

            {/* New Prompt Input */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="new-prompt" className="block text-sm font-medium text-gray-700">
                      New Prompt
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
                    id="new-prompt"
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Enter your new prompt here..."
                    className="input-field min-h-[100px] resize-y"
                    rows={4}
                  />
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      Press Cmd/Ctrl + Enter to regenerate
                    </p>
                    <p className="text-xs text-gray-500">
                      {newPrompt.length} characters
                    </p>
                  </div>
                </div>

                {/* Model Selection */}
                <div>
                  <ModelSelector
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    disabled={isLoading}
                  />
                </div>

                {/* Quick Enhancements */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Quick Enhancements</p>
                  <div className="flex flex-wrap gap-2">
                    {quickEnhancements.map((enhancement) => (
                      <button
                        key={enhancement.label}
                        type="button"
                        onClick={() => setNewPrompt(enhancement.transform(newPrompt))}
                        disabled={isLoading}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
                      >
                        {enhancement.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                {showSuggestions && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Tips for Better Results
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
                    disabled={isLoading || !newPrompt.trim() || (newPrompt.trim() === currentPrompt.trim() && selectedModel === currentModel)}
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
                        Regenerate Image
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
