'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gauge, TrendingUp, ShieldCheck, DollarSign, Package } from 'lucide-react';

interface BreakEvenChartProps {
  breakEvenData?: {
    periodoActual: any;
    periodoAnterior: any;
  } | null;
  breakEvenUnits?: {
    periodoActual: any;
    periodoAnterior: any;
  } | null;
}

export function BreakEvenChart({ breakEvenData, breakEvenUnits }: BreakEvenChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'actual' | 'anterior'>('actual');
  const [viewMode, setViewMode] = useState<'money' | 'units'>('money');

  const be = selectedPeriod === 'actual' ? breakEvenData?.periodoActual : breakEvenData?.periodoAnterior;
  const beUnit = selectedPeriod === 'actual' ? breakEvenUnits?.periodoActual : breakEvenUnits?.periodoAnterior;

  const ventas = be?.ventas ?? 0;
  const costosFijos = be?.costosFijos ?? 0;
  const costosVariables = be?.costosVariables ?? 0;
  const peVentas = be?.puntoEquilibrioVentas ?? 0;
  const razonMC = be?.razonMargenContribucion ?? 0;
  const margenSeguridadPct = be?.margenSeguridadPorcentaje ?? 0;
  const margenSeguridadMonto = be?.margenSeguridadMonto ?? 0;

  const pvu = beUnit?.pvu ?? (ventas > 0 ? 100 : 0);
  const cvu = beUnit?.costoVariableUnitario ?? (ventas > 0 ? (costosVariables / ventas) * pvu : 0);
  const peUnidades = beUnit?.peUnidades ?? (pvu - cvu > 0 ? Math.round(costosFijos / (pvu - cvu)) : 0);
  const ventasUnidades = beUnit?.ventasUnidades ?? (pvu > 0 ? Math.round(ventas / pvu) : 0);

  // Generate 15 simulation points from 0 to 1.8x max(sales, break-even)
  const chartData = useMemo(() => {
    if (!be || ventas <= 0) return [];

    const maxSales = Math.max(ventas, peVentas > 0 ? peVentas * 1.5 : ventas * 1.5);
    const maxUnits = Math.max(ventasUnidades, peUnidades > 0 ? peUnidades * 1.5 : 1000);

    const steps = 14;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;

      if (viewMode === 'units' && pvu > 0) {
        const q = Math.round(maxUnits * fraction);
        const ingresos = q * pvu;
        const cTotales = costosFijos + q * cvu;
        const cFijos = costosFijos;
        const utilidad = ingresos - cTotales;

        points.push({
          xValue: q,
          xLabel: `${q.toLocaleString('es-ES')} u`,
          ingresos,
          costosTotales: cTotales,
          costosFijos: cFijos,
          utilidad
        });
      } else {
        const currentSales = Math.round(maxSales * fraction);
        const variableRatio = ventas > 0 ? costosVariables / ventas : 0;
        const cTotales = costosFijos + currentSales * variableRatio;
        const cFijos = costosFijos;
        const utilidad = currentSales - cTotales;

        points.push({
          xValue: currentSales,
          xLabel: `$ ${Math.round(currentSales / 1000)}k`,
          ingresos: currentSales,
          costosTotales: Math.round(cTotales),
          costosFijos: Math.round(cFijos),
          utilidad: Math.round(utilidad)
        });
      }
    }

    // Ensure exact break-even point is included in points
    if (peVentas > 0) {
      if (viewMode === 'units' && peUnidades > 0) {
        points.push({
          xValue: peUnidades,
          xLabel: `${peUnidades.toLocaleString('es-ES')} u (PE)`,
          ingresos: Math.round(peUnidades * pvu),
          costosTotales: Math.round(costosFijos + peUnidades * cvu),
          costosFijos: Math.round(costosFijos),
          utilidad: 0,
          isBreakEvenPoint: true
        });
      } else {
        points.push({
          xValue: Math.round(peVentas),
          xLabel: `$ ${Math.round(peVentas / 1000)}k (PE)`,
          ingresos: Math.round(peVentas),
          costosTotales: Math.round(peVentas),
          costosFijos: Math.round(costosFijos),
          utilidad: 0,
          isBreakEvenPoint: true
        });
      }
      points.sort((a, b) => a.xValue - b.xValue);
    }

    return points;
  }, [be, ventas, costosFijos, costosVariables, peVentas, pvu, cvu, peUnidades, ventasUnidades, viewMode]);

  const formatCurrency = (val: number) => `$ ${val.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`;

  const peX = viewMode === 'units' ? peUnidades : Math.round(peVentas);
  const peY = Math.round(peVentas);

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
              <Gauge className="h-5 w-5 text-primary" />
              Gráfico Interactivo de Punto de Equilibrio
            </CardTitle>
            <CardDescription>
              Intersección donde los Ingresos Totales cubren exactamente los Costos Totales (Utilidad = 0).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Period Selector */}
            <div className="flex rounded-lg border bg-background p-0.5 text-xs">
              <button
                onClick={() => setSelectedPeriod('actual')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedPeriod === 'actual' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Periodo Actual
              </button>
              <button
                onClick={() => setSelectedPeriod('anterior')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedPeriod === 'anterior' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Periodo Anterior
              </button>
            </div>

            {/* Mode Selector */}
            {beUnit?.pvu && (
              <div className="flex rounded-lg border bg-background p-0.5 text-xs">
                <button
                  onClick={() => setViewMode('money')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                    viewMode === 'money' ? 'bg-secondary text-secondary-foreground font-bold' : 'text-muted-foreground'
                  }`}
                  title="Valores Monetarios ($)"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('units')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                    viewMode === 'units' ? 'bg-secondary text-secondary-foreground font-bold' : 'text-muted-foreground'
                  }`}
                  title="Unidades Físicas (u)"
                >
                  <Package className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border bg-primary/5 border-primary/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Punto de Equilibrio ($)</span>
            <div className="text-lg sm:text-xl font-extrabold text-primary tabular-nums mt-0.5">
              {peVentas > 0 ? formatCurrency(peVentas) : '-'}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Ventas mínimas sin pérdida</span>
          </div>

          {beUnit?.peUnidades && (
            <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">PE en Unidades</span>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                {beUnit.peUnidades.toLocaleString('es-ES')} u
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Volumen mínimo de producción</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl border bg-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Margen de Seguridad</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground tabular-nums mt-0.5">
              {margenSeguridadPct !== null ? `${margenSeguridadPct.toFixed(1)}%` : '-'}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              {margenSeguridadMonto !== null ? `${formatCurrency(margenSeguridadMonto)} sobre PE` : '-'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border bg-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Costos Fijos Totales</span>
            <div className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
              {costosFijos > 0 ? formatCurrency(costosFijos) : '-'}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Gastos de Operación</span>
          </div>
        </div>

        {/* Recharts Chart */}
        <div className="h-[380px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="xValue"
                tickFormatter={(val) =>
                  viewMode === 'units'
                    ? `${val.toLocaleString('es-ES')} u`
                    : `$ ${(val / 1000).toFixed(0)}k`
                }
                tick={{ fontSize: 11 }}
                name={viewMode === 'units' ? 'Unidades Vendidas' : 'Ventas ($)'}
              />
              <YAxis
                tickFormatter={(val) => `$ ${(val / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isProfit = data.utilidad >= 0;
                    return (
                      <div className="rounded-xl border bg-background/95 backdrop-blur-md p-3 shadow-lg text-xs space-y-1.5 border-border">
                        <div className="font-bold text-foreground border-b pb-1">
                          {viewMode === 'units' ? `Volumen: ${Number(label).toLocaleString('es-ES')} unidades` : `Nivel de Ventas: $ ${Number(label).toLocaleString('es-ES')}`}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400 font-semibold">
                          <span>Ingresos Totales:</span>
                          <span className="tabular-nums">$ {data.ingresos.toLocaleString('es-ES')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-red-600 dark:text-red-400 font-semibold">
                          <span>Costos Totales:</span>
                          <span className="tabular-nums">$ {data.costosTotales.toLocaleString('es-ES')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400 font-semibold">
                          <span>Costos Fijos:</span>
                          <span className="tabular-nums">$ {data.costosFijos.toLocaleString('es-ES')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t font-bold">
                          <span>{isProfit ? 'Utilidad Neta Estimada:' : 'Pérdida Estimada:'}</span>
                          <span className={isProfit ? 'text-emerald-600' : 'text-red-600'}>
                            $ {data.utilidad.toLocaleString('es-ES')}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(val) => <span className="text-xs font-semibold text-foreground">{val}</span>}
              />

              {/* Fixed Costs Line (Amber) */}
              <Line
                type="monotone"
                dataKey="costosFijos"
                name="Costos Fijos"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={false}
              />

              {/* Total Costs Line (Red) */}
              <Line
                type="monotone"
                dataKey="costosTotales"
                name="Costos Totales (CF + CV)"
                stroke="#ef4444"
                strokeWidth={3}
                dot={false}
              />

              {/* Total Revenue Line (Blue) */}
              <Line
                type="monotone"
                dataKey="ingresos"
                name="Ingresos Totales (Ventas)"
                stroke="#3b82f6"
                strokeWidth={3.5}
                dot={false}
              />

              {/* Highlight intersection: Break-Even Point */}
              {peVentas > 0 && (
                <>
                  <ReferenceLine
                    x={peX}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    label={{
                      value: `PE: ${viewMode === 'units' ? `${peUnidades.toLocaleString('es-ES')} u` : formatCurrency(peVentas)}`,
                      position: 'insideTopRight',
                      fill: '#10b981',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                  <ReferenceDot
                    x={peX}
                    y={peY}
                    r={7}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={2.5}
                  />
                </>
              )}

              {/* Current Sales Level */}
              {ventas > 0 && (
                <ReferenceLine
                  x={viewMode === 'units' ? ventasUnidades : ventas}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  label={{
                    value: `Ventas Actuales`,
                    position: 'top',
                    fill: '#6366f1',
                    fontSize: 11,
                    fontWeight: 'bold'
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Interpretation callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4" /> Zona de Ganancia (Ventas &gt; PE)
            </div>
            Cuando el volumen supera las <strong>{viewMode === 'units' ? `${peUnidades.toLocaleString('es-ES')} unidades` : formatCurrency(peVentas)}</strong>, cada venta adicional genera utilidad neta gracias al Margen de Contribución.
          </div>

          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-300">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-4 w-4" /> Zona de Pérdida (Ventas &lt; PE)
            </div>
            Por debajo del punto de equilibrio, los ingresos generados no son suficientes para absorber la totalidad de los costos fijos ({formatCurrency(costosFijos)}).
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
