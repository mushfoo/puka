import React, { useState } from 'react'
import { getAnalyticsState, setOptOut, hasOptedOut } from '../../utils/analytics'

interface AnalyticsOptOutProps {
  onClose?: () => void
}

export const AnalyticsOptOut: React.FC<AnalyticsOptOutProps> = ({ onClose }) => {
  const [isOptedOut, setIsOptedOut] = useState(hasOptedOut())
  const analyticsState = getAnalyticsState()

  // Don't render if analytics is disabled or opt-out is not available
  if (!analyticsState.enabled || !analyticsState.optOutAvailable) {
    return null
  }

  const handleOptOutToggle = () => {
    const newOptOutState = !isOptedOut
    setOptOut(newOptOutState)
    setIsOptedOut(newOptOutState)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Privacy & Analytics
      </h3>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Puka uses privacy-focused analytics to understand how the app is used and improve the experience. 
          We collect only anonymous usage data and never track personal information.
        </p>
        
        <div className="bg-blue-50 p-3 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">What we track:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Page views and feature usage</li>
            <li>• Performance metrics</li>
            <li>• Anonymous error reports</li>
            <li>• General usage patterns</li>
          </ul>
        </div>
        
        <div className="bg-green-50 p-3 rounded-md">
          <h4 className="text-sm font-medium text-green-900 mb-2">What we don't track:</h4>
          <ul className="text-xs text-green-800 space-y-1">
            <li>• Book titles, authors, or reading data</li>
            <li>• Personal information or account details</li>
            <li>• Individual user identification</li>
            <li>• Cross-site tracking or cookies</li>
          </ul>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Analytics Tracking</h4>
            <p className="text-xs text-gray-600">
              {isOptedOut ? 'Currently disabled' : 'Currently enabled'}
            </p>
          </div>
          <button
            onClick={handleOptOutToggle}
            className={`px-3 py-1 text-xs font-medium rounded ${
              isOptedOut
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            } transition-colors`}
          >
            {isOptedOut ? 'Enable' : 'Disable'}
          </button>
        </div>
        
        <p className="text-xs text-gray-500">
          Analytics are powered by Plausible, a privacy-focused analytics service. 
          Your preference is stored locally and respected across all sessions.
        </p>
        
        {onClose && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyticsOptOut