import React from 'react';
import { ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { TTSModel, TTSModelInfo } from '@/types';
import { TTS_MODELS } from '@/utils/ttsGeneration';

interface TTSModelSelectorProps {
  selectedModel: TTSModel;
  onModelChange: (model: TTSModel) => void;
  disabled?: boolean;
}

export function TTSModelSelector({ selectedModel, onModelChange, disabled = false }: TTSModelSelectorProps) {
  const selectedModelInfo = TTS_MODELS.find(model => model.id === selectedModel);

  const getRateLimitColor = (requestsPerDay: number) => {
    if (requestsPerDay >= 100) return 'text-green-600 bg-green-50';
    if (requestsPerDay >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="tts-model-selector" className="text-sm font-medium text-gray-700">
          TTS Model
        </label>
        <div className="group relative">
          <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 top-6 z-10 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
            Choose the TTS model based on your needs:
            <br />• Flash: Faster generation, good quality, higher daily limit
            <br />• Pro: Higher quality voice, more natural, lower daily limit
          </div>
        </div>
      </div>

      <div className="relative">
        <select
          id="tts-model-selector"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value as TTSModel)}
          disabled={disabled}
          className="input-field appearance-none pr-10 cursor-pointer disabled:cursor-not-allowed"
        >
          {TTS_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        
        <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Selected Model Info */}
      {selectedModelInfo && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{selectedModelInfo.name}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRateLimitColor(selectedModelInfo.rateLimit.requestsPerDay)}`}>
              {selectedModelInfo.rateLimit.requestsPerDay}/day
            </span>
          </div>
          
          <p className="text-sm text-gray-600">{selectedModelInfo.description}</p>
          
          {/* Rate Limits */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white/70 rounded p-2 text-center">
              <div className="font-medium text-gray-900">{selectedModelInfo.rateLimit.requestsPerMinute}</div>
              <div className="text-gray-600">req/min</div>
            </div>
            <div className="bg-white/70 rounded p-2 text-center">
              <div className="font-medium text-gray-900">{selectedModelInfo.rateLimit.tokensPerMinute.toLocaleString()}</div>
              <div className="text-gray-600">tokens/min</div>
            </div>
            <div className="bg-white/70 rounded p-2 text-center">
              <div className="font-medium text-gray-900">{selectedModelInfo.rateLimit.requestsPerDay}</div>
              <div className="text-gray-600">req/day</div>
            </div>
          </div>
          
          {/* Model-specific recommendations */}
          <div className="text-xs text-gray-500 space-y-1">
            {selectedModelInfo.id === 'gemini-2.5-flash-preview-tts' && (
              <p>🚀 Recommended for batch generation - Higher daily limit (100 requests)</p>
            )}
            {selectedModelInfo.id === 'gemini-2.5-pro-preview-tts' && (
              <p>🎯 Premium quality - Lower daily limit (50 requests), use for important content</p>
            )}
          </div>
        </div>
      )}

      {/* Model Comparison Table (collapsed by default) */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-primary-600 hover:text-primary-700 font-medium">
          Compare models
        </summary>
        
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Daily Limit
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Per Minute
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {TTS_MODELS.map((model) => (
                <tr 
                  key={model.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    model.id === selectedModel ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => onModelChange(model.id)}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.description}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRateLimitColor(model.rateLimit.requestsPerDay)}`}>
                      {model.rateLimit.requestsPerDay}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {model.rateLimit.requestsPerMinute}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

