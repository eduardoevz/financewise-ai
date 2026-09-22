'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import type { UserRole, UserProfile } from '@/types';
import { TriangleAlert } from 'lucide-react';

const privilegedRoles: UserRole[] = ['contabilidad', 'gerencia'];

export default function WelcomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const currentProfile: UserProfile = user?.profile || {
    uid: user?.uid || '',
    nombre: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Usuario'),
    correo: user?.email || '',
    areaDeTrabajo: 'ventas' as UserRole,
    fechaRegistro: Date.now(),
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
        const timer = setTimeout(() => {
          if (!user) window.location.replace('/login');
        }, 1500);
        return () => clearTimeout(timer);
      } else if (
        currentProfile &&
        privilegedRoles.includes(currentProfile.areaDeTrabajo)
      ) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router, currentProfile]);

  if (loading || !user) {
    return (
      <div className="flex flex-col gap-4 h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
            <TriangleAlert className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Bienvenido, {currentProfile.nombre}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Tu rol de{' '}
          <span className="font-semibold text-primary capitalize">{currentProfile.areaDeTrabajo}</span>{' '}
          no tiene acceso al panel de análisis.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Por favor, contacta al administrador si crees que esto es un error.
        </p>
        <Button onClick={logout} className="mt-8" variant="outline">
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
