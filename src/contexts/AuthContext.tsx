import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  AuthUser,
  AuthSession,
  AuthError,
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  getSession,
  AuthCallback,
} from "@/lib/auth-client";


// Auth context interface
interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  error: AuthError | null;
  loading: boolean;

  // Authentication methods
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Progressive enhancement
  isAuthenticated: boolean;
  canSync: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Auth provider component
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  

  // Check for existing session on mount with retry logic
  useEffect(() => {
    const checkSession = async (retryCount = 0) => {
      try {
        const sessionData = await getSession();
        if (sessionData.data?.user) {
          const user: AuthUser = {
            ...sessionData.data.user,
            image: sessionData.data.user.image || null,
          };
          setUser(user);
          
          // Use better-auth session data directly, filtering out null values
          if (sessionData.data.session) {
            setSession({
              user,
              session: {
                ...sessionData.data.session,
                ipAddress: sessionData.data.session.ipAddress || undefined,
                userAgent: sessionData.data.session.userAgent || undefined,
              }
            });
          } else {
            // Fallback: Only create minimal session if better-auth doesn't provide one
            console.warn('No session data from better-auth, creating fallback session');
            setSession({
              user,
              session: {
                id: `temp_${user.id}`,
                userId: user.id,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                token: 'temp_token',
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to check session:', error);
        
        // Retry logic for network issues
        if (retryCount < 2 && (error as any)?.name === 'NetworkError') {
          console.log(`Retrying session check (attempt ${retryCount + 1})`);
          setTimeout(() => checkSession(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        
        // Clear session on persistent failure
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const getOnSuccessCallback: (fallbackErrorMessage: string) => AuthCallback = (
    _fallbackErrorMessage,
  ) => {
    return (data) => {
      console.log("Auth success data:", data);
      setError(null); // Clear any previous errors
      
      if (data?.data?.user) {
        const user: AuthUser = {
          ...data.data.user,
          image: data.data.user.image || null,
        };
        setUser(user);
        
        // Use better-auth session data directly instead of manual construction, filtering out null values
        if (data.data.session) {
          setSession({
            user,
            session: {
              ...data.data.session,
              ipAddress: data.data.session.ipAddress || undefined,
              userAgent: data.data.session.userAgent || undefined,
            }
          });
        } else {
          // Fallback: Only create minimal session if better-auth doesn't provide one
          setSession({
            user,
            session: {
              id: `temp_${user.id}`,
              userId: user.id,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              token: 'temp_token',
            }
          });
        }
      }
      
      setLoading(false); // Clear loading state
    };
  };

  const getOnErrorCallback: (errorMessage: string) => AuthCallback = (
    errorMessage,
  ) => {
    return (data) => {
      const error = data.error?.message || errorMessage;
      console.error('Authentication error from onError callback:', error, data);
      setError({ error });
      setLoading(false);
    };
  };
  
  const getOnRequestCallback: () => AuthCallback = () => {
    return () => {
      setLoading(true);
      setError(null);
    };
  };

  // Auth methods
  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      // Use email as name if no name is provided
      const displayName = name || email.split("@")[0];

      await authSignUp(email, password, displayName, {
        onSuccess: getOnSuccessCallback("Registration failed"),
        onError: getOnErrorCallback("Registration failed"),
        onRequest: getOnRequestCallback(),
      });
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await authSignIn(email, password, {
      onSuccess: getOnSuccessCallback("Sign-in failed"),
      onError: getOnErrorCallback("Sign-in failed"),
      onRequest: getOnRequestCallback(),
    });
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await authSignOut(() => {
        setUser(null);
        setSession(null);
        setError(null);
        setLoading(false);
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Always clear session on sign out attempt, even if it fails
      setUser(null);
      setSession(null);
      setError({ error: error.message || 'Sign out failed' });
      setLoading(false);
    }
  }, []);


  const value: AuthContextType = {
    user,
    session,
    error,
    loading,

    // Auth methods
    signUp,
    signIn,
    signOut,

    // Progressive enhancement
    isAuthenticated: !!user,
    canSync: !!user && !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// HOC for components that require authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return <div>Please sign in to access this feature.</div>;
    }

    return <Component {...props} />;
  };
}

// Hook for optional authentication (progressive enhancement)
export function useOptionalAuth() {
  const auth = useAuth();

  return {
    ...auth,
    // Helper to check if user should be prompted for auth
    shouldPromptAuth: false, // Auth prompting removed as authentication is now required

    // Helper to check if sync is available
    syncAvailable: auth.canSync,
  };
}
