import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:5173", // Vite dev server
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
export const signUp = async (email: string, password: string, name?: string) => {
  return await authClient.signUp.email({
    email,
    password,
    name: name || "",
  });
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
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  // Better-auth doesn't have built-in state change listeners
  // We'll need to implement this ourselves or check session periodically
  let currentUser: AuthUser | null = null;
  
  const checkSession = async () => {
    try {
      const session = await getSession();
      const newUser = session.data?.user ? {
        ...session.data.user,
        image: session.data.user.image || null
      } : null;
      
      if (JSON.stringify(newUser) !== JSON.stringify(currentUser)) {
        currentUser = newUser;
        callback(currentUser);
      }
    } catch (error) {
      if (currentUser !== null) {
        currentUser = null;
        callback(null);
      }
    }
  };
  
  // Initial check
  checkSession();
  
  // Check every 30 seconds
  const interval = setInterval(checkSession, 30000);
  
  // Return unsubscribe function
  return () => {
    clearInterval(interval);
  };
};