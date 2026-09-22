'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  Sparkles,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  exportToExcel,
  exportToWord,
  exportToPDF,
  type ExportDataPayload,
} from '@/lib/financial-export-utils';

interface ExportHubCardProps {
  exportData: ExportDataPayload;
  className?: string;
}

export function ExportHubCard({ exportData, className = '' }: ExportHubCardProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExportExcel = () => {
    try {
      setDownloading('excel');
      exportToExcel(exportData);
      toast({
        title: 'Excel generado con éxito',
        description: 'Se ha descargado el libro Excel (.xlsx) con los 6 módulos y tablas analíticas.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al exportar a Excel',
        description: e.message || 'No se pudo generar el archivo.',
      });
    } finally {
      setTimeout(() => setDownloading(null), 800);
    }
  };

  const handleExportWord = () => {
    try {
      setDownloading('word');
      exportToWord(exportData);
      toast({
        title: 'Documento Word generado',
        description: 'Se ha descargado el informe corporativo (.doc/.docx) con los 6 módulos y recomendaciones.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al exportar a Word',
        description: e.message || 'No se pudo generar el documento.',
      });
    } finally {
      setTimeout(() => setDownloading(null), 800);
    }
  };

  const handleExportPDF = () => {
    try {
      toast({
        title: 'Preparando PDF',
        description: 'Se abrirá la ventana de impresión optimizada para guardar en PDF.',
      });
      exportToPDF(exportData);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al imprimir',
        description: e.message || 'No se pudo abrir el diálogo de impresión.',
      });
    }
  };

  return (
    <Card className={`rounded-3xl border border-primary/20 bg-card shadow-sm overflow-hidden ${className}`}>
      <CardHeader className="p-5 md:p-6 pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg font-bold">
                Exportar Informe de los 6 Módulos
              </CardTitle>
              <CardDescription className="text-xs">
                Descarga el análisis financiero completo con todas las tablas, métricas y diagnósticos en el formato que prefieras.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] font-bold text-primary border-primary/30 bg-primary/10 self-start sm:self-auto">
            6 Módulos Incluidos
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Botón Excel */}
          <Button
            type="button"
            variant="outline"
            className="h-auto py-3.5 px-4 rounded-2xl flex flex-col items-start text-left border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all duration-200 group"
            onClick={handleExportExcel}
            disabled={downloading === 'excel'}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Libro Excel</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                .XLSX
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Múltiples hojas con fórmulas, balances, EERR, razones y DuPont.
            </p>
          </Button>

          {/* Botón Word */}
          <Button
            type="button"
            variant="outline"
            className="h-auto py-3.5 px-4 rounded-2xl flex flex-col items-start text-left border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500 transition-all duration-200 group"
            onClick={handleExportWord}
            disabled={downloading === 'word'}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <FileText className="h-4 w-4" />
                <span>Informe Word</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                .DOCX
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Reporte directivo editable con tablas formateadas y recomendaciones.
            </p>
          </Button>

          {/* Botón PDF / Imprimir */}
          <Button
            type="button"
            variant="outline"
            className="h-auto py-3.5 px-4 rounded-2xl flex flex-col items-start text-left border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500 transition-all duration-200 group"
            onClick={handleExportPDF}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <Printer className="h-4 w-4" />
                <span>Informe PDF</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30">
                .PDF
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Diseño vectorial limpio optimizado para impresión y presentación ejecutiva.
            </p>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
