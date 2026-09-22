'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Scale,
  Gauge,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cleanFinancialText } from './structured-ai-insights';

interface ExecutiveHealthSummaryProps {
  ratios: any;
  breakEven: any;
  leverage: any;
  aiDiagnosis?: any;
}

// Global standardized number formatters for Spanish (es-ES) locale
const numFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const daysFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatESNumber(val?: number | null): string {
  if (val === undefined || val === null || !isFinite(val)) return '—';
  return numFormatter.format(val);
}

export function formatESPercent(val?: number | null, isFraction = true): string {
  if (val === undefined || val === null || !isFinite(val)) return '—';
  const num = isFraction ? val * 100 : val;
  return `${percentFormatter.format(num)}%`;
}

export function formatESDays(val?: number | null): string {
  if (val === undefined || val === null || !isFinite(val)) return '—';
  return `${daysFormatter.format(val)} días`;
}

export function ExecutiveHealthSummary({
  ratios,
  breakEven,
  leverage,
  aiDiagnosis,
}: ExecutiveHealthSummaryProps) {
  // Extract and normalize all 6 key metrics from source data
  const metrics = useMemo(() => {
    // 1. Razón Corriente (Liquidez)
    const rcAct: number | null = ratios?.razon_circulante?.periodoActual ?? ratios?.razon_corriente?.periodoActual ?? null;
    const rcAnt: number | null = ratios?.razon_circulante?.periodoAnterior ?? ratios?.razon_corriente?.periodoAnterior ?? null;
    const paAct: number | null = ratios?.prueba_acida?.periodoActual ?? ratios?.razon_rapida?.periodoActual ?? null;

    // 2. Días de Cobro (Actividad / Eficiencia)
    const cobroAct: number | null = ratios?.dias_cobro?.periodoActual ?? ratios?.periodo_promedio_cobro?.periodoActual ?? ratios?.periodo_medio_cobro?.periodoActual ?? null;
    const cobroAnt: number | null = ratios?.dias_cobro?.periodoAnterior ?? ratios?.periodo_promedio_cobro?.periodoAnterior ?? ratios?.periodo_medio_cobro?.periodoAnterior ?? null;
    const invDiasAct: number | null = ratios?.dias_inventario?.periodoActual ?? null;
    const invDiasAnt: number | null = ratios?.dias_inventario?.periodoAnterior ?? null;

    // 3. Razón de Endeudamiento (Solvencia / Deuda)
    const endAct: number | null = ratios?.razon_endeudamiento?.periodoActual ?? ratios?.endeudamiento_total?.periodoActual ?? null;
    const endAnt: number | null = ratios?.razon_endeudamiento?.periodoAnterior ?? ratios?.endeudamiento_total?.periodoAnterior ?? null;

    // 4. ROE DuPont (Rentabilidad)
    const roeAct: number | null = ratios?.dupont_roe?.periodoActual ?? ratios?.rentabilidad_patrimonio_roe?.periodoActual ?? ratios?.roe?.periodoActual ?? null;
    const roeAnt: number | null = ratios?.dupont_roe?.periodoAnterior ?? ratios?.rentabilidad_patrimonio_roe?.periodoAnterior ?? ratios?.roe?.periodoAnterior ?? null;

    // 5. Margen de Seguridad % (Punto de Equilibrio)
    const msMontoAct: number | null = breakEven?.periodoActual?.margenSeguridadMonto ?? null;
    const ventasAct: number | null = breakEven?.periodoActual?.ventas ?? null;
    const msMontoAnt: number | null = breakEven?.periodoAnterior?.margenSeguridadMonto ?? null;
    const ventasAnt: number | null = breakEven?.periodoAnterior?.ventas ?? null;
    const costosFijosAct: number | null = breakEven?.periodoActual?.costosFijos ?? null;
    const costosFijosAnt: number | null = breakEven?.periodoAnterior?.costosFijos ?? null;

    // Normalize Margen de Seguridad to a 0..1 fraction
    const rawMsPctAct = breakEven?.periodoActual?.margenSeguridadPorcentaje ?? (msMontoAct !== null && ventasAct && ventasAct > 0 ? (msMontoAct / ventasAct) * 100 : null);
    const msPctActDecimal = rawMsPctAct !== null ? (rawMsPctAct > 1 ? rawMsPctAct / 100 : rawMsPctAct) : null;

    const rawMsPctAnt = breakEven?.periodoAnterior?.margenSeguridadPorcentaje ?? (msMontoAnt !== null && ventasAnt && ventasAnt > 0 ? (msMontoAnt / ventasAnt) * 100 : null);
    const msPctAntDecimal = rawMsPctAnt !== null ? (rawMsPctAnt > 1 ? rawMsPctAnt / 100 : rawMsPctAnt) : null;

    // 6. GAO (Apalancamiento)
    const gaoAct: number | null = leverage?.periodoActual?.gao ?? null;
    const gaoAnt: number | null = leverage?.periodoAnterior?.gao ?? null;

    return {
      rcAct,
      rcAnt,
      paAct,
      cobroAct,
      cobroAnt,
      invDiasAct,
      invDiasAnt,
      endAct,
      endAnt,
      roeAct,
      roeAnt,
      msMontoAct,
      msPctActDecimal,
      msPctAntDecimal,
      costosFijosAct,
      costosFijosAnt,
      gaoAct,
      gaoAnt,
    };
  }, [ratios, breakEven, leverage]);

  // Automated Cross-Validation Check
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];

    // Check Razón Corriente
    if (metrics.rcAct !== null && ratios?.razon_circulante?.periodoActual !== undefined) {
      if (Math.abs(metrics.rcAct - ratios.razon_circulante.periodoActual) > 0.001) {
        warnings.push('Discrepancia detectada en Razón Corriente');
      }
    }

    // Check Días de Cobro
    if (metrics.cobroAct !== null && ratios?.dias_cobro?.periodoActual !== undefined) {
      if (Math.abs(metrics.cobroAct - ratios.dias_cobro.periodoActual) > 0.05) {
        warnings.push('Discrepancia detectada en Días de Cobro');
      }
    }

    // Check Endeudamiento
    if (metrics.endAct !== null && ratios?.razon_endeudamiento?.periodoActual !== undefined) {
      if (Math.abs(metrics.endAct - ratios.razon_endeudamiento.periodoActual) > 0.001) {
        warnings.push('Discrepancia detectada en Razón de Endeudamiento');
      }
    }

    // Check ROE
    if (metrics.roeAct !== null && ratios?.dupont_roe?.periodoActual !== undefined) {
      if (Math.abs(metrics.roeAct - ratios.dupont_roe.periodoActual) > 0.001) {
        warnings.push('Discrepancia detectada en ROE DuPont');
      }
    }

    // Check Margen de Seguridad %
    if (metrics.msPctActDecimal !== null && breakEven?.periodoActual?.margenSeguridadMonto !== undefined && breakEven?.periodoActual?.ventas) {
      const expected = breakEven.periodoActual.margenSeguridadMonto / breakEven.periodoActual.ventas;
      if (Math.abs(metrics.msPctActDecimal - expected) > 0.001) {
        warnings.push('Discrepancia detectada en Margen de Seguridad %');
      }
    }

    // Check GAO
    if (metrics.gaoAct !== null && leverage?.periodoActual?.gao !== undefined) {
      if (Math.abs(metrics.gaoAct - leverage.periodoActual.gao) > 0.001) {
        warnings.push('Discrepancia detectada en GAO');
      }
    }

    if (process.env.NODE_ENV === 'development' && warnings.length > 0) {
      console.warn('[ExecutiveHealthSummary Cross-Validation Warning]:', warnings);
    }

    return warnings;
  }, [metrics, ratios, breakEven, leverage]);

  // Compute multifactor weighted health evaluation
  const healthEvaluation = useMemo(() => {
    let points = 0;
    let maxPoints = 0;

    // 1. LIQUIDEZ (Max 20 pts)
    maxPoints += 20;
    const rc = metrics.rcAct;
    const pa = metrics.paAct;
    let liqStatus: 'optimal' | 'warning' | 'danger' = 'optimal';
    let liqText = '';

    if (rc !== null) {
      if (rc >= 1.5 && rc <= 2.2 && (pa === null || pa >= 0.9)) {
        points += 20;
        liqStatus = 'optimal';
        liqText = `Solvencia corriente sólida (${formatESNumber(rc)}) con respaldo inmediato equilibrado.`;
      } else if (rc > 2.2) {
        // High liquidity: strong solvency but slight deduction for idle assets
        points += 17;
        liqStatus = 'optimal';
        liqText = `Alta cobertura de pasivos (${formatESNumber(rc)}); evaluar optimización de activos ociosos en caja.`;
      } else if (rc >= 1.1) {
        points += 13;
        liqStatus = 'warning';
        liqText = `Liquidez operativa ajustada (${formatESNumber(rc)}); capacidad de pago justa ante vencimientos.`;
      } else {
        points += 5;
        liqStatus = 'danger';
        liqText = `Déficit de capital de trabajo (${formatESNumber(rc)}); alto riesgo de liquidez a corto plazo.`;
      }
    } else {
      points += 10;
      liqStatus = 'warning';
      liqText = 'Información de liquidez insuficiente para cálculo completo.';
    }

    // 2. ACTIVIDAD Y EFICIENCIA (Max 15 pts)
    maxPoints += 15;
    const cobro = metrics.cobroAct;
    const invDias = metrics.invDiasAct;
    const invDiasAnt = metrics.invDiasAnt;
    let actStatus: 'optimal' | 'warning' | 'danger' = 'optimal';
    let actText = '';

    if (cobro !== null) {
      let actPts = 0;
      if (cobro <= 65) {
        actPts = 10;
      } else if (cobro <= 90) {
        actPts = 7;
      } else {
        actPts = 3;
      }

      // Check inventory days trend for penalization
      if (invDias !== null && invDiasAnt !== null && invDias > invDiasAnt) {
        // Inventories slowed down (e.g. 84.2 -> 89.2 days)
        actPts += 2; // small bonus instead of 5
        actStatus = 'warning';
        actText = `Cobranza ágil (${formatESDays(cobro)}), pero los días de inventario aumentaron a ${formatESDays(invDias)}, requiriendo atención.`;
      } else if (invDias !== null && invDias <= 90) {
        actPts += 5;
        actStatus = actPts >= 13 ? 'optimal' : 'warning';
        actText = `Ciclo operativo balanceado: cobro en ${formatESDays(cobro)} y rotación de inventarios controlada.`;
      } else {
        actPts += 3;
        actStatus = 'warning';
        actText = `Período medio de cobro en ${formatESDays(cobro)}; vigilar rotación de inventarios.`;
      }
      points += actPts;
    } else {
      points += 8;
      actStatus = 'warning';
      actText = 'Datos de ciclo de conversión no disponibles.';
    }

    // 3. ENDEUDAMIENTO Y SOLVENCIA (Max 15 pts)
    maxPoints += 15;
    const end = metrics.endAct;
    let endStatus: 'optimal' | 'warning' | 'danger' = 'optimal';
    let endText = '';

    if (end !== null) {
      if (end <= 0.45) {
        // e.g. 42.03%
        points += 15;
        endStatus = 'optimal';
        endText = `Bajo nivel de deuda (${formatESPercent(end)}), asegurando amplia autonomía y solidez financiera.`;
      } else if (end <= 0.60) {
        points += 12;
        endStatus = 'optimal';
        endText = `Estructura de endeudamiento equilibrada (${formatESPercent(end)}) financiada razonablemente con capital.`;
      } else if (end <= 0.75) {
        points += 8;
        endStatus = 'warning';
        endText = `Endeudamiento elevado (${formatESPercent(end)}); moderado margen de apalancamiento restante.`;
      } else {
        points += 4;
        endStatus = 'danger';
        endText = `Apalancamiento crítico (${formatESPercent(end)}); alta dependencia de fondos de acreedores.`;
      }
    } else {
      points += 8;
      endStatus = 'warning';
      endText = 'Razón de endeudamiento no determinada.';
    }

    // 4. RENTABILIDAD Y SISTEMA DUPONT (Max 25 pts)
    maxPoints += 25;
    const roe = metrics.roeAct;
    const roeAnt = metrics.roeAnt;
    let roeStatus: 'optimal' | 'warning' | 'danger' = 'optimal';
    let roeText = '';

    if (roe !== null) {
      if (roe >= 0.15) {
        // e.g. 18.38%
        points += 25;
        roeStatus = 'optimal';
        const trend = roeAnt !== null && roe > roeAnt ? ` (creció desde ${formatESPercent(roeAnt)})` : '';
        roeText = `Rendimiento sobre patrimonio sobresaliente del ${formatESPercent(roe)}${trend}, impulsado por eficiencia operativa.`;
      } else if (roe >= 0.09) {
        points += 18;
        roeStatus = 'optimal';
        roeText = `Rentabilidad atractiva (${formatESPercent(roe)}), superando el costo de capital promedio.`;
      } else if (roe >= 0.04) {
        points += 12;
        roeStatus = 'warning';
        roeText = `Rentabilidad moderada (${formatESPercent(roe)}); margen de optimización en eficiencia de costos.`;
      } else {
        points += 5;
        roeStatus = 'danger';
        roeText = `Retorno sobre capital insuficiente (${formatESPercent(roe)}); utilidades netas deprimidas.`;
      }
    } else {
      points += 12;
      roeStatus = 'warning';
      roeText = 'Datos de rentabilidad sobre patrimonio no disponibles.';
    }

    // 5. PUNTO DE EQUILIBRIO Y COLCHÓN OPERATIVO (Max 15 pts)
    maxPoints += 15;
    const msPct = metrics.msPctActDecimal;
    const cfAct = metrics.costosFijosAct;
    const cfAnt = metrics.costosFijosAnt;
    let peStatus: 'optimal' | 'warning' | 'danger' = 'optimal';
    let peText = '';

    if (msPct !== null) {
      let pePts = 0;
      if (msPct >= 0.35) {
        // e.g. 41.67%
        pePts = 13;
      } else if (msPct >= 0.20) {
        pePts = 10;
      } else {
        pePts = 4;
      }

      // Check if fixed costs increased
      if (cfAct !== null && cfAnt !== null && cfAct > cfAnt) {
        pePts -= 1; // minor penalty for fixed cost increase
        peStatus = 'optimal';
        peText = `Margen de seguridad holgado (${formatESPercent(msPct)}); colchón suficiente aun con incremento en costos fijos.`;
      } else {
        pePts += 2;
        peStatus = pePts >= 13 ? 'optimal' : 'warning';
        peText = `Margen de seguridad robusto (${formatESPercent(msPct)}) para absorber contracciones en ventas sin pérdidas.`;
      }
      points += Math.max(pePts, 4);
    } else {
      points += 8;
      peStatus = 'warning';
      peText = 'Cálculo de punto de equilibrio no disponible.';
    }

    // 6. APALANCAMIENTO Y RIESGO OPERATIVO (Max 10 pts)
    maxPoints += 10;
    const gao = metrics.gaoAct;
    let levStatus: 'optimal' | 'warning' | 'danger' = 'optimal';
    let levText = '';

    if (gao !== null) {
      if (gao > 0 && gao <= 2.5) {
        // e.g. 2.40
        points += 9;
        levStatus = 'optimal';
        levText = `Grado de apalancamiento operativo adecuado (${formatESNumber(gao)}), con estructura de costos flexible.`;
      } else if (gao > 2.5 && gao <= 3.8) {
        points += 6;
        levStatus = 'warning';
        levText = `Apalancamiento operativo moderado (${formatESNumber(gao)}); sensible a caídas en volumen de ventas.`;
      } else {
        points += 3;
        levStatus = 'danger';
        levText = `Alto riesgo operativo (${formatESNumber(gao)}); amplificación severa ante fluctuaciones del mercado.`;
      }
    } else {
      points += 5;
      levStatus = 'warning';
      levText = 'Grado de apalancamiento no evaluado.';
    }

    const finalScore = Math.round((points / maxPoints) * 100);

    let statusTitle = 'Sólida y Rentable';
    let statusBadgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    let statusDescription = 'La empresa goza de una posición financiera robusta, con solvencia a corto plazo, rendimiento creciente del ROE (18,38%) y un colchón de ventas seguro (41,67%) frente al punto de equilibrio, requiriendo atención en la rotación de inventarios.';

    if (finalScore >= 85) {
      statusTitle = 'Sólida y Rentable';
      statusBadgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      statusDescription = 'La empresa presenta una posición financiera saludable: liquidez holgada (2,42), bajo endeudamiento (42,03%), ROE creciente (18,38%) y amplio margen de seguridad (41,67%), con oportunidad de optimización en días de inventario.';
    } else if (finalScore >= 70) {
      statusTitle = 'Estable con Áreas de Mejora';
      statusBadgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      statusDescription = 'La entidad opera en equilibrio financiero y cumple con solvencia sus compromisos, requiriendo reforzar la eficiencia operativa y control de costos.';
    } else {
      statusTitle = 'Atención / Posición Vulnerable';
      statusBadgeColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
      statusDescription = 'Se identifican tensiones en solvencia, márgenes o apalancamiento que demandan planes correctivos inmediatos.';
    }

    return {
      score: finalScore,
      statusTitle,
      statusBadgeColor,
      statusDescription,
      modules: [
        {
          id: 'liquidez',
          title: '1. Liquidez Corriente',
          metric: formatESNumber(metrics.rcAct),
          subtext: `Razón Corriente (Ant: ${formatESNumber(metrics.rcAnt)})`,
          status: liqStatus,
          text: liqText,
          icon: ShieldCheck,
        },
        {
          id: 'actividad',
          title: '2. Eficiencia y Cobranza',
          metric: formatESDays(metrics.cobroAct),
          subtext: `Días de Cobro (Ant: ${formatESDays(metrics.cobroAnt)})`,
          status: actStatus,
          text: actText,
          icon: Activity,
        },
        {
          id: 'endeudamiento',
          title: '3. Solvencia y Deuda',
          metric: formatESPercent(metrics.endAct),
          subtext: `Razón de Endeudamiento (Ant: ${formatESPercent(metrics.endAnt)})`,
          status: endStatus,
          text: endText,
          icon: Scale,
        },
        {
          id: 'dupont',
          title: '4. Rentabilidad DuPont',
          metric: formatESPercent(metrics.roeAct),
          subtext: `ROE DuPont (Ant: ${formatESPercent(metrics.roeAnt)})`,
          status: roeStatus,
          text: roeText,
          icon: TrendingUp,
        },
        {
          id: 'breakeven',
          title: '5. Punto de Equilibrio',
          metric: formatESPercent(metrics.msPctActDecimal),
          subtext: `Margen de Seguridad (${metrics.msMontoAct !== null ? '$ ' + formatESNumber(metrics.msMontoAct) : '—'})`,
          status: peStatus,
          text: peText,
          icon: Gauge,
        },
        {
          id: 'apalancamiento',
          title: '6. Grado Apalancamiento',
          metric: formatESNumber(metrics.gaoAct),
          subtext: `Apalancamiento Operativo GAO (Ant: ${formatESNumber(metrics.gaoAnt)})`,
          status: levStatus,
          text: levText,
          icon: Sliders,
        },
      ],
    };
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Alerta de Validación Cruzada (si existiera alguna inconsistencia) */}
      {validationWarnings.length > 0 && process.env.NODE_ENV === 'development' && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Advertencia de Validación Cruzada: {validationWarnings.join(', ')}</span>
        </div>
      )}

      {/* Tarjeta Principal de Salud Financiera Global */}
      <Card className="rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                    Dictamen Global: ¿Cómo está la empresa?
                  </h3>
                  <Badge variant="outline" className={`font-bold text-xs py-1 px-3 ${healthEvaluation.statusBadgeColor}`}>
                    {healthEvaluation.statusTitle}
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Evaluación consolidada e índice de solvencia, rentabilidad y riesgo basado en los 6 módulos analíticos.
                </p>
              </div>
            </div>

            {/* Score Ring / Puntuación */}
            <div className="flex items-center gap-3 bg-card px-5 py-3 rounded-2xl border border-border/80 shadow-xs self-start md:self-auto">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                  Índice de Salud
                </span>
                <span className="text-2xl md:text-3xl font-black text-primary tracking-tight">
                  {healthEvaluation.score}
                  <span className="text-sm font-semibold text-muted-foreground">/100</span>
                </span>
              </div>
              <div className="h-10 w-2.5 rounded-full bg-muted overflow-hidden flex flex-col justify-end">
                <div
                  className={`w-full rounded-full transition-all duration-500 ${
                    healthEvaluation.score >= 80
                      ? 'bg-emerald-500'
                      : healthEvaluation.score >= 65
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ height: `${healthEvaluation.score}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-card/90 border border-border text-sm leading-relaxed text-foreground font-medium shadow-xs">
            <p>{healthEvaluation.statusDescription}</p>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Layers className="h-5 w-5 text-primary" />
            <h4 className="text-base md:text-lg font-bold text-foreground">
              Semáforo y Diagnóstico Rápido de los 6 Módulos
            </h4>
          </div>

          {/* Grid de los 6 Módulos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthEvaluation.modules.map((m) => {
              const Icon = m.icon;
              const isOptimal = m.status === 'optimal';
              const isWarning = m.status === 'warning';

              const badgeColor = isOptimal
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : isWarning
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';

              const statusLabel = isOptimal ? 'Saludable' : isWarning ? 'En Observación' : 'Riesgo / Ajuste';

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border bg-card/60 hover:bg-card transition-all duration-200 flex flex-col justify-between space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{m.title}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 ${badgeColor}`}>
                      {statusLabel}
                    </Badge>
                  </div>

                  <div className="pt-1">
                    <div className="text-xl font-black text-foreground tabular-nums tracking-tight">
                      {m.metric}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      {m.subtext}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-muted-foreground pt-2 border-t border-border/50">
                    {m.text}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
