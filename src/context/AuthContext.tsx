import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getIdToken,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User
} from "firebase/auth";
import { auth, firebaseConfigured } from "../services/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      getIdToken(nextUser, true)
        .catch((error: unknown) => {
          console.warn("Firebase token refresh failed", error);
        })
        .finally(() => {
          setUser(nextUser);
          setLoading(false);
        });
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      async login(email: string, password: string) {
        if (!auth) throw new Error("Firebase is not configured. Add Firebase values to .env.local and restart the dev server.");
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await getIdToken(credential.user, true);
      },
      async logout() {
        if (!auth) return;
        await signOut(auth);
      },
      async resetPassword(email: string) {
        if (!auth) throw new Error("Firebase is not configured. Add Firebase values to .env.local and restart the dev server.");
        await sendPasswordResetEmail(auth, email);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
