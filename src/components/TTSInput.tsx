import React, { useState, useRef, useCallback } from 'react';
import { DocumentArrowUpIcon, XMarkIcon, InformationCircleIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import type { UploadedFile, FileType, TTSModel } from '@/types';
import { detectFileType, readFileContent, fileTemplates } from '@/utils/promptParser';
import { toast } from 'react-toastify';
import { TTSModelSelector } from './TTSModelSelector';
import { VoiceSelector } from './VoiceSelector';

interface TTSInputProps {
  textareaValue: string;
  onTextareaChange: (value: string) => void;
  uploadedFile: UploadedFile | null;
  onFileUpload: (file: UploadedFile | null) => void;
  textsPerVoice: number;
  onTextsPerVoiceChange: (value: number) => void;
  selectedModel: TTSModel;
  onModelChange: (model: TTSModel) => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  disabled?: boolean;
}

export function TTSInput({
  textareaValue,
  onTextareaChange,
  uploadedFile,
  onFileUpload,
  textsPerVoice,
  onTextsPerVoiceChange,
  selectedModel,
  onModelChange,
  selectedVoice,
  onVoiceChange,
  customPrompt,
  onCustomPromptChange,
  disabled = false,
}: TTSInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const fileType = detectFileType(file.name);
      
      if (!fileType) {
        toast.error('Unsupported file type. Please upload CSV, JSON, or TXT files.');
        return;
      }
      
      // Kiểm tra kích thước file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Please upload files smaller than 10MB.');
        return;
      }
      
      const content = await readFileContent(file);
      
      const uploadedFile: UploadedFile = {
        file,
        type: fileType,
        content,
      };
      
      onFileUpload(uploadedFile);
      toast.success(`File "${file.name}" uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onFileUpload]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Remove uploaded file
  const handleRemoveFile = useCallback(() => {
    onFileUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileUpload]);

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

  // Download template files
  const handleDownloadTemplate = useCallback((type: FileType) => {
    const content = fileTemplates[type];
    const filename = `texts_template.${type}`;
    const mimeTypes = {
      csv: 'text/csv',
      json: 'application/json',
      txt: 'text/plain',
    };
    
    const blob = new Blob([content], { type: mimeTypes[type] });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
    toast.success(`Template file "${filename}" downloaded!`);
  }, []);

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
    </div>
  );
}

