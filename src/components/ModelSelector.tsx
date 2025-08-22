import React from 'react';
import { ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { ImagenModel, ImagenModelInfo } from '@/types';
import { IMAGEN_MODELS } from '@/utils/imageGeneration';

interface ModelSelectorProps {
  selectedModel: ImagenModel;
  onModelChange: (model: ImagenModel) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const selectedModelInfo = IMAGEN_MODELS.find(model => model.id === selectedModel);

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'Fast': return 'text-green-600 bg-green-50';
      case 'Standard': return 'text-blue-600 bg-blue-50';
      case 'Slow': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Standard': return 'text-gray-600 bg-gray-50';
      case 'High': return 'text-purple-600 bg-purple-50';
      case 'Ultra': return 'text-pink-600 bg-pink-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="model-selector" className="text-sm font-medium text-gray-700">
          Imagen Model
        </label>
        <div className="group relative">
          <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 top-6 z-10 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
            Choose the Imagen model based on your needs:
            <br />• Fast: Quick generation, good quality
            <br />• Standard: Balanced speed and quality  
            <br />• Ultra: Highest quality, slower generation
          </div>
        </div>
      </div>

      <div className="relative">
        <select
          id="model-selector"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value as ImagenModel)}
          disabled={disabled}
          className="input-field appearance-none pr-10 cursor-pointer disabled:cursor-not-allowed"
        >
          {IMAGEN_MODELS.map((model) => (
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
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeedColor(selectedModelInfo.speed)}`}>
                {selectedModelInfo.speed}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(selectedModelInfo.quality)}`}>
                {selectedModelInfo.quality}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600">{selectedModelInfo.description}</p>
          
          {/* Model-specific recommendations */}
          <div className="text-xs text-gray-500 space-y-1">
            {selectedModelInfo.id === 'imagen-4.0-ultra-generate-001' && (
              <p>⚡ Ultra quality - Best for final production images</p>
            )}
            {selectedModelInfo.id === 'imagen-4.0-fast-generate-001' && (
              <p>🚀 Fast generation - Great for testing and iterations</p>
            )}
            {selectedModelInfo.id === 'imagen-3.0-generate-002' && (
              <p>⚖️ Recommended - Good balance of speed and quality</p>
            )}
            {selectedModelInfo.id === 'imagen-4.0-generate-001' && (
              <p>🎯 High quality - Improved prompt adherence</p>
            )}
          </div>
        </div>
      )}

      {/* Model Comparison Table (collapsed by default) */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-primary-600 hover:text-primary-700 font-medium">
          Compare all models
        </summary>
        
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Speed
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {IMAGEN_MODELS.map((model) => (
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
                      <div className="text-xs text-gray-500">{model.id}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSpeedColor(model.speed)}`}>
                      {model.speed}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getQualityColor(model.quality)}`}>
                      {model.quality}
                    </span>
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
