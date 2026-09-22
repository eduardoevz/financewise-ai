'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, TrendingUp, TrendingDown, ArrowRight, Layers, DollarSign, Activity, Scale, Sparkles } from 'lucide-react';

interface DupontTreeChartProps {
  ratios: any;
  financialData?: {
    balanceSheet: any;
    incomeStatement: any;
  };
}

export function DupontTreeChart({ ratios, financialData }: DupontTreeChartProps) {
  const [activePeriod, setActivePeriod] = useState<'actual' | 'anterior' | 'comparison'>('actual');

  // DuPont Components (Memoized)
  const {
    roeAct,
    roeAnt,
    margenAct,
    margenAnt,
    rotacionAct,
    rotacionAnt,
    apalancamientoAct,
    apalancamientoAnt,
    roaAct,
    roaAnt,
    roeVar,
    margenVar,
    rotacionVar,
    apalancamientoVar,
    roaVar,
  } = useMemo(() => {
    const rAct = ratios?.dupont_roe?.periodoActual ?? ratios?.rentabilidad_patrimonio_roe?.periodoActual;
    const rAnt = ratios?.dupont_roe?.periodoAnterior ?? ratios?.rentabilidad_patrimonio_roe?.periodoAnterior;

    const mAct = ratios?.dupont_margen_neta?.periodoActual ?? ratios?.margen_utilidad_neta?.periodoActual;
    const mAnt = ratios?.dupont_margen_neta?.periodoAnterior ?? ratios?.margen_utilidad_neta?.periodoAnterior;

    const rotAct = ratios?.dupont_rotacion_activos?.periodoActual ?? ratios?.rotacion_activos_totales?.periodoActual;
    const rotAnt = ratios?.dupont_rotacion_activos?.periodoAnterior ?? ratios?.rotacion_activos_totales?.periodoAnterior;

    const apalAct = ratios?.dupont_apalancamiento?.periodoActual;
    const apalAnt = ratios?.dupont_apalancamiento?.periodoAnterior;

    const roaA = ratios?.rentabilidad_activo_roa?.periodoActual ?? (mAct !== null && rotAct !== null ? mAct * rotAct : null);
    const roaB = ratios?.rentabilidad_activo_roa?.periodoAnterior ?? (mAnt !== null && rotAnt !== null ? mAnt * rotAnt : null);

    const getVarPct = (act?: number | null, ant?: number | null) => {
      if (act === undefined || act === null || ant === undefined || ant === null || ant === 0) return null;
      return ((act - ant) / Math.abs(ant)) * 100;
    };

    return {
      roeAct: rAct,
      roeAnt: rAnt,
      margenAct: mAct,
      margenAnt: mAnt,
      rotacionAct: rotAct,
      rotacionAnt: rotAnt,
      apalancamientoAct: apalAct,
      apalancamientoAnt: apalAnt,
      roaAct: roaA,
      roaAnt: roaB,
      roeVar: getVarPct(rAct, rAnt),
      margenVar: getVarPct(mAct, mAnt),
      rotacionVar: getVarPct(rotAct, rotAnt),
      apalancamientoVar: getVarPct(apalAct, apalAnt),
      roaVar: getVarPct(roaA, roaB),
    };
  }, [ratios]);

  const formatPct = (val?: number | null) => (val !== undefined && val !== null && isFinite(val) ? `${(val * 100).toFixed(2)}%` : '-');
  const formatDec = (val?: number | null, suffix = '') => (val !== undefined && val !== null && isFinite(val) ? `${val.toFixed(2)}${suffix}` : '-');

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
              <BarChart className="h-5 w-5 text-primary" />
              Diagrama Jerárquico del Sistema DuPont (Desglose del ROE)
            </CardTitle>
            <CardDescription>
              Descompone el Rendimiento sobre el Capital (ROE) en sus 3 factores multiplicadores determinantes.
            </CardDescription>
          </div>

          <div className="flex rounded-lg border bg-background p-0.5 text-xs">
            <button
              onClick={() => setActivePeriod('actual')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activePeriod === 'actual' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Periodo Actual
            </button>
            <button
              onClick={() => setActivePeriod('anterior')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activePeriod === 'anterior' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Periodo Anterior
            </button>
            <button
              onClick={() => setActivePeriod('comparison')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activePeriod === 'comparison' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Comparativo
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Visual DuPont Formula Flow Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/30 to-primary/10 border border-primary/20 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-center shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rentabilidad Total</span>
            <span className="text-xl md:text-2xl font-black text-primary tabular-nums">
              ROE: {activePeriod === 'anterior' ? formatPct(roeAnt) : formatPct(roeAct)}
            </span>
          </div>

          <span className="text-2xl font-black text-muted-foreground/60">=</span>

          <div className="flex items-center flex-wrap justify-center gap-2 md:gap-4">
            {/* Margen Neto */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-background/80 border shadow-xs min-w-[110px]">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Margen Neto</span>
              <span className="text-sm md:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {activePeriod === 'anterior' ? formatPct(margenAnt) : formatPct(margenAct)}
              </span>
            </div>

            <span className="text-lg font-black text-muted-foreground/60">×</span>

            {/* Rotacion Activos */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-background/80 border shadow-xs min-w-[110px]">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Rotación Activos</span>
              <span className="text-sm md:text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {activePeriod === 'anterior' ? formatDec(rotacionAnt) : formatDec(rotacionAct)}
              </span>
            </div>

            <span className="text-lg font-black text-muted-foreground/60">×</span>

            {/* Apalancamiento */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-background/80 border shadow-xs min-w-[110px]">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Multiplicador</span>
              <span className="text-sm md:text-base font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                {activePeriod === 'anterior' ? formatDec(apalancamientoAnt) : formatDec(apalancamientoAct)}
              </span>
            </div>
          </div>
        </div>

        {/* Tree / Flow Chart Diagram */}
        <div className="relative pt-4 pb-2">
          {/* Level 1: Root Node (ROE) */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-md p-5 rounded-2xl border-2 border-primary bg-card shadow-md text-center relative">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <h4 className="text-base font-extrabold text-foreground">ROE - Rentabilidad sobre el Capital</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Utilidad Neta / Capital Contable</p>

              <div className="flex items-center justify-center gap-6 pt-2 border-t">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Periodo Actual</span>
                  <span className="text-2xl font-black text-primary tabular-nums">{formatPct(roeAct)}</span>
                </div>
                {activePeriod === 'comparison' && (
                  <div className="border-l pl-6">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Periodo Anterior</span>
                    <span className="text-xl font-bold text-muted-foreground tabular-nums">{formatPct(roeAnt)}</span>
                  </div>
                )}
                {activePeriod === 'comparison' && roeVar !== null && (
                  <Badge variant="outline" className={`font-bold ${roeVar >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                    {roeVar >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                    {roeVar > 0 ? '+' : ''}{roeVar.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Level 2: 3 Pillars Connected */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Pillar 1: Margen de Utilidad Neta */}
            <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-card hover:border-emerald-500/60 transition-all shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" /> 1. Eficiencia Operativa
                  </span>
                  <Badge variant="secondary" className="text-[10px]">Margen Neto</Badge>
                </div>

                <div className="my-3">
                  <div className="text-2xl font-black text-foreground tabular-nums">
                    {activePeriod === 'anterior' ? formatPct(margenAnt) : formatPct(margenAct)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Capacidad de convertir cada $1 de venta en utilidad líquida tras todos los costos e impuestos.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 text-xs space-y-1 bg-muted/20 p-2.5 rounded-lg">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Fórmula:</span>
                  <span className="font-mono text-[11px] font-bold">Utilidad Neta / Ventas</span>
                </div>
                {activePeriod === 'comparison' && (
                  <div className="flex justify-between text-muted-foreground pt-1 border-t">
                    <span>Var. Interanual:</span>
                    <span className={margenVar !== null && margenVar >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                      {margenVar !== null ? `${margenVar > 0 ? '+' : ''}${margenVar.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pillar 2: Rotación de Activos Totales */}
            <div className="p-4 rounded-xl border-2 border-blue-500/30 bg-card hover:border-blue-500/60 transition-all shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Activity className="h-4 w-4" /> 2. Eficiencia en Activos
                  </span>
                  <Badge variant="secondary" className="text-[10px]">Rotación</Badge>
                </div>

                <div className="my-3">
                  <div className="text-2xl font-black text-foreground tabular-nums">
                    {activePeriod === 'anterior' ? formatDec(rotacionAnt, ' veces') : formatDec(rotacionAct, ' veces')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cuántas veces al año la empresa rota y genera ingresos a partir de sus activos invertidos.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 text-xs space-y-1 bg-muted/20 p-2.5 rounded-lg">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Fórmula:</span>
                  <span className="font-mono text-[11px] font-bold">Ventas / Activos Totales</span>
                </div>
                {activePeriod === 'comparison' && (
                  <div className="flex justify-between text-muted-foreground pt-1 border-t">
                    <span>Var. Interanual:</span>
                    <span className={rotacionVar !== null && rotacionVar >= 0 ? 'text-blue-600 font-bold' : 'text-red-600 font-bold'}>
                      {rotacionVar !== null ? `${rotacionVar > 0 ? '+' : ''}${rotacionVar.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pillar 3: Multiplicador de Capital (Apalancamiento) */}
            <div className="p-4 rounded-xl border-2 border-purple-500/30 bg-card hover:border-purple-500/60 transition-all shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Scale className="h-4 w-4" /> 3. Apalancamiento Financiero
                  </span>
                  <Badge variant="secondary" className="text-[10px]">Multiplicador</Badge>
                </div>

                <div className="my-3">
                  <div className="text-2xl font-black text-foreground tabular-nums">
                    {activePeriod === 'anterior' ? formatDec(apalancamientoAnt) : formatDec(apalancamientoAct)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grado en que la empresa utiliza deuda para financiar sus activos y potenciar el rendimiento patrimonial.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 text-xs space-y-1 bg-muted/20 p-2.5 rounded-lg">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Fórmula:</span>
                  <span className="font-mono text-[11px] font-bold">Activo Total / Capital</span>
                </div>
                {activePeriod === 'comparison' && (
                  <div className="flex justify-between text-muted-foreground pt-1 border-t">
                    <span>Var. Interanual:</span>
                    <span className={apalancamientoVar !== null && apalancamientoVar >= 0 ? 'text-purple-600 font-bold' : 'text-red-600 font-bold'}>
                      {apalancamientoVar !== null ? `${apalancamientoVar > 0 ? '+' : ''}${apalancamientoVar.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Level 3: Intermediate ROA Node */}
          <div className="mt-6 p-4 rounded-xl border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <div>
                <span className="font-bold text-foreground">ROA (Rendimiento sobre Activos): </span>
                <span className="text-muted-foreground font-mono">Margen Neto × Rotación de Activos = </span>
                <strong className="text-primary font-bold">{activePeriod === 'anterior' ? formatPct(roaAnt) : formatPct(roaAct)}</strong>
              </div>
            </div>
            <div className="text-muted-foreground">
              Multiplicado por el Apalancamiento ({activePeriod === 'anterior' ? formatDec(apalancamientoAnt) : formatDec(apalancamientoAct)}) produce el ROE final de{' '}
              <strong className="text-foreground">{activePeriod === 'anterior' ? formatPct(roeAnt) : formatPct(roeAct)}</strong>.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
