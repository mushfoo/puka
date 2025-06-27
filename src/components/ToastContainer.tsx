import React from 'react';
import Toast from './Toast';
import { ToastMessage } from '@/types';

interface ToastContainerProps {
  /** Array of toast messages to display */
  toasts: ToastMessage[];
  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void;
  /** Position for all toasts */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  /** Maximum number of toasts to show */
  maxToasts?: number;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
  maxToasts = 5
}) => {
  // Limit the number of toasts displayed
  const visibleToasts = toasts.slice(0, maxToasts);

  if (visibleToasts.length === 0) {
    return null;
  }

  const getContainerStyles = () => {
    const baseStyles = "fixed z-50 pointer-events-none";
    
    const positionStyles = {
      'top-right': 'top-0 right-0 p-4',
      'top-left': 'top-0 left-0 p-4',
      'bottom-right': 'bottom-0 right-0 p-4',
      'bottom-left': 'bottom-0 left-0 p-4',
      'top-center': 'top-0 left-1/2 -translate-x-1/2 p-4',
      'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2 p-4'
    };

    return `${baseStyles} ${positionStyles[position]}`;
  };

  return (
    <div className={getContainerStyles()}>
      <div className="flex flex-col gap-2 pointer-events-auto">
        {visibleToasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <Toast
              toast={toast}
              onDismiss={onDismiss}
              position={position}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;