'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import type { UserRole, UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  FileSpreadsheet,
  Camera,
  Menu,
  BrainCircuit,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const privilegedRoles: UserRole[] = ['contabilidad', 'gerencia'];

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  const currentProfile: UserProfile = user?.profile || {
    uid: user?.uid || '',
    nombre: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Usuario'),
    correo: user?.email || '',
    areaDeTrabajo: 'contabilidad' as UserRole,
    fechaRegistro: Date.now(),
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !loading) {
      if (!user) {
        router.replace('/login');
        const fallbackTimer = setTimeout(() => {
          if (!user) window.location.replace('/login');
        }, 1500);
        return () => clearTimeout(fallbackTimer);
      } else if (
        currentProfile &&
        !privilegedRoles.includes(currentProfile.areaDeTrabajo)
      ) {
        router.replace('/welcome');
      }
    }
  }, [user, loading, router, isClient, currentProfile]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground animate-pulse">Cargando plataforma...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4 h-screen w-full items-center justify-center bg-background p-4 text-center">
        <LoadingSpinner className="h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">Redirigiendo al inicio de sesión...</p>
        <Button variant="outline" size="sm" onClick={() => (window.location.href = '/login')}>
          Ir al Inicio de Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Floating Glassmorphic Header */}
      <header className="sticky top-0 z-50 glass-header px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-palette-500 to-palette-400 flex items-center justify-center shadow-md shadow-palette-500/25">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight gradient-text">
                FinanceWise AI
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Plataforma de Inteligencia Financiera</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <p className="text-sm font-semibold text-foreground">{currentProfile.nombre}</p>
              <div className="flex items-center justify-end gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-medium text-muted-foreground capitalize">
                  {currentProfile.areaDeTrabajo}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5">
                  <Menu className="h-5 w-5 text-foreground" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-primary/20">
                <DropdownMenuLabel className="font-bold">Mi Cuenta</DropdownMenuLabel>
                <div className="px-2 py-1 text-xs text-muted-foreground sm:hidden">
                  <p className="font-semibold text-foreground">{currentProfile.nombre}</p>
                  <p className="capitalize">{currentProfile.areaDeTrabajo}</p>
                </div>
                <DropdownMenuSeparator />
                <Link href="/dashboard/reports" passHref>
                  <DropdownMenuItem className="cursor-pointer">
                    <BarChart3 className="mr-2 h-4 w-4 text-primary" /> Reportes Guardados
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/about" passHref>
                  <DropdownMenuItem className="cursor-pointer">
                    <Building2Icon className="mr-2 h-4 w-4 text-primary" /> Acerca de la Empresa
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/legal" passHref>
                  <DropdownMenuItem className="cursor-pointer">
                    <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Procesos Legales
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive font-medium cursor-pointer">
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-palette-100/30 to-palette-200/20 p-6 md:p-10 shadow-lg shadow-palette-500/5">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                Análisis Financiero
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Toma decisiones estratégicas con análisis financiero integral
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Genera en segundos el Sistema DuPont, Punto de Equilibrio físico y monetario, Razones Financieras y diagnóstico ejecutivo.
              </p>
            </div>
            {/* Ambient Background Graphic */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 dark:opacity-5 pointer-events-none flex items-center justify-center">
              <TrendingUp className="w-80 h-80 text-primary" />
            </div>
          </div>

          {/* Cards Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xl font-bold text-foreground">Carga y Diagnóstico de Estados Financieros</h3>
                <p className="text-sm text-muted-foreground">Selecciona el método más cómodo para procesar tus balances y estados de resultados.</p>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto border-primary/30 text-primary font-medium">
                <Zap className="mr-1 h-3 w-3" /> Procesamiento Instantáneo
              </Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-2">
              {/* Card 1: Carga Manual */}
              <Link href="/dashboard/upload/manual" className="group block focus:outline-none">
                <div className="h-full rounded-2xl border border-primary/15 bg-card/90 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-palette-500/15 to-palette-300/20 text-palette-500 border border-palette-300/30 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        Carga Manual
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Ingresa o edita cada cuenta del balance y estado de resultados en formularios interactivos.
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 mt-4 border-t border-border/60 flex items-center justify-between text-sm font-semibold text-primary">
                    <span>Comenzar Formulario</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Card 2: Subir Excel (Featured) */}
              <Link href="/dashboard/upload/excel" className="group block focus:outline-none">
                <div className="h-full rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-card via-card to-palette-100/40 backdrop-blur-sm p-6 shadow-md hover:shadow-2xl hover:border-primary hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary text-white shadow-sm">
                      Recomendado
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-palette-500 to-palette-400 text-white flex items-center justify-center shadow-lg shadow-palette-500/30 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        Subir Archivo Excel
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Importa directamente tus archivos <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.xlsx</code> o <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.csv</code> con mapeo y normalización automática.
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 mt-4 border-t border-primary/20 flex items-center justify-between text-sm font-bold text-primary">
                    <span>Importar Archivo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Card 3: Subir Foto */}
              <Link href="/dashboard/upload/photo" className="group block focus:outline-none">
                <div className="h-full rounded-2xl border border-primary/15 bg-card/90 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-palette-500/15 to-palette-300/20 text-palette-500 border border-palette-300/30 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                      <Camera className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        Escanear Foto / Imagen
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Digitaliza documentos físicos o capturas de pantalla mediante reconocimiento de texto OCR.
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 mt-4 border-t border-border/60 flex items-center justify-between text-sm font-semibold text-primary">
                    <span>Escanear Documento</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Building2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
