import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from '@/components/auth';

// Helper function to render components with AuthProvider
export const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

// Re-export everything from testing library for convenience
export * from '@testing-library/react';
export { renderWithAuth as render }; // Override default render