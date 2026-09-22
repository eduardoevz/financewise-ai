'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { AuthUser, UserProfile } from '@/types';
import { LoadingSpinner } from '@/components/loading-spinner';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: ensure loading becomes false within 2.5s even if Firebase takes longer
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          let profile: UserProfile | null = null;
          try {
            // Give getUserProfile up to 2 seconds to fetch from Firestore
            const fetchProfile = getUserProfile(firebaseUser.uid);
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
            profile = await Promise.race([fetchProfile, timeoutPromise]);
          } catch (profileError) {
            console.warn('Error al cargar perfil desde Firestore, usando perfil por defecto:', profileError);
          }

          // Fallback profile if not found in Firestore or if fetch timed out/failed
          if (!profile) {
            profile = {
              uid: firebaseUser.uid,
              nombre: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Usuario'),
              correo: firebaseUser.email || '',
              areaDeTrabajo: 'contabilidad',
              fechaRegistro: Date.now(),
            };
          }

          setUser({ ...firebaseUser, profile });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in onAuthStateChanged:', error);
        setUser(null);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}