import { useState, useMemo } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { VOICE_CONFIGS } from '@/utils/ttsGeneration';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceName: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({ selectedVoice, onVoiceChange, disabled = false }: VoiceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(VOICE_CONFIGS.map(voice => voice.category)));
    return uniqueCategories.sort();
  }, []);

  // Filter voices based on search and category
  const filteredVoices = useMemo(() => {
    return VOICE_CONFIGS.filter(voice => {
      const matchesSearch = voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          voice.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || voice.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const selectedVoiceInfo = VOICE_CONFIGS.find(voice => voice.name === selectedVoice);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      bright: 'bg-yellow-100 text-yellow-800',
      upbeat: 'bg-green-100 text-green-800',
      informative: 'bg-blue-100 text-blue-800',
      firm: 'bg-gray-100 text-gray-800',
      excitable: 'bg-pink-100 text-pink-800',
      youthful: 'bg-purple-100 text-purple-800',
      breezy: 'bg-cyan-100 text-cyan-800',
      'easy-going': 'bg-emerald-100 text-emerald-800',
      breathy: 'bg-rose-100 text-rose-800',
      clear: 'bg-indigo-100 text-indigo-800',
      smooth: 'bg-violet-100 text-violet-800',
      gravelly: 'bg-amber-100 text-amber-800',
      soft: 'bg-teal-100 text-teal-800',
      mature: 'bg-slate-100 text-slate-800',
      casual: 'bg-lime-100 text-lime-800',
      forward: 'bg-orange-100 text-orange-800',
      even: 'bg-stone-100 text-stone-800',
      friendly: 'bg-sky-100 text-sky-800',
      lively: 'bg-red-100 text-red-800',
      knowledgeable: 'bg-fuchsia-100 text-fuchsia-800',
      warm: 'bg-yellow-100 text-yellow-800',
      gentle: 'bg-green-100 text-green-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          Voice Selection
        </label>
        <span className="text-xs text-gray-500">
          ({VOICE_CONFIGS.length} voices available)
        </span>
      </div>

      {/* Current Selection Display */}
      {selectedVoiceInfo && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-primary-900">{selectedVoiceInfo.name}</h4>
              <p className="text-sm text-primary-700">{selectedVoiceInfo.description}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedVoiceInfo.category)}`}>
              {selectedVoiceInfo.category}
            </span>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search voices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="input-field pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={disabled}
            className="input-field appearance-none pr-10"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Voice Grid */}
      <div className="max-h-64 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredVoices.map((voice) => (
            <button
              key={voice.name}
              onClick={() => onVoiceChange(voice.name)}
              disabled={disabled}
              className={`
                p-3 text-left rounded-lg border transition-all duration-200 disabled:opacity-50
                ${voice.name === selectedVoice
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500 ring-opacity-20'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <h5 className="font-medium text-gray-900 text-sm">{voice.name}</h5>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(voice.category)}`}>
                  {voice.category}
                </span>
              </div>
              <p className="text-xs text-gray-600">{voice.description}</p>
            </button>
          ))}
        </div>
      </div>

      {filteredVoices.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">No voices found matching your criteria</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
            className="text-primary-600 hover:text-primary-700 text-sm mt-1"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Quick Category Buttons */}
      <div className="border-t pt-3">
        <p className="text-xs text-gray-500 mb-2">Quick categories:</p>
        <div className="flex flex-wrap gap-1">
          {['bright', 'upbeat', 'firm', 'clear', 'smooth', 'warm'].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              disabled={disabled}
              className={`
                px-2 py-1 text-xs rounded-full transition-colors duration-200 disabled:opacity-50
                ${selectedCategory === category
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

