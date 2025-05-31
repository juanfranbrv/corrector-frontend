// src/context/AuthContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient'; // ajusta la ruta si cambia

// ------------------------------------
// Tipo del valor que expondrá el contexto
// ------------------------------------
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// ------------------------------------
// Creación y hook para consumir el contexto
// ------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ------------------------------------
// Provider
// ------------------------------------
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    /* ---------- 1. Sesión inicial ---------- */
    (async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    })();

    /* ---------- 2. Listener de cambios ---------- *
       onAuthStateChange devuelve:
       { data: { subscription: Subscription } }
    */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      /* Ejemplos de redirección opcional
      if (_event === 'SIGNED_IN') router.push('/dashboard');
      if (_event === 'SIGNED_OUT') router.push('/auth');
      */
    });

    /* ---------- 3. Limpieza ---------- */
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  /* ---------- 4. Acción signOut ---------- */
  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/'); // o '/auth'
  };

  /* ---------- 5. Valor de contexto ---------- */
  const value: AuthContextType = {
    session,
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
