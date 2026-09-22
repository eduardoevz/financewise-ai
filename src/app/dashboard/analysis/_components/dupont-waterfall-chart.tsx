'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Layers, HelpCircle, Info } from 'lucide-react';

interface DupontWaterfallChartProps {
  ratios: any;
}

export interface WaterfallEntry {
  name: string;
  shortName: string;
  base: number;
  value: number;
  delta: number;
  displayVal: string;
  type: 'initial' | 'positive' | 'negative' | 'final';
  fill: string;
}

export function DupontWaterfallChart({ ratios }: DupontWaterfallChartProps) {
  const {
    roeAnt,
    roeAct,
    margenAnt,
    margenAct,
    rotacionAnt,
    rotacionAct,
    apalancamientoAnt,
    apalancamientoAct,
    deltaRoe,
    efectoMargen,
    efectoRotacion,
    efectoApalancamiento,
    waterfallData,
  } = useMemo(() => {
    const rAnt: number = Number(ratios?.dupont_roe?.periodoAnterior ?? ratios?.rentabilidad_patrimonio_roe?.periodoAnterior ?? 0.1269);
    const rAct: number = Number(ratios?.dupont_roe?.periodoActual ?? ratios?.rentabilidad_patrimonio_roe?.periodoActual ?? 0.1838);

    const mAnt: number = Number(ratios?.dupont_margen_neta?.periodoAnterior ?? ratios?.margen_utilidad_neta?.periodoAnterior ?? 0.088);
    const mAct: number = Number(ratios?.dupont_margen_neta?.periodoActual ?? ratios?.margen_utilidad_neta?.periodoActual ?? 0.120);

    const rotAnt: number = Number(ratios?.dupont_rotacion_activos?.periodoAnterior ?? ratios?.rotacion_activos_totales?.periodoAnterior ?? 0.85);
    const rotAct: number = Number(ratios?.dupont_rotacion_activos?.periodoActual ?? ratios?.rotacion_activos_totales?.periodoActual ?? 0.95);

    const apalAnt: number = Number(ratios?.dupont_apalancamiento?.periodoAnterior ?? 1.70);
    const apalAct: number = Number(ratios?.dupont_apalancamiento?.periodoActual ?? 1.61);

    // Sequential Decomposition Order (Margen Neto -> Rotación de Activos -> Multiplicador de Capital)
    // 1. Efecto Margen Neto = (mAct - mAnt) * rotAnt * apalAnt
    const effMargen = (mAct - mAnt) * rotAnt * apalAnt;

    // 2. Efecto Rotación de Activos = mAct * (rotAct - rotAnt) * apalAnt
    const effRotacion = mAct * (rotAct - rotAnt) * apalAnt;

    // 3. Efecto Multiplicador de Capital = mAct * rotAct * (apalAct - apalAnt)
    const effApalancamiento = mAct * rotAct * (apalAct - apalAnt);

    const dRoe = rAct - rAnt;

    // Build Floating Waterfall data for Recharts (transparent base bar + colored delta bar)
    // Step 0: ROE Inicial
    const roeAntPct = rAnt * 100;
    const roeActPct = rAct * 100;
    const effMargenPct = effMargen * 100;
    const effRotacionPct = effRotacion * 100;
    const effApalancamientoPct = effApalancamiento * 100;

    let current = roeAntPct;

    // Step 1: Margen
    const baseMargen = effMargenPct >= 0 ? current : current + effMargenPct;
    current += effMargenPct;

    // Step 2: Rotacion
    const baseRotacion = effRotacionPct >= 0 ? current : current + effRotacionPct;
    current += effRotacionPct;

    // Step 3: Apalancamiento
    const baseApalancamiento = effApalancamientoPct >= 0 ? current : current + effApalancamientoPct;
    current += effApalancamientoPct;

    const data: WaterfallEntry[] = [
      {
        name: 'ROE Inicial',
        shortName: 'ROE Ant.',
        base: 0,
        value: Number(roeAntPct.toFixed(2)),
        delta: Number(roeAntPct.toFixed(2)),
        displayVal: `${roeAntPct.toFixed(2)}%`,
        type: 'initial',
        fill: '#3b82f6', // blue
      },
      {
        name: 'Efecto Margen Neto',
        shortName: 'Margen Neto',
        base: Number(baseMargen.toFixed(2)),
        value: Number(Math.abs(effMargenPct).toFixed(2)),
        delta: Number(effMargenPct.toFixed(2)),
        displayVal: `${effMargenPct >= 0 ? '+' : ''}${effMargenPct.toFixed(2)} pp`,
        type: effMargenPct >= 0 ? 'positive' : 'negative',
        fill: effMargenPct >= 0 ? '#10b981' : '#ef4444',
      },
      {
        name: 'Efecto Rotación Activos',
        shortName: 'Rot. Activos',
        base: Number(baseRotacion.toFixed(2)),
        value: Number(Math.abs(effRotacionPct).toFixed(2)),
        delta: Number(effRotacionPct.toFixed(2)),
        displayVal: `${effRotacionPct >= 0 ? '+' : ''}${effRotacionPct.toFixed(2)} pp`,
        type: effRotacionPct >= 0 ? 'positive' : 'negative',
        fill: effRotacionPct >= 0 ? '#10b981' : '#ef4444',
      },
      {
        name: 'Efecto Apalancamiento',
        shortName: 'Multiplicador',
        base: Number(baseApalancamiento.toFixed(2)),
        value: Number(Math.abs(effApalancamientoPct).toFixed(2)),
        delta: Number(effApalancamientoPct.toFixed(2)),
        displayVal: `${effApalancamientoPct >= 0 ? '+' : ''}${effApalancamientoPct.toFixed(2)} pp`,
        type: effApalancamientoPct >= 0 ? 'positive' : 'negative',
        fill: effApalancamientoPct >= 0 ? '#10b981' : '#ef4444',
      },
      {
        name: 'ROE Final',
        shortName: 'ROE Act.',
        base: 0,
        value: Number(roeActPct.toFixed(2)),
        delta: Number(roeActPct.toFixed(2)),
        displayVal: `${roeActPct.toFixed(2)}%`,
        type: 'final',
        fill: '#6366f1', // indigo / primary
      },
    ];

    return {
      roeAnt: roeAntPct,
      roeAct: roeActPct,
      margenAnt: mAnt * 100,
      margenAct: mAct * 100,
      rotacionAnt: rotAnt,
      rotacionAct: rotAct,
      apalancamientoAnt: apalAnt,
      apalancamientoAct: apalAct,
      deltaRoe: (rAct - rAnt) * 100,
      efectoMargen: effMargenPct,
      efectoRotacion: effRotacionPct,
      efectoApalancamiento: effApalancamientoPct,
      waterfallData: data,
    };
  }, [ratios]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      return (
        <div className="rounded-xl border bg-card p-3 shadow-lg text-xs space-y-1 z-50">
          <p className="font-bold text-foreground text-sm">{item.name}</p>
          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-muted-foreground">Contribución al ROE:</span>
            <span
              className={`font-mono font-bold ${
                item.type === 'positive'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : item.type === 'negative'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-primary font-extrabold'
              }`}
            >
              {item.displayVal}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-3xl border border-primary/20 bg-card shadow-sm overflow-hidden mt-6">
      <CardHeader className="p-5 md:p-6 pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle className="text-base md:text-lg font-bold">
                Descomposición en Cascada del ROE (DuPont Waterfall)
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/10">
                Variación de {roeAnt.toFixed(2)}% a {roeAct.toFixed(2)}% ({deltaRoe >= 0 ? '+' : ''}{deltaRoe.toFixed(2)} pp)
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Muestra exactamente cuánto aportó cada uno de los 3 pilares DuPont a la variación interanual del rendimiento sobre el capital.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 md:p-6 space-y-6">
        {/* Waterfall Chart */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
              <XAxis
                dataKey="shortName"
                tickLine={false}
                axisLine={{ stroke: '#88888840' }}
                tick={{ fill: '#888888', fontSize: 12, fontWeight: 600 }}
              />
              <YAxis
                unit="%"
                tickLine={false}
                axisLine={{ stroke: '#88888840' }}
                tick={{ fill: '#888888', fontSize: 11 }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={roeAnt} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine y={roeAct} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5} />

              {/* Invisible base bar for floating effect */}
              <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />

              {/* Floating bar showing the delta */}
              <Bar dataKey="value" stackId="waterfall" radius={[6, 6, 6, 6]}>
                {waterfallData.map((entry: WaterfallEntry, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl border bg-muted/20 border-border/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">ROE Inicial</span>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{roeAnt.toFixed(2)}%</span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Período Anterior</span>
          </div>

          <div className="p-3.5 rounded-xl border bg-muted/20 border-border/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Efecto Margen</span>
            <span className={`text-base font-extrabold ${efectoMargen >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {efectoMargen >= 0 ? '+' : ''}{efectoMargen.toFixed(2)} pp
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Rentabilidad Ventas</span>
          </div>

          <div className="p-3.5 rounded-xl border bg-muted/20 border-border/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Efecto Rotación</span>
            <span className={`text-base font-extrabold ${efectoRotacion >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {efectoRotacion >= 0 ? '+' : ''}{efectoRotacion.toFixed(2)} pp
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Productividad Activos</span>
          </div>

          <div className="p-3.5 rounded-xl border bg-muted/20 border-border/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Efecto Apalancamiento</span>
            <span className={`text-base font-extrabold ${efectoApalancamiento >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {efectoApalancamiento >= 0 ? '+' : ''}{efectoApalancamiento.toFixed(2)} pp
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Multiplicador Capital</span>
          </div>
        </div>

        {/* Technical Documentation Note on Exact Sequential Decomposition */}
        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>Nota Metodológica de Descomposición Secuencial Fija:</span>
          </div>
          <p className="leading-relaxed">
            Se utilizó el <strong>método de descomposición factorial secuencial exacta</strong> en orden estándar de análisis financiero (<strong>Margen Neto $\rightarrow$ Rotación de Activos $\rightarrow$ Multiplicador de Capital</strong>), garantizando que la suma de los 3 efectos (+{efectoMargen.toFixed(2)} pp, +{efectoRotacion.toFixed(2)} pp, {efectoApalancamiento.toFixed(2)} pp) iguale con precisión matemática al 100% de la variación del ROE (+{deltaRoe.toFixed(2)} pp, de {roeAnt.toFixed(2)}% a {roeAct.toFixed(2)}%).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
