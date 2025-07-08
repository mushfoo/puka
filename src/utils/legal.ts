// Legal utilities for Terms of Service and Privacy Policy compliance

interface TermsAcceptance {
  accepted: boolean
  timestamp: string
  version: string
}

export const CURRENT_TERMS_VERSION = '2.0'
export const CURRENT_PRIVACY_VERSION = '2.0'

// Check if user has accepted current terms of service
export const hasAcceptedTerms = (): boolean => {
  try {
    const stored = localStorage.getItem('puka-terms-accepted')
    if (!stored) return false
    
    const acceptance: TermsAcceptance = JSON.parse(stored)
    return acceptance.accepted && acceptance.version === CURRENT_TERMS_VERSION
  } catch {
    return false
  }
}

// Check if terms acceptance is required (for new users)
export const isTermsAcceptanceRequired = (): boolean => {
  // For existing users who have used the app, don't require terms
  const hasExistingData = localStorage.getItem('puka-books') || 
                         localStorage.getItem('puka-reading-days') ||
                         localStorage.getItem('reading-data')
  
  if (hasExistingData && !hasAcceptedTerms()) {
    // Existing user - show terms but don't block usage
    return false
  }
  
  // New user - require terms acceptance for cloud features
  return !hasAcceptedTerms()
}

// Record terms acceptance
export const recordTermsAcceptance = (): void => {
  const acceptance: TermsAcceptance = {
    accepted: true,
    timestamp: new Date().toISOString(),
    version: CURRENT_TERMS_VERSION
  }
  
  localStorage.setItem('puka-terms-accepted', JSON.stringify(acceptance))
}

// Check if privacy policy has been acknowledged
export const hasAcknowledgedPrivacy = (): boolean => {
  const acknowledged = localStorage.getItem('puka-privacy-acknowledged')
  return acknowledged === CURRENT_PRIVACY_VERSION
}

// Record privacy policy acknowledgment
export const recordPrivacyAcknowledgment = (): void => {
  localStorage.setItem('puka-privacy-acknowledged', CURRENT_PRIVACY_VERSION)
}

// Check if user should see privacy notice
export const shouldShowPrivacyNotice = (): boolean => {
  return !hasAcknowledgedPrivacy()
}

// Clear all legal acceptances (for testing or account deletion)
export const clearLegalAcceptances = (): void => {
  localStorage.removeItem('puka-terms-accepted')
  localStorage.removeItem('puka-privacy-acknowledged')
}

// Get legal document URLs for external hosting
export const getLegalDocumentUrls = () => ({
  termsOfService: '/docs/legal/terms-of-service.md',
  privacyPolicy: '/docs/legal/privacy-policy.md',
  support: '/docs/support.md'
})

// Check if user needs to see legal updates
export const hasLegalUpdates = (): boolean => {
  return !hasAcceptedTerms() || !hasAcknowledgedPrivacy()
}

// Get compliance status for UI display
export const getComplianceStatus = () => ({
  termsAccepted: hasAcceptedTerms(),
  privacyAcknowledged: hasAcknowledgedPrivacy(),
  requiresAction: hasLegalUpdates(),
  currentTermsVersion: CURRENT_TERMS_VERSION,
  currentPrivacyVersion: CURRENT_PRIVACY_VERSION
})