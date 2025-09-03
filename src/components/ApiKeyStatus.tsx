import { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { getApiKeysStats, resetAllApiKeys } from '@/utils/apiKeyRotation';
import { useAtom } from 'jotai';
import { selectedModelAtom, selectedTTSModelAtom } from '@/state/atoms';
import { IMAGEN_MODELS } from '@/utils/imageGeneration';
import { TTS_MODELS } from '@/utils/ttsGeneration';
import { toast } from 'react-toastify';

interface ApiKeyStatusProps {
  className?: string;
  service?: 'image' | 'voice' | 'both';
}

export function ApiKeyStatus({ className = '', service = 'both' }: ApiKeyStatusProps) {
  const [stats, setStats] = useState<ReturnType<typeof getApiKeysStats> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'voice'>(service === 'both' ? 'image' : service as 'image' | 'voice');
  const [selectedModel] = useAtom(selectedModelAtom);
  const [selectedTTSModel] = useAtom(selectedTTSModelAtom);

  // Load stats
  const loadStats = () => {
    try {
      const keyStats = getApiKeysStats();
      setStats(keyStats);
    } catch (error) {
      console.error('Error loading API key stats:', error);
    }
  };

  // Load stats on mount and set up interval
  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Derive current image daily limit from selected model
  const currentImageDailyLimit = (() => {
    const info = IMAGEN_MODELS.find(m => m.id === selectedModel);
    return info?.rateLimitPerDay ?? 70;
  })();

  // Derive current TTS daily limit from selected model
  const currentTTSDailyLimit = (() => {
    const info = TTS_MODELS.find(m => m.id === selectedTTSModel);
    return info?.rateLimit.requestsPerDay ?? 100;
  })();

  // Handle reset all keys
  const handleResetKeys = () => {
    if (window.confirm('Are you sure you want to reset all API key usage counters? This will clear all rate limit tracking.')) {
      resetAllApiKeys();
      loadStats();
      toast.success('API key usage counters have been reset');
    }
  };

  if (!stats) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="loading-spinner w-4 h-4" />
          <span className="text-sm text-gray-600">Loading API key status...</span>
        </div>
      </div>
    );
  }

  // Get current service stats based on active tab or single service
  const getCurrentServiceStats = () => {
    if (!stats) return null;
    
    if (service !== 'both') {
      return stats[service as 'image' | 'voice'];
    }
    
    return stats[activeTab];
  };

  const currentStats = getCurrentServiceStats();

  const getStatusColor = () => {
    if (!currentStats) return 'text-gray-600';
    if (currentStats.availableKeys === 0) return 'text-red-600';
    if (currentStats.availableKeys <= stats!.totalKeys * 0.3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!currentStats) {
      return (
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
        </svg>
      );
    }
    if (currentStats.availableKeys === 0) {
      return (
        <svg
          className="w-5 h-5 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    if (currentStats.availableKeys <= stats!.totalKeys * 0.3) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
    }
    return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
  };

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left hover:bg-gray-50 -m-2 p-2 rounded-md transition-colors duration-200"
        >
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                API Key Status
                {service !== 'both' && (
                  <span className="ml-2 text-xs text-gray-500 capitalize">({service})</span>
                )}
              </h3>
              <p className={`text-xs ${getStatusColor()}`}>
                {currentStats ? `${currentStats.availableKeys} of ${stats!.totalKeys} keys available` : 'Loading...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadStats();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Refresh status"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            <ChartBarIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Service Tabs (only show if service is 'both') */}
          {service === 'both' && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('image')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  activeTab === 'image'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🖼️ Image Service
              </button>
              <button
                onClick={() => setActiveTab('voice')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  activeTab === 'voice'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🎵 Voice Service
              </button>
            </div>
          )}

          {/* Overall Stats */}
          {currentStats && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-lg font-semibold text-gray-900">{stats!.totalKeys}</div>
                <div className="text-xs text-gray-600">Total Keys</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-lg font-semibold text-green-700">{currentStats.availableKeys}</div>
                <div className="text-xs text-green-600">Available</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-lg font-semibold text-red-700">{currentStats.blockedKeys}</div>
                <div className="text-xs text-red-600">Blocked</div>
              </div>
            </div>
          )}

          {/* Individual Key Usage */}
          {currentStats && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Daily Usage per Key
                {service === 'both' && (
                  <span className="ml-2 text-xs text-gray-500 capitalize">({activeTab} service)</span>
                )}
              </h4>
              <div className="space-y-2">
                {Object.entries(currentStats.dailyUsage).map(([keyName, usage]) => {
                  // Determine daily limit based on current service
                  let dailyLimit = currentImageDailyLimit; // Image limit per selected model
                  if (service === 'voice' || (service === 'both' && activeTab === 'voice')) {
                    dailyLimit = currentTTSDailyLimit; // TTS limit per selected model
                  }
                  
                  const percentage = (usage / dailyLimit) * 100;
                  const isNearLimit = percentage > 80;
                  const isAtLimit = percentage >= 100;
                  
                  return (
                    <div key={keyName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{keyName}</span>
                        <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-700'}`}>
                          {usage}/{dailyLimit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warnings and Info */}
          {currentStats && currentStats.availableKeys === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-red-900">
                    All API keys exhausted
                    {service === 'both' && <span className="capitalize"> ({activeTab} service)</span>}
                  </p>
                  <p className="text-red-700 mt-1">
                    All API keys have reached their daily limit for this service. Please wait until tomorrow or add more keys.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStats && currentStats.availableKeys <= stats!.totalKeys * 0.3 && currentStats.availableKeys > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-yellow-900">
                    Low API key availability
                    {service === 'both' && <span className="capitalize"> ({activeTab} service)</span>}
                  </p>
                  <p className="text-yellow-700 mt-1">
                    Most API keys are near their daily limit for this service. Consider adding more keys or reducing usage.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rate Limit Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <KeyIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-blue-900">
                  Rate Limits
                  {service === 'both' && <span className="capitalize"> ({activeTab} service)</span>}
                </p>
                <ul className="text-blue-700 mt-1 space-y-0.5">
                  {(service === 'image' || (service === 'both' && activeTab === 'image')) && (
                    <>
                      <li>• Per-minute limit depends on model</li>
                      <li>• {currentImageDailyLimit} requests per day per key (current model)</li>
                    </>
                  )}
                  {(service === 'voice' || (service === 'both' && activeTab === 'voice')) && (
                    <>
                      <li>• Per-minute limit depends on model</li>
                      <li>• {currentTTSDailyLimit} requests per day per key (current model)</li>
                    </>
                  )}
                  <li>• Automatic key rotation enabled</li>
                  <li>• Independent tracking per service</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={handleResetKeys}
              className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 py-2 px-3 rounded-md transition-colors duration-200"
            >
              Reset All Usage Counters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
