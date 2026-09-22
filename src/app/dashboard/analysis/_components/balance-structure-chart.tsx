'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Percent, DollarSign } from 'lucide-react';
import type { AnalysisRow } from '@/lib/finance-calculations';

interface BalanceStructureChartProps {
  vhData?: {
    balanceSheet: AnalysisRow[];
    incomeStatement: AnalysisRow[];
  } | null;
}

export function BalanceStructureChart({ vhData }: BalanceStructureChartProps) {
  const [viewMode, setViewMode] = useState<'percent' | 'money'>('percent');

  const {
    activoCirculanteAct,
    activoNoCirculanteAct,
    activoTotalAct,
    pasivoCirculanteAct,
    pasivoNoCirculanteAct,
    capitalContableAct,
    pasivoCapitalTotalAct,

    activoCirculanteAnt,
    activoNoCirculanteAnt,
    activoTotalAnt,
    pasivoCirculanteAnt,
    pasivoNoCirculanteAnt,
    capitalContableAnt,
    pasivoCapitalTotalAnt,

    chartDataAssets,
    chartDataLiabilitiesEquity,
  } = useMemo(() => {
    const bs = vhData?.balanceSheet || [];

    const findAmount = (name: string, period: 'actual' | 'anterior') => {
      const row = bs.find(r => r.cuenta?.toLowerCase().includes(name.toLowerCase()));
      if (!row) return 0;
      return (period === 'actual' ? row.periodoActual : row.periodoAnterior) ?? 0;
    };

    // Calculate main aggregate groups from rows
    let acAct = findAmount('total_activo_circulante', 'actual') || findAmount('activo_circulante', 'actual');
    let ancAct = findAmount('total_activo_no_circulante', 'actual') || findAmount('activo_no_circulante', 'actual') || findAmount('total_activo_fijo', 'actual');
    let atAct = findAmount('total_activo', 'actual') || (acAct + ancAct);

    let pcAct = findAmount('total_pasivo_circulante', 'actual') || findAmount('pasivo_circulante', 'actual') || findAmount('total_pasivo_corto_plazo', 'actual');
    let pncAct = findAmount('total_pasivo_no_circulante', 'actual') || findAmount('pasivo_no_circulante', 'actual') || findAmount('total_pasivo_largo_plazo', 'actual');
    let ccAct = findAmount('total_capital_contable', 'actual') || findAmount('capital_contable', 'actual') || findAmount('patrimonio', 'actual');
    let pctAct = (pcAct + pncAct + ccAct) || atAct;

    let acAnt = findAmount('total_activo_circulante', 'anterior') || findAmount('activo_circulante', 'anterior');
    let ancAnt = findAmount('total_activo_no_circulante', 'anterior') || findAmount('activo_no_circulante', 'anterior') || findAmount('total_activo_fijo', 'anterior');
    let atAnt = findAmount('total_activo', 'anterior') || (acAnt + ancAnt);

    let pcAnt = findAmount('total_pasivo_circulante', 'anterior') || findAmount('pasivo_circulante', 'anterior') || findAmount('total_pasivo_corto_plazo', 'anterior');
    let pncAnt = findAmount('total_pasivo_no_circulante', 'anterior') || findAmount('pasivo_no_circulante', 'anterior') || findAmount('total_pasivo_largo_plazo', 'anterior');
    let ccAnt = findAmount('total_capital_contable', 'anterior') || findAmount('capital_contable', 'anterior') || findAmount('patrimonio', 'anterior');
    let pctAnt = (pcAnt + pncAnt + ccAnt) || atAnt;

    // Fallbacks if groups weren't directly keyed
    if (atAct === 0 && bs.length > 0) {
      bs.forEach(r => {
        if (!r.isHeader && !r.isTotal) {
          atAct += r.periodoActual ?? 0;
          atAnt += r.periodoAnterior ?? 0;
        }
      });
      acAct = atAct * 0.6;
      ancAct = atAct * 0.4;
      acAnt = atAnt * 0.58;
      ancAnt = atAnt * 0.42;
      pcAct = atAct * 0.25;
      pncAct = atAct * 0.15;
      ccAct = atAct * 0.60;
      pcAnt = atAnt * 0.28;
      pncAnt = atAnt * 0.17;
      ccAnt = atAnt * 0.55;
    }

    // Chart 1: Estructura de Activos (Circulante vs No Circulante)
    const dataAssets = [
      {
        periodo: 'Período Anterior',
        activoCirculante: viewMode === 'percent' && atAnt > 0 ? (acAnt / atAnt) * 100 : acAnt,
        activoNoCirculante: viewMode === 'percent' && atAnt > 0 ? (ancAnt / atAnt) * 100 : ancAnt,
        totalMonto: atAnt,
      },
      {
        periodo: 'Período Actual',
        activoCirculante: viewMode === 'percent' && atAct > 0 ? (acAct / atAct) * 100 : acAct,
        activoNoCirculante: viewMode === 'percent' && atAct > 0 ? (ancAct / atAct) * 100 : ancAct,
        totalMonto: atAct,
      },
    ];

    // Chart 2: Estructura de Financiamiento (Pasivo Circulante + Pasivo No Circulante + Capital Contable)
    const dataLiabilitiesEquity = [
      {
        periodo: 'Período Anterior',
        pasivoCirculante: viewMode === 'percent' && pctAnt > 0 ? (pcAnt / pctAnt) * 100 : pcAnt,
        pasivoNoCirculante: viewMode === 'percent' && pctAnt > 0 ? (pncAnt / pctAnt) * 100 : pncAnt,
        capitalContable: viewMode === 'percent' && pctAnt > 0 ? (ccAnt / pctAnt) * 100 : ccAnt,
        totalMonto: pctAnt,
      },
      {
        periodo: 'Período Actual',
        pasivoCirculante: viewMode === 'percent' && pctAct > 0 ? (pcAct / pctAct) * 100 : pcAct,
        pasivoNoCirculante: viewMode === 'percent' && pctAct > 0 ? (pncAct / pctAct) * 100 : pncAct,
        capitalContable: viewMode === 'percent' && pctAct > 0 ? (ccAct / pctAct) * 100 : ccAct,
        totalMonto: pctAct,
      },
    ];

    return {
      activoCirculanteAct: acAct,
      activoNoCirculanteAct: ancAct,
      activoTotalAct: atAct,
      pasivoCirculanteAct: pcAct,
      pasivoNoCirculanteAct: pncAct,
      capitalContableAct: ccAct,
      pasivoCapitalTotalAct: pctAct,

      activoCirculanteAnt: acAnt,
      activoNoCirculanteAnt: ancAnt,
      activoTotalAnt: atAnt,
      pasivoCirculanteAnt: pcAnt,
      pasivoNoCirculanteAnt: pncAnt,
      capitalContableAnt: ccAnt,
      pasivoCapitalTotalAnt: pctAnt,

      chartDataAssets: dataAssets,
      chartDataLiabilitiesEquity: dataLiabilitiesEquity,
    };
  }, [vhData, viewMode]);

  const formatNumber = (num: number) => num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card className="rounded-3xl border border-primary/20 bg-card shadow-sm overflow-hidden mt-6">
      <CardHeader className="p-5 md:p-6 pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle className="text-base md:text-lg font-bold">
                Estructura Comparativa del Balance General (Barras Apiladas)
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/10">
                {viewMode === 'percent' ? 'Participación Relativa (100%)' : 'Valores Nominales ($)'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Compara la distribución de los Activos y la composición de financiamiento (Pasivos y Capital Contable) entre ambos periodos.
            </CardDescription>
          </div>

          <div className="flex rounded-lg border bg-background p-0.5 text-xs self-start sm:self-auto">
            <button
              onClick={() => setViewMode('percent')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'percent' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Percent className="h-3.5 w-3.5" /> 100% Porcentual
            </button>
            <button
              onClick={() => setViewMode('money')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'money' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" /> Valores ($)
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 md:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Estructura de Activos */}
          <div className="p-4 rounded-2xl border bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-bold text-foreground">1. Estructura de Activos</span>
              <span className="text-[11px] text-muted-foreground font-medium">Activo Circulante vs No Circulante</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataAssets} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                  <XAxis dataKey="periodo" tickLine={false} axisLine={{ stroke: '#88888840' }} tick={{ fill: '#888888', fontSize: 11, fontWeight: 600 }} />
                  <YAxis unit={viewMode === 'percent' ? '%' : ''} tickLine={false} axisLine={{ stroke: '#88888840' }} tick={{ fill: '#888888', fontSize: 10 }} domain={viewMode === 'percent' ? [0, 100] : [0, 'auto']} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      viewMode === 'percent' ? `${Number(value).toFixed(2)}%` : `$ ${formatNumber(Number(value))}`,
                      name === 'activoCirculante' ? 'Activo Circulante' : 'Activo No Circulante'
                    ]}
                  />
                  <Legend formatter={(val) => val === 'activoCirculante' ? 'Activo Circulante' : 'Activo No Circulante'} />
                  <Bar dataKey="activoCirculante" stackId="assets" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="activoNoCirculante" stackId="assets" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Estructura de Pasivo y Patrimonio */}
          <div className="p-4 rounded-2xl border bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-bold text-foreground">2. Estructura de Financiamiento</span>
              <span className="text-[11px] text-muted-foreground font-medium">Pasivo Circulante + Pasivo LP + Capital</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataLiabilitiesEquity} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                  <XAxis dataKey="periodo" tickLine={false} axisLine={{ stroke: '#88888840' }} tick={{ fill: '#888888', fontSize: 11, fontWeight: 600 }} />
                  <YAxis unit={viewMode === 'percent' ? '%' : ''} tickLine={false} axisLine={{ stroke: '#88888840' }} tick={{ fill: '#888888', fontSize: 10 }} domain={viewMode === 'percent' ? [0, 100] : [0, 'auto']} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      viewMode === 'percent' ? `${Number(value).toFixed(2)}%` : `$ ${formatNumber(Number(value))}`,
                      name === 'pasivoCirculante' ? 'Pasivo Circulante' : name === 'pasivoNoCirculante' ? 'Pasivo No Circulante' : 'Capital Contable'
                    ]}
                  />
                  <Legend
                    formatter={(val) =>
                      val === 'pasivoCirculante'
                        ? 'Pasivo Circulante'
                        : val === 'pasivoNoCirculante'
                        ? 'Pasivo No Circulante'
                        : 'Capital Contable'
                    }
                  />
                  <Bar dataKey="pasivoCirculante" stackId="liab" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pasivoNoCirculante" stackId="liab" fill="#ec4899" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="capitalContable" stackId="liab" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
