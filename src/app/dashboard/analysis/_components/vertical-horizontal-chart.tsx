'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Layers, Percent, TrendingUp, DollarSign } from 'lucide-react';
import type { AnalysisRow } from '@/lib/finance-calculations';

interface VerticalHorizontalChartsProps {
  vhData?: {
    balanceSheet: AnalysisRow[];
    incomeStatement: AnalysisRow[];
    totalActivoActual?: number;
    totalActivoAnterior?: number;
    ventasActual?: number;
    ventasAnterior?: number;
  } | null;
  formatAccountName: (name: string) => string;
}

export function VerticalHorizontalCharts({ vhData, formatAccountName }: VerticalHorizontalChartsProps) {
  const [analysisType, setAnalysisType] = useState<'vertical' | 'horizontal'>('vertical');
  const [statementView, setStatementView] = useState<'balance' | 'income'>('balance');
  const [horizontalMetric, setHorizontalMetric] = useState<'percentage' | 'absolute'>('percentage');

  // Prepare Vertical Analysis Data
  const verticalData = useMemo(() => {
    const rows = statementView === 'balance' ? vhData?.balanceSheet : vhData?.incomeStatement;
    if (!rows) return [];

    // Filter out pure header or grand total duplicate rows to keep chart clean and readable
    return rows
      .filter(r => !r.isHeader && !r.isGrandTotal && (r.verticalActual !== null || r.verticalAnterior !== null))
      .map(r => ({
        name: formatAccountName(r.cuenta),
        rawKey: r.cuenta,
        actual: Number((r.verticalActual ?? 0).toFixed(2)),
        anterior: Number((r.verticalAnterior ?? 0).toFixed(2)),
        montoActual: r.periodoActual ?? 0,
        montoAnterior: r.periodoAnterior ?? 0,
        isTotal: r.isTotal
      }));
  }, [vhData, statementView, formatAccountName]);

  // Prepare Horizontal Analysis Data
  const horizontalData = useMemo(() => {
    const rows = statementView === 'balance' ? vhData?.balanceSheet : vhData?.incomeStatement;
    if (!rows) return [];

    return rows
      .filter(r => !r.isHeader && (r.variacionRelativa !== null || r.variacionAbsoluta !== null))
      .map(r => ({
        name: formatAccountName(r.cuenta),
        rawKey: r.cuenta,
        variacionPct: Number((r.variacionRelativa ?? 0).toFixed(2)),
        variacionAbs: Math.round(r.variacionAbsoluta ?? 0),
        montoActual: r.periodoActual ?? 0,
        montoAnterior: r.periodoAnterior ?? 0,
        isTotal: r.isTotal
      }));
  }, [vhData, statementView, formatAccountName]);

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
              <Layers className="h-5 w-5 text-primary" />
              Gráficos Interactivos de Estructura y Variaciones
            </CardTitle>
            <CardDescription>
              {analysisType === 'vertical'
                ? 'Análisis Vertical: Participación porcentual de cada cuenta sobre la base (Activos Totales o Ventas).'
                : 'Análisis Horizontal: Evolución y tasa de crecimiento interanual entre períodos.'}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Analysis Mode (Vertical vs Horizontal) */}
            <div className="flex rounded-lg border bg-background p-0.5 text-xs">
              <button
                onClick={() => setAnalysisType('vertical')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  analysisType === 'vertical' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Análisis Vertical (%)
              </button>
              <button
                onClick={() => setAnalysisType('horizontal')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  analysisType === 'horizontal' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Análisis Horizontal
              </button>
            </div>

            {/* Statement View (Balance vs Resultados) */}
            <div className="flex rounded-lg border bg-background p-0.5 text-xs">
              <button
                onClick={() => setStatementView('balance')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                  statementView === 'balance' ? 'bg-secondary text-secondary-foreground font-bold' : 'text-muted-foreground'
                }`}
              >
                Balance General
              </button>
              <button
                onClick={() => setStatementView('income')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                  statementView === 'income' ? 'bg-secondary text-secondary-foreground font-bold' : 'text-muted-foreground'
                }`}
              >
                Estado de Resultados
              </button>
            </div>

            {/* Metric Toggle for Horizontal (Pct vs Abs) */}
            {analysisType === 'horizontal' && (
              <div className="flex rounded-lg border bg-background p-0.5 text-xs">
                <button
                  onClick={() => setHorizontalMetric('percentage')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                    horizontalMetric === 'percentage' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground'
                  }`}
                  title="Variación Porcentual (%)"
                >
                  <Percent className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setHorizontalMetric('absolute')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                    horizontalMetric === 'absolute' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground'
                  }`}
                  title="Variación Absoluta ($)"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Info Badge */}
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3.5 py-2 rounded-lg border">
          <span>
            <strong>Base de Cálculo:</strong> {statementView === 'balance' ? '100% = Activos Totales' : '100% = Ventas Netas'}
          </span>
          <Badge variant="outline" className="font-semibold">
            {analysisType === 'vertical' ? 'Estructura Relativa' : horizontalMetric === 'percentage' ? 'Variación Relativa (%)' : 'Variación Absoluta ($)'}
          </Badge>
        </div>

        {/* Chart Rendering */}
        <div className="h-[420px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {analysisType === 'vertical' ? (
              <BarChart
                data={verticalData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={140}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border bg-background/95 backdrop-blur-md p-3 shadow-lg text-xs space-y-1.5 border-border">
                          <div className="font-bold text-foreground border-b pb-1">{label}</div>
                          <div className="flex items-center justify-between gap-4 text-primary font-semibold">
                            <span>Periodo Actual:</span>
                            <span className="tabular-nums font-bold">{data.actual}% ($ {data.montoActual.toLocaleString('es-ES')})</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-muted-foreground font-semibold">
                            <span>Periodo Anterior:</span>
                            <span className="tabular-nums">{data.anterior}% ($ {data.montoAnterior.toLocaleString('es-ES')})</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t text-[11px] text-muted-foreground">
                            <span>Cambio en Peso (%):</span>
                            <span className={data.actual - data.anterior >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                              {data.actual - data.anterior > 0 ? '+' : ''}{(data.actual - data.anterior).toFixed(2)} pts %
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
                <Bar
                  dataKey="actual"
                  name="Periodo Actual (%)"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                />
                <Bar
                  dataKey="anterior"
                  name="Periodo Anterior (%)"
                  fill="#94a3b8"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                />
              </BarChart>
            ) : (
              <BarChart
                data={horizontalData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis
                  type="number"
                  unit={horizontalMetric === 'percentage' ? '%' : ''}
                  tickFormatter={(val) =>
                    horizontalMetric === 'percentage'
                      ? `${val}%`
                      : `$ ${(val / 1000).toFixed(0)}k`
                  }
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={140}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isPositive = data.variacionPct >= 0;
                      return (
                        <div className="rounded-xl border bg-background/95 backdrop-blur-md p-3 shadow-lg text-xs space-y-1.5 border-border">
                          <div className="font-bold text-foreground border-b pb-1">{label}</div>
                          <div className="flex items-center justify-between gap-4 text-muted-foreground">
                            <span>Periodo Anterior:</span>
                            <span className="tabular-nums font-semibold">$ {data.montoAnterior.toLocaleString('es-ES')}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-foreground">
                            <span>Periodo Actual:</span>
                            <span className="tabular-nums font-bold">$ {data.montoActual.toLocaleString('es-ES')}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t font-bold">
                            <span>Variación Absoluta:</span>
                            <span className={data.variacionAbs >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {data.variacionAbs > 0 ? '+' : ''}$ {data.variacionAbs.toLocaleString('es-ES')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-bold">
                            <span>Tasa de Crecimiento:</span>
                            <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                              {data.variacionPct > 0 ? '+' : ''}{data.variacionPct.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={0} stroke="#64748b" strokeWidth={1.5} />
                <Bar
                  dataKey={horizontalMetric === 'percentage' ? 'variacionPct' : 'variacionAbs'}
                  name={horizontalMetric === 'percentage' ? 'Variación (%)' : 'Variación ($)'}
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                >
                  {horizontalData.map((entry, index) => {
                    const val = horizontalMetric === 'percentage' ? entry.variacionPct : entry.variacionAbs;
                    const isPositive = val >= 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPositive ? '#10b981' : '#f43f5e'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
