import { useState, useCallback } from 'react';
import { ToastMessage } from '@/types';

interface UseToastReturn {
  /** Array of current toast messages */
  toasts: ToastMessage[];
  /** Add a new toast message */
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  /** Remove a toast by ID */
  removeToast: (id: string) => void;
  /** Clear all toasts */
  clearToasts: () => void;
  /** Convenience methods for different toast types */
  success: (message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => string;
  error: (message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => string;
  warning: (message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => string;
  info: (message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => string;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast
    };

    setToasts(prevToasts => [newToast, ...prevToasts]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for different toast types
  const success = useCallback((message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => {
    return addToast({
      type: 'success',
      message,
      ...options
    });
  }, [addToast]);

  const error = useCallback((message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => {
    return addToast({
      type: 'error',
      message,
      duration: 7000, // Longer duration for errors
      ...options
    });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => {
    return addToast({
      type: 'warning',
      message,
      duration: 6000,
      ...options
    });
  }, [addToast]);

  const info = useCallback((message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => {
    return addToast({
      type: 'info',
      message,
      ...options
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  };
};