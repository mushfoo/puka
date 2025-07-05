import React, { useState } from 'react'

interface LegalModalProps {
  isOpen: boolean
  onClose: () => void
  document: 'privacy' | 'terms'
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, document }) => {
  const [accepted, setAccepted] = useState(false)

  if (!isOpen) return null

  const isTerms = document === 'terms'
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy'
  const lastUpdated = 'July 5, 2025'

  const handleAccept = () => {
    // Store acceptance in localStorage for terms
    if (isTerms) {
      localStorage.setItem('puka-terms-accepted', JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: '2.0'
      }))
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          {isTerms && (
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="accept-terms"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="accept-terms" className="text-sm text-gray-700">
                I have read and agree to the Terms of Service
              </label>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            {isTerms ? (
              <button
                onClick={handleAccept}
                disabled={!accepted}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  accepted 
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                }`}
              >
                Accept Terms
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const TermsContent: React.FC = () => (
  <div className="prose prose-sm max-w-none text-gray-700">
    <h3>Welcome to Puka Reading Tracker</h3>
    <p>
      By using Puka Reading Tracker, you agree to these terms. Please read them carefully.
    </p>

    <h4>Service Description</h4>
    <p>
      Puka Reading Tracker is a personal reading management application that helps you track your reading progress, 
      organize your library, and maintain reading streaks. The service works offline and optionally syncs across devices.
    </p>

    <h4>Acceptable Use</h4>
    <ul>
      <li>Use the service for personal reading tracking</li>
      <li>Import/export your own reading data</li>
      <li>Share reading progress with friends and family</li>
      <li>Do not use for illegal or unauthorized purposes</li>
      <li>Do not attempt to disrupt or interfere with the service</li>
    </ul>

    <h4>Your Data</h4>
    <ul>
      <li>You retain all rights to your reading data</li>
      <li>You can export your data at any time</li>
      <li>You can delete your account and data at any time</li>
      <li>We don't claim ownership of your personal reading information</li>
    </ul>

    <h4>Privacy & Security</h4>
    <ul>
      <li>Most data stays on your device</li>
      <li>Cloud sync is optional and encrypted</li>
      <li>We use privacy-focused analytics</li>
      <li>See our Privacy Policy for complete details</li>
    </ul>

    <h4>Service Availability</h4>
    <p>
      We strive to maintain high availability but cannot guarantee uninterrupted service. 
      Core features work offline on your device.
    </p>

    <h4>Limitation of Liability</h4>
    <p>
      The service is provided "as is" without warranties. We are not liable for data loss, 
      business interruption, or other damages beyond our control.
    </p>

    <h4>Contact Us</h4>
    <p>
      Questions about these terms? Contact us at legal@puka-reading-tracker.com or via GitHub issues.
    </p>
  </div>
)

const PrivacyContent: React.FC = () => (
  <div className="prose prose-sm max-w-none text-gray-700">
    <h3>Your Privacy Matters</h3>
    <p>
      Puka Reading Tracker is designed with privacy by default. Most of your data never leaves your device.
    </p>

    <h4>Data We Store Locally</h4>
    <ul>
      <li>Book titles, authors, and your personal notes</li>
      <li>Reading progress and completion dates</li>
      <li>Reading streaks and daily activities</li>
      <li>Personal preferences and settings</li>
    </ul>

    <h4>Cloud Sync (Optional)</h4>
    <p>If you choose to create an account:</p>
    <ul>
      <li>Email address for authentication</li>
      <li>Encrypted reading data for device synchronization</li>
      <li>Account creation and login timestamps</li>
    </ul>

    <h4>Analytics (With Your Consent)</h4>
    <p>We use privacy-focused analytics that collect:</p>
    <ul>
      <li>Anonymous page views and feature usage</li>
      <li>Performance metrics and error reports</li>
      <li>General usage statistics (no personal data)</li>
    </ul>
    <p>You can opt out of analytics at any time in the app settings.</p>

    <h4>What We Don't Collect</h4>
    <ul>
      <li>No tracking across websites</li>
      <li>No advertising profiles</li>
      <li>No sale of personal data</li>
      <li>No unnecessary personal information</li>
    </ul>

    <h4>Your Rights</h4>
    <ul>
      <li>Export all your data at any time</li>
      <li>Delete your account and data completely</li>
      <li>Opt out of analytics and tracking</li>
      <li>Use the service without creating an account</li>
    </ul>

    <h4>Data Security</h4>
    <ul>
      <li>All cloud data is encrypted in transit and at rest</li>
      <li>Secure authentication with session management</li>
      <li>Limited access to data on a need-to-know basis</li>
      <li>Regular security updates and monitoring</li>
    </ul>

    <h4>Contact Us</h4>
    <p>
      Privacy questions? Contact us at privacy@puka-reading-tracker.com or via GitHub issues.
    </p>
  </div>
)

export default LegalModal