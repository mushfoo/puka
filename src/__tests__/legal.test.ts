import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hasAcceptedTerms,
  isTermsAcceptanceRequired,
  recordTermsAcceptance,
  hasAcknowledgedPrivacy,
  recordPrivacyAcknowledgment,
  shouldShowPrivacyNotice,
  clearLegalAcceptances,
  getComplianceStatus,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION
} from '../utils/legal'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
vi.stubGlobal('localStorage', localStorageMock)

describe('Legal Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Terms of Service', () => {
    it('should return false for hasAcceptedTerms when no acceptance is stored', () => {
      expect(hasAcceptedTerms()).toBe(false)
    })

    it('should return true for hasAcceptedTerms when current version is accepted', () => {
      const acceptance = {
        accepted: true,
        timestamp: new Date().toISOString(),
        version: CURRENT_TERMS_VERSION
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(acceptance))
      
      expect(hasAcceptedTerms()).toBe(true)
    })

    it('should return false for hasAcceptedTerms when old version is accepted', () => {
      const acceptance = {
        accepted: true,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(acceptance))
      
      expect(hasAcceptedTerms()).toBe(false)
    })

    it('should record terms acceptance correctly', () => {
      recordTermsAcceptance()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'puka-terms-accepted',
        expect.stringContaining(CURRENT_TERMS_VERSION)
      )
    })

    it('should not require terms for existing users without acceptance', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'puka-books') return '[]' // Existing data
        if (key === 'puka-terms-accepted') return null // No acceptance
        return null
      })
      
      expect(isTermsAcceptanceRequired()).toBe(false)
    })

    it('should require terms for new users', () => {
      // No existing data, no acceptance
      expect(isTermsAcceptanceRequired()).toBe(true)
    })
  })

  describe('Privacy Policy', () => {
    it('should return false for hasAcknowledgedPrivacy when not acknowledged', () => {
      expect(hasAcknowledgedPrivacy()).toBe(false)
    })

    it('should return true for hasAcknowledgedPrivacy when current version is acknowledged', () => {
      localStorageMock.getItem.mockReturnValue(CURRENT_PRIVACY_VERSION)
      
      expect(hasAcknowledgedPrivacy()).toBe(true)
    })

    it('should return false for hasAcknowledgedPrivacy when old version is acknowledged', () => {
      localStorageMock.getItem.mockReturnValue('1.0')
      
      expect(hasAcknowledgedPrivacy()).toBe(false)
    })

    it('should record privacy acknowledgment correctly', () => {
      recordPrivacyAcknowledgment()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'puka-privacy-acknowledged',
        CURRENT_PRIVACY_VERSION
      )
    })

    it('should show privacy notice when not acknowledged', () => {
      expect(shouldShowPrivacyNotice()).toBe(true)
    })

    it('should not show privacy notice when acknowledged', () => {
      localStorageMock.getItem.mockReturnValue(CURRENT_PRIVACY_VERSION)
      
      expect(shouldShowPrivacyNotice()).toBe(false)
    })
  })

  describe('Compliance Status', () => {
    it('should return correct compliance status when nothing is accepted', () => {
      const status = getComplianceStatus()
      
      expect(status).toEqual({
        termsAccepted: false,
        privacyAcknowledged: false,
        requiresAction: true,
        currentTermsVersion: CURRENT_TERMS_VERSION,
        currentPrivacyVersion: CURRENT_PRIVACY_VERSION
      })
    })

    it('should return correct compliance status when everything is accepted', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'puka-terms-accepted') {
          return JSON.stringify({
            accepted: true,
            timestamp: new Date().toISOString(),
            version: CURRENT_TERMS_VERSION
          })
        }
        if (key === 'puka-privacy-acknowledged') {
          return CURRENT_PRIVACY_VERSION
        }
        return null
      })
      
      const status = getComplianceStatus()
      
      expect(status).toEqual({
        termsAccepted: true,
        privacyAcknowledged: true,
        requiresAction: false,
        currentTermsVersion: CURRENT_TERMS_VERSION,
        currentPrivacyVersion: CURRENT_PRIVACY_VERSION
      })
    })
  })

  describe('Clear Acceptances', () => {
    it('should clear all legal acceptances', () => {
      clearLegalAcceptances()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('puka-terms-accepted')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('puka-privacy-acknowledged')
    })
  })

  describe('Error Handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      expect(() => hasAcceptedTerms()).not.toThrow()
      expect(hasAcceptedTerms()).toBe(false)
    })
  })
})