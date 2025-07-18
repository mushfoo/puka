import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Authentication types
export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  image: string | null
}

export interface AuthSession {
  user: AuthUser
  expires: string
}

export interface AuthError {
  message: string
  code?: string
}

// Simple auth service for Vite app
export class AuthService {
  private currentUser: AuthUser | null = null
  private currentSession: AuthSession | null = null
  private listeners: ((user: AuthUser | null) => void)[] = []

  constructor() {
    // Initialize from localStorage on startup
    this.loadSessionFromStorage()
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    return this.currentUser
  }

  // Get current session
  getCurrentSession(): AuthSession | null {
    return this.currentSession
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback)
    // Call immediately with current state
    callback(this.currentUser)
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string, name?: string): Promise<{ user: AuthUser } | { error: AuthError }> {
    try {
      // Validate password length
      if (password.length < 6) {
        return {
          error: {
            message: 'Password must be at least 6 characters long',
            code: 'password_too_short'
          }
        }
      }

      // For now, create a simple user without password hashing
      // In production, you'd want proper password hashing
      const user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          emailVerified: false,
        }
      })

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      }

      await this.setSession(authUser)
      return { user: authUser }
    } catch (error: any) {
      return { 
        error: { 
          message: error.message || 'Failed to create account',
          code: 'signup_error' 
        } 
      }
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: AuthUser } | { error: AuthError }> {
    try {
      // Validate password is provided
      if (!password || password.length === 0) {
        return {
          error: {
            message: 'Password is required',
            code: 'password_required'
          }
        }
      }

      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        return { 
          error: { 
            message: 'No account found with this email',
            code: 'user_not_found' 
          } 
        }
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      }

      await this.setSession(authUser)
      return { user: authUser }
    } catch (error: any) {
      return { 
        error: { 
          message: error.message || 'Failed to sign in',
          code: 'signin_error' 
        } 
      }
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    this.currentUser = null
    this.currentSession = null
    localStorage.removeItem('auth_session')
    this.notifyListeners(null)
  }

  // Set session
  private async setSession(user: AuthUser): Promise<void> {
    const expires = new Date()
    expires.setDate(expires.getDate() + 30) // 30 days

    const session: AuthSession = {
      user,
      expires: expires.toISOString(),
    }

    this.currentUser = user
    this.currentSession = session
    
    // Save to localStorage
    localStorage.setItem('auth_session', JSON.stringify(session))
    
    this.notifyListeners(user)
  }

  // Load session from localStorage
  private loadSessionFromStorage(): void {
    try {
      const stored = localStorage.getItem('auth_session')
      if (stored) {
        const session: AuthSession = JSON.parse(stored)
        
        // Check if session is expired
        if (new Date(session.expires) > new Date()) {
          this.currentUser = session.user
          this.currentSession = session
        } else {
          // Session expired, remove it
          localStorage.removeItem('auth_session')
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error)
      localStorage.removeItem('auth_session')
    }
  }

  // Notify listeners of auth state changes
  private notifyListeners(user: AuthUser | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(user)
      } catch (error) {
        console.error('Auth listener error:', error)
      }
    })
  }
}

// Create singleton instance
export const authService = new AuthService()

// Convenience functions
export const getCurrentUser = () => authService.getCurrentUser()
export const getCurrentSession = () => authService.getCurrentSession()
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => 
  authService.onAuthStateChange(callback)
export const signUp = (email: string, password: string, name?: string) => 
  authService.signUp(email, password, name)
export const signIn = (email: string, password: string) => 
  authService.signIn(email, password)
export const signOut = () => authService.signOut()