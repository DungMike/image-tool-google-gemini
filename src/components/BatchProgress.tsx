
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { BatchGenerationProgress } from '@/types';

interface BatchProgressProps {
  progress: BatchGenerationProgress;
  isVisible: boolean;
}

export function BatchProgress({ progress, isVisible }: BatchProgressProps) {
  if (!isVisible) return null;

  const { total, completed, failed, current } = progress;
  const remaining = total - completed - failed;
  const completionPercentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
  const successRate = completed + failed > 0 ? Math.round((completed / (completed + failed)) * 100) : 0;

  return (
    <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Batch Generation Progress
          </h3>
          <div className="text-sm font-medium text-blue-700">
            {completionPercentage}% Complete
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Progress: {completed + failed} of {total} images</span>
            <span>Success Rate: {successRate}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="h-full flex">
              {/* Success portion */}
              <div
                className="bg-green-500 transition-all duration-500 ease-out"
                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
              />
              {/* Failed portion */}
              <div
                className="bg-red-500 transition-all duration-500 ease-out"
                style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 bg-white/50 rounded-lg p-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-lg font-semibold text-green-700">{completed}</div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/50 rounded-lg p-3">
            <XCircleIcon className="w-5 h-5 text-red-600" />
            <div>
              <div className="text-lg font-semibold text-red-700">{failed}</div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/50 rounded-lg p-3">
            <ClockIcon className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-lg font-semibold text-blue-700">{remaining}</div>
              <div className="text-xs text-blue-600">Remaining</div>
            </div>
          </div>
        </div>

        {/* Current Prompt */}
        {current && remaining > 0 && (
          <div className="bg-white/70 rounded-lg p-3 border border-white/50">
            <div className="flex items-start gap-3">
              <div className="loading-spinner w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 mb-1">Currently generating:</p>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {current.length > 100 ? `${current.substring(0, 100)}...` : current}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {remaining === 0 && total > 0 && (
          <div className="bg-white/70 rounded-lg p-3 border border-white/50">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Batch generation completed!
                </p>
                <p className="text-xs text-green-700">
                  {completed} images generated successfully, {failed} failed
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Estimated Time */}
        {remaining > 0 && (
          <div className="text-xs text-gray-600 bg-white/30 rounded p-2">
            <div className="flex items-center justify-between">
              <span>Estimated time remaining:</span>
              <span className="font-medium">
                {Math.ceil(remaining * 0.5)} - {Math.ceil(remaining * 2)} minutes
              </span>
            </div>
            <div className="mt-1 text-gray-500">
              * Time varies based on API response time and rate limits
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
