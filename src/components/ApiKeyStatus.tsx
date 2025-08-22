import React, { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { getApiKeysStats, resetAllApiKeys } from '@/utils/apiKeyRotation';
import { toast } from 'react-toastify';

interface ApiKeyStatusProps {
  className?: string;
}

export function ApiKeyStatus({ className = '' }: ApiKeyStatusProps) {
  const [stats, setStats] = useState<ReturnType<typeof getApiKeysStats> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const getStatusColor = () => {
    if (stats.availableKeys === 0) return 'text-red-600';
    if (stats.availableKeys <= stats.totalKeys * 0.3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (stats.availableKeys === 0) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
    }
    if (stats.availableKeys <= stats.totalKeys * 0.3) {
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
              <h3 className="text-sm font-medium text-gray-900">API Key Status</h3>
              <p className={`text-xs ${getStatusColor()}`}>
                {stats.availableKeys} of {stats.totalKeys} keys available
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
          {/* Overall Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-gray-900">{stats.totalKeys}</div>
              <div className="text-xs text-gray-600">Total Keys</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-green-700">{stats.availableKeys}</div>
              <div className="text-xs text-green-600">Available</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-red-700">{stats.blockedKeys}</div>
              <div className="text-xs text-red-600">Blocked</div>
            </div>
          </div>

          {/* Individual Key Usage */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Daily Usage per Key</h4>
            <div className="space-y-2">
              {Object.entries(stats.dailyUsage).map(([keyName, usage]) => {
                const percentage = (usage / 70) * 100; // 70 is daily limit
                const isNearLimit = percentage > 80;
                const isAtLimit = percentage >= 100;
                
                return (
                  <div key={keyName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{keyName}</span>
                      <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {usage}/70
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

          {/* Warnings and Info */}
          {stats.availableKeys === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-red-900">All API keys exhausted</p>
                  <p className="text-red-700 mt-1">
                    All API keys have reached their daily limit. Please wait until tomorrow or add more keys.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.availableKeys <= stats.totalKeys * 0.3 && stats.availableKeys > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-yellow-900">Low API key availability</p>
                  <p className="text-yellow-700 mt-1">
                    Most API keys are near their daily limit. Consider adding more keys or reducing usage.
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
                <p className="font-medium text-blue-900">Rate Limits</p>
                <ul className="text-blue-700 mt-1 space-y-0.5">
                  <li>• 10 requests per minute per key</li>
                  <li>• 70 requests per day per key</li>
                  <li>• Automatic key rotation enabled</li>
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
