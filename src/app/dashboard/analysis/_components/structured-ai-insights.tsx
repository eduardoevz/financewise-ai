'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Search,
  AlertTriangle,
  Lightbulb,
  Target,
  Sparkles,
  Info,
  CheckCircle2,
  ListChecks
} from 'lucide-react';

export interface IndicatorInsight {
  indicador: string;
  hallazgo: string;
  riesgo: string;
}

export interface SectionAnalysisStructured {
  resumen?: string;
  insights?: IndicatorInsight[];
  indicadores?: IndicatorInsight[]; // synonym support
  diagnostico?: string;
  recomendaciones?: string[];
}

export type SectionAnalysisData = SectionAnalysisStructured | string | null | undefined;

interface StructuredAIInsightsProps {
  title?: string;
  description?: string;
  data: SectionAnalysisData;
  className?: string;
}

export function cleanFinancialText(text?: string | null): string {
  if (!text) return '';
  // Removes trailing 'x' or 'X' after numbers (e.g. "2.42x" -> "2.42", "1.15x" -> "1.15")
  return text.replace(/(\d+(?:[.,]\d+)?)\s*x\b/gi, '$1');
}

export function StructuredAIInsights({
  title = 'Evaluación Financiera',
  description,
  data,
  className = '',
}: StructuredAIInsightsProps) {
  if (!data) return null;

  // Case 1: Legacy HTML string fallback
  if (typeof data === 'string') {
    if (data.includes('No disponible en el documento')) {
      return (
        <div className="mt-4 p-4 rounded-xl border bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>Información no disponible en el documento financiero proporcionado para este análisis.</span>
        </div>
      );
    }
    return (
      <div className={`mt-4 border-t pt-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3 text-foreground font-bold text-sm">
          <FileText className="h-4 w-4 text-primary" />
          <span>{title}</span>
        </div>
        <div
          className="prose prose-pink dark:prose-invert max-w-none text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: cleanFinancialText(data) }}
        />
      </div>
    );
  }

  // Case 2: Structured Data Object
  const items = data.insights || data.indicadores || [];
  const resumen = data.resumen;
  const diagnostico = data.diagnostico;
  const recomendaciones = Array.isArray(data.recomendaciones) ? data.recomendaciones : [];

  if (!resumen && items.length === 0 && !diagnostico && recomendaciones.length === 0) return null;

  return (
    <div className={`mt-6 space-y-4 border-t pt-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              {title}
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/80 bg-muted/30 py-0">
                Evaluación Especializada
              </Badge>
            </h4>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumen de la sección */}
      {resumen && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs md:text-sm text-foreground leading-relaxed flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground mr-1.5">Síntesis:</span>
            <span>{cleanFinancialText(resumen)}</span>
          </div>
        </div>
      )}

      {/* Grid de Indicadores Estructurados (Únicamente Hallazgo y Riesgo) */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border bg-card/95 hover:bg-card transition-all p-4 shadow-sm space-y-3 flex flex-col justify-between border-border/80"
            >
              {/* Encabezado del Indicador */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                <span className="font-bold text-xs sm:text-sm text-foreground tracking-tight flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                  {cleanFinancialText(item.indicador)}
                </span>
                <Badge variant="secondary" className="text-[10px] font-medium py-0 shrink-0">
                  Evaluación
                </Badge>
              </div>

              {/* Bloques de Contenido: Solo Hallazgo y Riesgo */}
              <div className="space-y-2.5 text-xs">
                {/* 1. Hallazgo Cuantitativo */}
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                    <Search className="h-3.5 w-3.5 text-sky-500" />
                    <span>Hallazgo Cuantitativo:</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-5">
                    {cleanFinancialText(item.hallazgo)}
                  </p>
                </div>

                {/* 2. Riesgo / Costo de Oportunidad */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span>Riesgo / Costo de Oportunidad:</span>
                  </div>
                  <p className="text-amber-950 dark:text-amber-200/90 leading-relaxed pl-5">
                    {cleanFinancialText(item.riesgo)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diagnóstico Específico de este Módulo */}
      {diagnostico && (
        <div className="rounded-2xl border border-primary/20 bg-card p-4 md:p-5 shadow-xs space-y-2 mt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <FileText className="h-4 w-4 text-primary" />
            <h5 className="text-xs md:text-sm font-bold text-foreground">
              Diagnóstico
            </h5>
          </div>
          <p className="text-xs md:text-sm leading-relaxed text-foreground font-medium pt-1">
            {cleanFinancialText(diagnostico)}
          </p>
        </div>
      )}

      {/* Recomendaciones Específicas de este Módulo (Viñetas) */}
      {recomendaciones.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-xs space-y-3 mt-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <ListChecks className="h-4 w-4 text-primary" />
            <h5 className="text-xs md:text-sm font-bold text-foreground">
              Recomendaciones
            </h5>
          </div>
          <ul className="space-y-2.5 pt-1">
            {recomendaciones.map((rec: string, idx: number) => (
              <li
                key={idx}
                className="p-3 rounded-xl bg-muted/30 border border-border/70 flex items-start gap-2.5 text-xs md:text-sm leading-relaxed text-foreground hover:bg-muted/50 transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                <span className="flex-1">{cleanFinancialText(rec.replace(/^[•\-\*]\s*/, ''))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface GlobalSummaryDisplayProps {
  summary: any;
}

export function GlobalSummaryDisplay({ summary }: GlobalSummaryDisplayProps) {
  if (!summary) return null;

  // If summary is legacy HTML string
  if (typeof summary === 'string') {
    return (
      <Card className="rounded-3xl border border-primary/20 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg md:text-xl font-bold">
            <FileText className="h-6 w-6 text-primary" />
            <span>Diagnóstico</span>
          </CardTitle>
          <CardDescription>
            Síntesis integral de desempeño, solvencia y plan directivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-pink dark:prose-invert max-w-none text-sm md:text-base leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: cleanFinancialText(summary) }} />
        </CardContent>
      </Card>
    );
  }

  const diagnostico = summary.diagnostico || summary.diagnostico_global || summary.resumen;
  
  // Extract recommendations as string array
  let recomendaciones: string[] = [];
  if (Array.isArray(summary.recomendaciones)) {
    recomendaciones = summary.recomendaciones.map((r: any) =>
      typeof r === 'string' ? r : (r.recomendacion ? `${r.indicador ? `${r.indicador}: ` : ''}${r.recomendacion}` : JSON.stringify(r))
    );
  } else if (Array.isArray(summary.recomendaciones_prioritarias)) {
    recomendaciones = summary.recomendaciones_prioritarias.map((r: any) =>
      typeof r === 'string' ? r : `${r.indicador ? `**${r.indicador}**: ` : ''}${r.recomendacion || r.hallazgo} ${r.impacto_estimado ? `(Impacto estimado: ${r.impacto_estimado})` : ''}`
    );
  }

  return (
    <Card className="rounded-3xl border border-primary/25 bg-card shadow-md overflow-hidden space-y-0">
      <CardHeader className="p-6 md:p-8 pb-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
              Diagnóstico
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Evaluación consolidada de la situación y desempeño financiero de la empresa.
            </p>
          </div>
        </div>

        {/* Diagnóstico Text */}
        {diagnostico && (
          <div className="mt-4 p-4 rounded-2xl bg-card border border-border text-sm leading-relaxed text-foreground font-medium shadow-xs">
            <p>{cleanFinancialText(diagnostico)}</p>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
          <ListChecks className="h-5 w-5 text-primary" />
          <h4 className="text-base md:text-lg font-bold text-foreground">
            Recomendaciones
          </h4>
        </div>

        {recomendaciones.length > 0 ? (
          <ul className="space-y-3 pt-1">
            {recomendaciones.map((rec: string, idx: number) => (
              <li
                key={idx}
                className="p-3.5 rounded-xl bg-muted/30 border border-border/70 flex items-start gap-3 text-xs md:text-sm leading-relaxed text-foreground hover:bg-muted/50 transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                <span className="flex-1">{cleanFinancialText(rec.replace(/^[•\-\*]\s*/, ''))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No se registraron recomendaciones adicionales.</p>
        )}
      </CardContent>
    </Card>
  );
}
