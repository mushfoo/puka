import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL || (import.meta.env.PROD ? "" : "http://localhost:3001"),
});

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthSession = {
  user: AuthUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string;
    userAgent?: string;
  };
};

export type AuthError = {
  error: string;
};

export type AuthCallback = (data: any) => void | Promise<void>;

export type AuthCallbacks = {
  onRequest?: AuthCallback;
  onSuccess?: AuthCallback;
  onError?: AuthCallback;
};

// Convenience functions for common auth operations
export const signUp = async (
  email: string,
  password: string,
  name: string,
  { onSuccess, onRequest, onError }: AuthCallbacks | undefined = {},
) => {
  return await authClient.signUp.email(
    {
      email,
      password,
      name,
    },
    {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (data) => {
        if (onError) {
          onError(data);
        }
      },
      onRequest: (data) => {
        if (onRequest) {
          onRequest(data);
        }
      },
    },
  );
};

export const signIn = async (
  email: string,
  password: string,
  { onSuccess, onError, onRequest }: AuthCallbacks | undefined = {},
) => {
  return await authClient.signIn.email(
    {
      email,
      password,
    },
    {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (data) => {
        if (onError) {
          onError(data);
        }
      },
      onRequest: (data) => {
        if (onRequest) {
          onRequest(data);
        }
      },
    },
  );
};

export const signOut = async (onSuccess: AuthCallback) => {
  return await authClient.signOut({
    fetchOptions: {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
    },
  });
};

export const getSession = async () => {
  return await authClient.getSession();
};
