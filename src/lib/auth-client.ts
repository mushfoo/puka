import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL || "http://localhost:5173", // Use env var in production
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

// Convenience functions for common auth operations
export const signUp = async (email: string, password: string, name: string) => {
  return await authClient.signUp.email(
    {
      email,
      password,
      name,
    },
    {
      onSuccess: (data) => {
        // Optionally handle success, e.g. redirect or show message
        console.log("Sign up successful:", data);
      },
    },
  );
};

export const signIn = async (email: string, password: string) => {
  return await authClient.signIn.email({
    email,
    password,
  });
};

export const signOut = async () => {
  return await authClient.signOut();
};

export const getSession = async () => {
  return await authClient.getSession();
};

// Auth state change listener
export const onAuthStateChange = (
  callback: (user: AuthUser | null) => void,
) => {
  // Better-auth doesn't have built-in state change listeners
  // We'll need to implement this ourselves or check session periodically
  let currentUser: AuthUser | null = null;

  const checkSession = async () => {
    try {
      const session = await getSession();
      const newUser = session.data?.user
        ? {
            ...session.data.user,
            image: session.data.user.image || null,
          }
        : null;

      // Always update on first check, then only on changes
      if (currentUser === null && newUser === null) {
        // First check with no user - still call callback to clear loading
        callback(null);
      } else if (JSON.stringify(newUser) !== JSON.stringify(currentUser)) {
        callback(newUser);
      }
      currentUser = newUser;
    } catch (error) {
      // On error, ensure we clear loading state by calling callback
      currentUser = null;
      callback(null);
    }
  };

  // Initial check
  checkSession();

  // Check every 5 seconds for more responsive auth state updates
  const interval = setInterval(checkSession, 5000);

  // Return unsubscribe function
  return () => {
    clearInterval(interval);
  };
};

