// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient'; // Nuestro cliente Supabase
import { useRouter } from 'next/navigation';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    // Intenta obtener la sesión actual al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escucha los cambios en el estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Redirigir después del login con OAuth (Google)
        // Supabase maneja la sesión después de la redirección de OAuth
        // y este listener se activará.
        if (event === 'SIGNED_IN' && session) {
          // Podrías querer redirigir a una página específica después del login
          // router.push('/dashboard'); // O donde sea apropiado
        }

        if (event === 'SIGNED_OUT') {
          // Redirigir a la página de login o a la home después del logout
          // router.push('/auth');
        }
      }
    );

    // Limpiar el listener cuando el componente se desmonte
    return () => {
      authListener?.unsubscribe();
    };
  }, [router]); // Añadir router como dependencia si lo usas dentro del efecto

  const value = {
    session,
    user,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      // La redirección se maneja en el listener onAuthStateChange (SIGNED_OUT)
      // o puedes forzar una aquí si es necesario:
      router.push('/'); // O a /auth
    },
  };

  // No renderizar nada hasta que la carga inicial de la sesión haya terminado
  // para evitar parpadeos o renderizado incorrecto de rutas protegidas
  // if (loading) {
  //   return <CircularProgress />; // O algún componente de carga global
  // }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};