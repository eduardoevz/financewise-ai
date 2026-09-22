'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getReportsForUser, deleteReport, deleteAllReportsForUser } from '@/lib/firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, FileClock, Files, PlusCircle, Trash2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface Report {
  id: string;
  fechaCreacion: Timestamp;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingAll, setDeletingAll] = useState(false);
  const [isDeletingAllOpen, setIsDeletingAllOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getReportsForUser(user.uid);
      setReports(data);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error al cargar reportes',
        description: err.message || 'No se pudieron cargar los reportes.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const handleDeleteAll = async () => {
    if (!user) return;
    try {
      setDeletingAll(true);
      await deleteAllReportsForUser(user.uid);
      setReports([]);
      setIsDeletingAllOpen(false);
      toast({
        title: 'Historial eliminado',
        description: 'Se han eliminado todos los reportes de tu cuenta.',
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar historial',
        description: err.message || 'No se pudo eliminar el historial.',
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDeleteSingle = async (reportId: string) => {
    if (!user) return;
    try {
      setDeletingId(reportId);
      await deleteReport(user.uid, reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast({
        title: 'Reporte eliminado',
        description: 'El reporte seleccionado fue eliminado correctamente.',
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: err.message || 'No se pudo eliminar el reporte.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'Fecha no disponible';
    return timestamp.toDate().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4">
              <ArrowLeft size={16} />
              Volver al Panel
            </Link>
            <div className="flex items-center gap-4">
              <Files className="w-10 h-10 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Historial de Reportes</h1>
                <p className="text-muted-foreground">Consulta y gestiona todos tus análisis financieros generados.</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Mis Reportes</CardTitle>
                  <CardDescription>
                    {reports.length > 0
                      ? `Tienes ${reports.length} ${reports.length === 1 ? 'análisis guardado' : 'análisis guardados'}.`
                      : 'Aquí encontrarás una lista de todos los análisis que has realizado.'}
                  </CardDescription>
                </div>
                {reports.length > 0 && (
                  <AlertDialog open={isDeletingAllOpen} onOpenChange={setIsDeletingAllOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2 self-start sm:self-auto" disabled={deletingAll}>
                        <Trash2 className="h-4 w-4" />
                        {deletingAll ? 'Eliminando...' : 'Eliminar Todo el Historial'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar todo el historial?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará de forma permanente todos los <strong>{reports.length}</strong> reportes y análisis generados. No podrás recuperarlos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingAll}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteAll();
                          }}
                          disabled={deletingAll}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                          {deletingAll ? 'Eliminando...' : 'Sí, eliminar todo'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha de Creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{formatDate(report.fechaCreacion)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/analysis?reportId=${report.id}`}>
                                Ver Análisis
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                              onClick={() => handleDeleteSingle(report.id)}
                              title="Eliminar este reporte"
                              disabled={deletingId === report.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                    <FileClock className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No has generado ningún reporte todavía</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Empieza por cargar tus datos financieros para crear tu primer análisis.
                    </p>
                    <Button asChild className="mt-6">
                        <Link href="/dashboard">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear nuevo reporte
                        </Link>
                    </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
