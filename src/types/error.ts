export interface UserFriendlyError {
  id: string
  type: ErrorType
  title: string
  message: string
  details?: string
  actions: ErrorAction[]
  dismissible: boolean
  persistent: boolean
}

export interface ErrorAction {
  label: string
  action: () => void | Promise<void>
  style: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

export enum ErrorType {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  STORAGE = 'storage',
}

export interface AuthError {
  type: 'NETWORK' | 'CREDENTIALS' | 'RATE_LIMIT' | 'SERVER' | 'UNKNOWN'
  message: string
  userMessage: string
  actionable: boolean
  retryable: boolean
}

export interface AuthResult {
  success: boolean
  error?: AuthError
  user?: any
  requiresRetry?: boolean
  retryAfter?: number
}

export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
  timeout?: number
  startTime: number
}

export interface ServiceStatus {
  type: 'DATABASE' | 'MOCK'
  online: boolean
  lastSync?: Date
  pendingSync: boolean
  error?: string
}
