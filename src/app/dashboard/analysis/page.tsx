'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateFinancialReport, type GenerateFinancialReportOutput } from '@/ai/flows/generate-financial-report';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  BrainCircuit,
  FileText,
  Scale,
  Zap,
  TrendingUp,
  BarChart,
  Landmark,
  ArrowRightLeft,
  Banknote,
  Percent,
  Sliders,
  Gauge,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Package,
  Calculator,
  Sparkles,
  Info,
  Download,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import Link from 'next/link';
import { RatioCard } from './_components/ratio-card';
import { ReportDisplay } from './_components/report-display';
import { StructuredAIInsights, GlobalSummaryDisplay } from './_components/structured-ai-insights';
import { DupontWaterfallChart } from './_components/dupont-waterfall-chart';
import { BalanceStructureChart } from './_components/balance-structure-chart';
import { BreakEvenChart } from './_components/break-even-chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToWord, exportToPDF } from '@/lib/financial-export-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getFinancialData, updateReportWithAnalysis } from '@/lib/firebase/firestore';
import {
  calculateAllRatios,
  calculateVerticalAndHorizontalAnalysis,
  calculateBreakEven,
  calculateLeverage,
  calculateEAF,
  calculateEFE,
  auditFinancialModel,
  type AnalysisRow,
  type FinancialAuditReport,
} from '@/lib/finance-calculations';
import { AlertTriangle, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

type FullAnalysisResult = GenerateFinancialReportOutput & {
  ratios: any;
  verticalHorizontal: any;
  breakEven: any;
  leverage: any;
  eaf: any;
  efe: any;
  financialData?: { balanceSheet: any[]; incomeStatement: any[] };
  auditReport?: FinancialAuditReport;
};

// Static helper functions & dictionary moved outside component to prevent render reallocations
const formatNumber = (value?: number | null) => {
  if (value === undefined || value === null || !isFinite(value)) return '-';
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (value?: number | null, showSign = false) => {
  if (value === undefined || value === null || !isFinite(value)) return '-';
  const prefix = showSign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
};

const formatEAFNumber = (value?: number | null) => {
  if (value === undefined || value === null || !isFinite(value) || value === 0) return '-';
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatRatio = (value?: number | null, type: 'decimal' | 'percentage' | 'days' | 'currency' = 'decimal') => {
  if (value === undefined || value === null || !isFinite(value)) return '-';
  if (type === 'percentage') return `${(value * 100).toFixed(2)}%`;
  if (type === 'days') return `${value.toFixed(1)} días`;
  if (type === 'currency') return `$ ${formatNumber(value)}`;
  return value.toFixed(2);
};

const formatUnits = (value?: number | null) => {
  if (value === undefined || value === null || !isFinite(value)) return '-';
  return `${Math.round(value).toLocaleString('es-ES')} u`;
};

const getHeatmapBadgeClass = (value?: number | null) => {
  if (value === undefined || value === null || !isFinite(value)) return 'text-muted-foreground';
  if (value > 50) return 'bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 shadow-xs font-bold';
  if (value > 20) return 'bg-emerald-500/18 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold';
  if (value > 0) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold';
  if (value < -50) return 'bg-rose-500/25 text-rose-800 dark:text-rose-300 border-rose-500/40 shadow-xs font-bold';
  if (value < -20) return 'bg-rose-500/18 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold';
  if (value < 0) return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-semibold';
  return 'bg-muted/40 text-muted-foreground border-border/50 font-medium';
};

const ACCOUNT_LABELS: Record<string, string> = {
  // Activo Circulante
  efectivo: 'Efectivo y equivalentes de efectivo',
  efectivo_y_equivalentes: 'Efectivo y equivalentes de efectivo',
  efectivo_y_equivalentes_de_efectivo: 'Efectivo y equivalentes de efectivo',
  caja_y_bancos: 'Caja y bancos',
  caja: 'Caja',
  bancos: 'Bancos',
  cuentas_por_cobrar: 'Cuentas por cobrar comerciales',
  cuentas_por_cobrar_comerciales: 'Cuentas por cobrar comerciales',
  clientes: 'Cuentas por cobrar comerciales',
  estimacion_cuentas_incobrables: 'Estimación para cuentas incobrables',
  estimacion_para_cuentas_incobrables: 'Estimación para cuentas incobrables',
  estimacion_de_cuentas_incobrables: 'Estimación para cuentas incobrables',
  provision_cuentas_incobrables: 'Estimación para cuentas incobrables',
  inventarios: 'Inventarios',
  inventario: 'Inventarios',
  pagos_anticipados: 'Pagos anticipados',
  gastos_pagados_por_anticipado: 'Pagos anticipados',
  total_activo_circulante: 'Total activo circulante',
  total_activo_corriente: 'Total activo circulante',

  // Activo No Circulante
  terrenos: 'Terrenos',
  terreno: 'Terrenos',
  edificios_y_equipos: 'Edificios y equipos (neto)',
  edificios_y_equipos_neto: 'Edificios y equipos (neto)',
  propiedad_planta_y_equipo: 'Propiedad, planta y equipo (neto)',
  propiedad_planta_y_equipo_neto: 'Propiedad, planta y equipo (neto)',
  depreciacion_acumulada: 'Depreciación acumulada',
  total_activo_no_circulante: 'Total activo no circulante',
  total_activo_no_corriente: 'Total activo no circulante',
  total_activo_fijo: 'Total activo no circulante',
  total_activo: 'TOTAL ACTIVO',
  total_activos: 'TOTAL ACTIVO',
  activo_total: 'TOTAL ACTIVO',

  // Pasivo Circulante
  cuentas_por_pagar: 'Cuentas por pagar comerciales',
  cuentas_por_pagar_comerciales: 'Cuentas por pagar comerciales',
  proveedores: 'Cuentas por pagar comerciales',
  documentos_por_pagar: 'Documentos por pagar a corto plazo',
  documentos_por_pagar_a_corto_plazo: 'Documentos por pagar a corto plazo',
  impuestos_por_pagar: 'Impuestos por pagar',
  impuesto_por_pagar: 'Impuestos por pagar',
  gastos_acumulados_por_pagar: 'Gastos acumulados por pagar',
  total_pasivo_circulante: 'Total pasivo circulante',
  total_pasivo_corriente: 'Total pasivo circulante',

  // Pasivo No Circulante
  prestamos_bancarios_a_largo_plazo: 'Préstamos bancarios a largo plazo',
  deuda_a_largo_plazo: 'Préstamos bancarios a largo plazo',
  pasivos_a_largo_plazo: 'Préstamos bancarios a largo plazo',
  documentos_por_pagar_a_largo_plazo: 'Documentos por pagar a largo plazo',
  total_pasivo_no_circulante: 'Total pasivo no circulante',
  total_pasivo_no_corriente: 'Total pasivo no circulante',
  total_pasivo_fijo: 'Total pasivo no circulante',
  total_pasivo: 'TOTAL PASIVO',
  total_pasivos: 'TOTAL PASIVO',
  pasivo_total: 'TOTAL PASIVO',

  // Capital Contable
  capital_social: 'Capital social',
  utilidades_retenidas: 'Utilidades retenidas',
  utilidades_acumuladas: 'Utilidades retenidas',
  resultado_del_ejercicio: 'Resultado del ejercicio',
  total_capital_contable: 'TOTAL CAPITAL CONTABLE',
  total_patrimonio: 'TOTAL CAPITAL CONTABLE',
  total_pasivo_y_capital: 'TOTAL PASIVO Y CAPITAL',
  total_pasivo_y_patrimonio: 'TOTAL PASIVO Y CAPITAL',

  // Estado de Resultados
  ventas: 'Ventas netas',
  ventas_netas: 'Ventas netas',
  ingresos_por_ventas: 'Ventas netas',
  ingresos_operacionales: 'Ventas netas',
  costo_de_ventas: 'Costo de ventas',
  costo_ventas: 'Costo de ventas',
  utilidad_bruta: 'UTILIDAD BRUTA',
  margen_bruto: 'UTILIDAD BRUTA',
  gastos_de_venta: 'Gastos de venta',
  gastos_de_administracion: 'Gastos de administración',
  gastos_operativos: 'Gastos de operación',
  depreciacion_y_amortizacion: 'Depreciación y amortización',
  depreciacion: 'Depreciación y amortización',
  utilidad_operativa: 'UTILIDAD OPERATIVA',
  utilidad_de_operacion: 'UTILIDAD OPERATIVA',
  ebit: 'UTILIDAD OPERATIVA',
  gastos_financieros: 'Gastos financieros',
  intereses: 'Gastos financieros',
  utilidad_antes_de_impuestos: 'UTILIDAD ANTES DE IMPUESTOS',
  utilidad_antes_impuestos: 'UTILIDAD ANTES DE IMPUESTOS',
  ebt: 'UTILIDAD ANTES DE IMPUESTOS',
  impuesto_sobre_la_renta: 'Impuesto sobre la renta',
  impuestos: 'Impuesto sobre la renta',
  utilidad_neta: 'UTILIDAD NETA',
  resultado_neto: 'UTILIDAD NETA',
};

const LOWER_WORDS = new Set(['y', 'e', 'o', 'u', 'de', 'del', 'a', 'al', 'en', 'por', 'con', 'para', 'sobre', 'sin', 'la', 'las', 'el', 'los']);

function AnalysisCore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unit Break-Even state (Precio de Venta Unitario)
  const [unitPriceActual, setUnitPriceActual] = useState<string>('');
  const [unitPriceAnterior, setUnitPriceAnterior] = useState<string>('');
  const [breakEvenViewMode, setBreakEvenViewMode] = useState<'money' | 'units' | 'both'>('money');
  const [showAuditDetails, setShowAuditDetails] = useState(false);

  // Determine whether a valid unit price is configured
  const hasUnitPrice = useMemo(() => {
    if (!unitPriceActual) return false;
    const val = parseFloat(unitPriceActual.replace(',', '.'));
    return !isNaN(val) && isFinite(val) && val > 0;
  }, [unitPriceActual]);

  // Fallback to 'money' view mode if unit price is not configured
  useEffect(() => {
    if (!hasUnitPrice && breakEvenViewMode !== 'money') {
      setBreakEvenViewMode('money');
    }
  }, [hasUnitPrice, breakEvenViewMode]);

  const reportId = searchParams.get('reportId');

  const handleRegenerateAI = async () => {
    if (!user || !reportId) return;
    try {
      setRegenerating(true);
      const financialDataFromDb = await getFinancialData(user.uid, reportId);
      if (!financialDataFromDb) throw new Error('No se encontraron datos');

      const financialData = {
        balanceSheet: financialDataFromDb.balanceSheet,
        incomeStatement: financialDataFromDb.incomeStatement,
      };

      const ratios = calculateAllRatios(financialData);
      const verticalHorizontal = calculateVerticalAndHorizontalAnalysis(financialData);
      const breakEven = calculateBreakEven(financialData);
      const leverage = calculateLeverage(financialData);
      const eaf = calculateEAF(financialData.balanceSheet, financialData.incomeStatement);
      const efe = calculateEFE(financialData.balanceSheet, financialData.incomeStatement);
      const auditReport = auditFinancialModel(financialData);

      const aiInput = {
        financialData,
        ratios,
        breakEven,
        leverage,
        eaf,
        efe,
      };

      const result = await generateFinancialReport(aiInput);

      const fullResult: FullAnalysisResult = {
        analysis: result.analysis,
        ratios,
        verticalHorizontal,
        breakEven,
        leverage,
        eaf,
        efe,
        financialData,
        auditReport,
      };

      await updateReportWithAnalysis(user.uid, reportId, fullResult);
      setAnalysisResult(fullResult);
      toast({
        title: 'Análisis IA actualizado',
        description: 'El análisis narrativo ha sido recalculado con los datos y razones financieras actuales.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: e.message || 'No se pudo actualizar el análisis de IA.',
      });
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || !reportId) {
      toast({
        variant: 'destructive',
        title: 'Error de Carga',
        description: 'No se encontró un reporte o usuario válido. Serás redirigido.',
      });
      setTimeout(() => router.replace('/dashboard'), 3000);
      return;
    }

    const runAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        const financialDataFromDb = await getFinancialData(user.uid, reportId);
        if (!financialDataFromDb) {
          throw new Error('No se pudieron cargar los datos financieros desde la base de datos.');
        }

        const financialData = {
          balanceSheet: financialDataFromDb.balanceSheet,
          incomeStatement: financialDataFromDb.incomeStatement,
        };

        // Calculate all analytical modules client-side
        const ratios = calculateAllRatios(financialData);
        const verticalHorizontal = calculateVerticalAndHorizontalAnalysis(financialData);
        const breakEven = calculateBreakEven(financialData);
        const leverage = calculateLeverage(financialData);
        const eaf = calculateEAF(financialData.balanceSheet, financialData.incomeStatement);
        const efe = calculateEFE(financialData.balanceSheet, financialData.incomeStatement);
        const auditReport = auditFinancialModel(financialData);

        const isStaleMissing = financialDataFromDb.analysis && (
          (financialDataFromDb.analysis.activity?.includes('No disponible') && ratios.rotacion_inventarios?.periodoActual !== null) ||
          (financialDataFromDb.analysis.liquidity?.includes('No disponible') && ratios.razon_circulante?.periodoActual !== null) ||
          (financialDataFromDb.analysis.dupont?.includes('No disponible') && ratios.dupont_roe?.periodoActual !== null) ||
          (financialDataFromDb.analysis.breakEven?.includes('No disponible') && breakEven?.periodoActual?.puntoEquilibrioVentas !== null) ||
          (financialDataFromDb.analysis.leverage?.includes('No disponible') && leverage?.periodoActual?.gao !== null)
        );

        if (financialDataFromDb.analysis && !isStaleMissing) {
          setAnalysisResult({
            analysis: financialDataFromDb.analysis,
            ratios,
            verticalHorizontal,
            breakEven,
            leverage,
            eaf: financialDataFromDb.eaf || eaf,
            efe: financialDataFromDb.efe || efe,
            financialData,
            auditReport,
          });
        } else {
          const aiInput = {
            financialData,
            ratios,
            breakEven,
            leverage,
            eaf,
            efe,
          };

          const result = await generateFinancialReport(aiInput);

          const fullResult: FullAnalysisResult = {
            analysis: result.analysis,
            ratios,
            verticalHorizontal,
            breakEven,
            leverage,
            eaf,
            efe,
            financialData,
            auditReport,
          };

          await updateReportWithAnalysis(user.uid, reportId, fullResult);
          setAnalysisResult(fullResult);
        }
        // Auto-detect unit price if present in income statement accounts
        const findPriceInAccounts = (accounts: any[]) => {
          if (!accounts || !Array.isArray(accounts)) return null;
          const found = accounts.find((acc: any) => {
            const name = (acc.accountName || acc.name || '').toLowerCase();
            return name.includes('precio unitario') || name.includes('precio de venta') || name.includes('precio venta') || name.includes('pvu');
          });
          if (found) {
            return {
              actual: found.periodoActual ? String(found.periodoActual) : '',
              anterior: found.periodoAnterior ? String(found.periodoAnterior) : '',
            };
          }
          return null;
        };

        const detectedPrice = findPriceInAccounts(financialDataFromDb.incomeStatement);
        if (detectedPrice) {
          if (detectedPrice.actual) setUnitPriceActual(detectedPrice.actual);
          if (detectedPrice.anterior) setUnitPriceAnterior(detectedPrice.anterior);
        }
      } catch (e: any) {
        console.error('Error al generar el reporte:', e);
        setError('Hubo un error al generar el análisis de IA. Por favor, intenta de nuevo. ' + (e.message || ''));
        toast({
          variant: 'destructive',
          title: 'Análisis Fallido',
          description: 'No se pudo generar el reporte. ' + (e.message || ''),
        });
      } finally {
        setLoading(false);
      }
    };

    runAnalysis();
  }, [reportId, user, authLoading, router, toast]);

  const formatAccountName = useCallback((name: string) => {
    if (!name) return '';
    const cleanKey = name.toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (ACCOUNT_LABELS[cleanKey]) {
      return ACCOUNT_LABELS[cleanKey];
    }
    if (name === name.toUpperCase() && name.length > 4) {
      return name;
    }
    const parts = name.replace(/_/g, ' ').split(' ');
    return parts
      .map((w, idx) => {
        const lower = w.toLowerCase();
        if (idx > 0 && LOWER_WORDS.has(lower)) {
          return lower;
        }
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }, []);

  const { liquidityRatios, activityRatios, debtRatios, profitabilityRatios, dupontRatios } = useMemo(() => {
    if (!analysisResult?.ratios) {
      return { liquidityRatios: [], activityRatios: [], debtRatios: [], profitabilityRatios: [], dupontRatios: [] };
    }

    const ratios = analysisResult.ratios;

    return {
      liquidityRatios: [
        {
          title: 'Razón Corriente',
          valueActual: formatRatio(ratios.razon_circulante?.periodoActual),
          valueAnterior: formatRatio(ratios.razon_circulante?.periodoAnterior),
          description: 'Activo Circulante / Pasivo Circulante. Mide la capacidad de la empresa para hacer frente a sus obligaciones a corto plazo.',
        },
        {
          title: 'Prueba Ácida',
          valueActual: formatRatio(ratios.razon_rapida?.periodoActual),
          valueAnterior: formatRatio(ratios.razon_rapida?.periodoAnterior),
          description: '(Activo Circulante - Inventarios) / Pasivo Circulante. Mide la liquidez inmediata sin depender de la venta de inventarios.',
        },
        {
          title: 'Capital de Trabajo Neto',
          valueActual: `$ ${formatNumber(ratios.capital_de_trabajo_neto?.periodoActual)}`,
          valueAnterior: `$ ${formatNumber(ratios.capital_de_trabajo_neto?.periodoAnterior)}`,
          description: 'Activo Circulante - Pasivo Circulante. Recursos disponibles tras cubrir los pasivos a corto plazo.',
        },
      ],
      debtRatios: [
        {
          title: 'Razón de Endeudamiento',
          valueActual: formatRatio(ratios.razon_endeudamiento?.periodoActual, 'percentage'),
          valueAnterior: formatRatio(ratios.razon_endeudamiento?.periodoAnterior, 'percentage'),
          description: 'Pasivo Total / Activo Total. Mide el grado en que la empresa está financiada mediante deudas.',
        },
        {
          title: 'Estructura de Capital (Deuda a Capital)',
          valueActual: formatRatio(ratios.razon_pasivo_capital?.periodoActual),
          valueAnterior: formatRatio(ratios.razon_pasivo_capital?.periodoAnterior),
          description: 'Pasivo Total / Capital Contable. Mide la relación entre el financiamiento con deuda y los recursos propios.',
        },
        {
          title: 'Cobertura de Intereses',
          valueActual: formatRatio(ratios.cobertura_intereses?.periodoActual),
          valueAnterior: formatRatio(ratios.cobertura_intereses?.periodoAnterior),
          description: 'Utilidad de Operación / Gastos Financieros. Capacidad para cubrir los gastos financieros con la utilidad operativa.',
        },
      ],
      activityRatios: [
        {
          title: 'Rotación de Inventarios',
          valueActual: formatRatio(ratios.rotacion_inventarios?.periodoActual),
          valueAnterior: formatRatio(ratios.rotacion_inventarios?.periodoAnterior),
          description: 'Costo de Ventas / Inventarios. Veces que el inventario se vende y repone en el año.',
        },
        {
          title: 'Días de Inventario',
          valueActual: formatRatio(ratios.dias_inventario?.periodoActual, 'days'),
          valueAnterior: formatRatio(ratios.dias_inventario?.periodoAnterior, 'days'),
          description: '365 / Rotación de Inventarios. Días promedio que permanece el inventario en la empresa.',
        },
        {
          title: 'Rotación de Cuentas por Cobrar',
          valueActual: formatRatio(ratios.rotacion_cuentas_por_cobrar?.periodoActual),
          valueAnterior: formatRatio(ratios.rotacion_cuentas_por_cobrar?.periodoAnterior),
          description: 'Ventas Netas / Cuentas por Cobrar Comerciales. Veces que las cuentas por cobrar se convierten en efectivo.',
        },
        {
          title: 'Días de Cobro',
          valueActual: formatRatio(ratios.dias_cobro?.periodoActual ?? ratios.periodo_promedio_cobro?.periodoActual, 'days'),
          valueAnterior: formatRatio(ratios.dias_cobro?.periodoAnterior ?? ratios.periodo_promedio_cobro?.periodoAnterior, 'days'),
          description: '365 / Rotación de Cuentas por Cobrar. Días promedio que tarda la empresa en cobrar a sus clientes.',
        },
        {
          title: 'Rotación de Activos Totales',
          valueActual: formatRatio(ratios.rotacion_activos_totales?.periodoActual),
          valueAnterior: formatRatio(ratios.rotacion_activos_totales?.periodoAnterior),
          description: 'Ventas Netas / Activos Totales. Eficiencia con la que los activos generan ingresos por ventas.',
        },
      ],
      profitabilityRatios: [
        {
          title: 'Margen Bruto',
          valueActual: formatRatio(ratios.margen_utilidad_bruta?.periodoActual, 'percentage'),
          valueAnterior: formatRatio(ratios.margen_utilidad_bruta?.periodoAnterior, 'percentage'),
          description: 'Utilidad Bruta / Ventas Netas. Porcentaje de utilidad tras deducir el costo de ventas.',
        },
        {
          title: 'Margen Operativo',
          valueActual: formatRatio(ratios.margen_utilidad_operativa?.periodoActual, 'percentage'),
          valueAnterior: formatRatio(ratios.margen_utilidad_operativa?.periodoAnterior, 'percentage'),
          description: 'Utilidad de Operación / Ventas Netas. Rendimiento operativo generado por las ventas.',
        },
        {
          title: 'Margen Neto',
          valueActual: formatRatio(ratios.margen_utilidad_neta?.periodoActual, 'percentage'),
          valueAnterior: formatRatio(ratios.margen_utilidad_neta?.periodoAnterior, 'percentage'),
          description: 'Utilidad Neta / Ventas Netas. Ganancia neta final generada por cada unidad de venta.',
        },
        {
          title: 'ROA (Rendimiento sobre los Activos)',
          valueActual: formatRatio(ratios.rentabilidad_activo_roa?.periodoActual, 'percentage'),
          valueAnterior: formatRatio(ratios.rentabilidad_activo_roa?.periodoAnterior, 'percentage'),
          description: 'Utilidad Neta / Activos Totales. Capacidad de los activos totales para generar utilidades netas.',
        },
        {
          title: 'ROE (Rendimiento sobre el Capital)',
          valueActual: formatRatio(ratios.rentabilidad_patrimonio_roe?.periodoActual, 'percentage'),
          valueAnterior: formatRatio(ratios.rentabilidad_patrimonio_roe?.periodoAnterior, 'percentage'),
          description: 'Utilidad Neta / Capital Contable. Rendimiento que obtienen los accionistas sobre su capital invertido.',
        },
      ],
      dupontRatios: [
        {
          title: '1. Margen Neto (Rentabilidad)',
          valueActual: formatRatio(ratios.dupont_margen_neta?.periodoActual, 'percentage'),
          valueAnterior: formatRatio(ratios.dupont_margen_neta?.periodoAnterior, 'percentage'),
          description: 'Utilidad Neta / Ventas. Mide la eficiencia operativa y control de costos sobre las ventas.',
        },
        {
          title: '2. Rotación de Activos (Eficiencia)',
          valueActual: formatRatio(ratios.dupont_rotacion_activos?.periodoActual),
          valueAnterior: formatRatio(ratios.dupont_rotacion_activos?.periodoAnterior),
          description: 'Ventas Netas / Activos Totales. Mide qué tan productivos son los activos para generar ventas.',
        },
        {
          title: '3. Multiplicador de Capital (Apalancamiento)',
          valueActual: formatRatio(ratios.dupont_apalancamiento?.periodoActual),
          valueAnterior: formatRatio(ratios.dupont_apalancamiento?.periodoAnterior),
          description: 'Activo Total / Capital Contable. Mide el uso de recursos externos frente al patrimonio.',
        },
        {
          title: 'ROE DuPont = (1) × (2) × (3)',
          valueActual: formatRatio(ratios.dupont_roe?.periodoActual, 'percentage'),
          valueAnterior: formatRatio(ratios.dupont_roe?.periodoAnterior, 'percentage'),
          description: 'Rentabilidad sobre el patrimonio resultante de los 3 factores combinados.',
        },
      ],
    };
  }, [analysisResult]);

  const analysisData = analysisResult?.analysis;
  const vhData = analysisResult?.verticalHorizontal;
  const beData = analysisResult?.breakEven;
  const levData = analysisResult?.leverage;
  const eafData = analysisResult?.eaf;
  const efeData = analysisResult?.efe;

  const formatUnits = (value?: number | null) => {
    if (value === undefined || value === null || !isFinite(value)) return '-';
    return `${Math.round(value).toLocaleString('es-ES')} u`;
  };

  const breakEvenUnits = useMemo(() => {
    if (!beData) return null;

    const parseVal = (str: string) => {
      if (!str) return null;
      const clean = str.replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(clean);
      return !isNaN(num) && num > 0 ? num : null;
    };

    const pvuActual = parseVal(unitPriceActual);
    const pvuAnterior = parseVal(unitPriceAnterior);

    const calcForPeriod = (bePeriod: any, pvu: number | null) => {
      if (!bePeriod) return null;

      const ventasDinero = bePeriod.ventas ?? 0;
      const cvDinero = bePeriod.costosVariables ?? 0;
      const cfDinero = bePeriod.costosFijos ?? 0;
      const peDinero = bePeriod.puntoEquilibrioVentas ?? null;
      const msDinero = bePeriod.margenSeguridadMonto ?? null;

      if (!pvu || pvu <= 0) {
        return {
          pvu: null,
          peUnidades: null,
          margenSeguridadUnidades: null,
          ventasUnidades: null,
          costoVariableUnitario: null,
          margenContribucionUnitario: null,
        };
      }

      // Unidades vendidas estimadas = Ventas / PVU
      const ventasUnidades = ventasDinero > 0 ? ventasDinero / pvu : null;
      
      // Costo Variable Unitario (CVU)
      const cvu = ventasDinero > 0 ? (cvDinero / ventasDinero) * pvu : null;
      
      // Margen de Contribución Unitario (MCU) = PVU - CVU
      const mcu = cvu !== null ? pvu - cvu : null;

      // Punto de Equilibrio en Unidades = PE Dinero / PVU = CF / MCU
      const peUnidades = peDinero !== null ? Math.ceil(peDinero / pvu) : (mcu && mcu > 0 ? Math.ceil(cfDinero / mcu) : null);

      // Margen de Seguridad en Unidades = MS Dinero / PVU
      const margenSeguridadUnidades = msDinero !== null ? Math.round(msDinero / pvu) : null;

      return {
        pvu,
        peUnidades,
        margenSeguridadUnidades,
        ventasUnidades: ventasUnidades !== null ? Math.round(ventasUnidades) : null,
        costoVariableUnitario: cvu,
        margenContribucionUnitario: mcu,
      };
    };

    return {
      periodoActual: calcForPeriod(beData.periodoActual, pvuActual),
      periodoAnterior: calcForPeriod(beData.periodoAnterior, pvuAnterior),
    };
  }, [beData, unitPriceActual, unitPriceAnterior]);

  const exportPayload = useMemo(() => {
    return {
      companyName: 'Empresa Analizada',
      reportDate: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
      ratios: analysisResult?.ratios,
      verticalHorizontal: vhData || { balanceSheet: [], incomeStatement: [] },
      breakEven: beData,
      breakEvenUnits: breakEvenUnits,
      leverage: levData,
      eaf: eafData,
      efe: efeData,
      financialData: analysisResult?.financialData,
      analysisAI: analysisData,
    };
  }, [analysisResult, vhData, beData, breakEvenUnits, levData, eafData, efeData, analysisData]);

  if (loading || authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
        <BrainCircuit className="h-16 w-16 text-primary animate-pulse" />
        <h1 className="text-3xl font-bold tracking-tight">Analizando tus finanzas...</h1>
        <LoadingSpinner className="h-12 w-12 text-primary mt-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Análisis Fallido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/upload/excel">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a intentar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-card via-card to-palette-100/30 backdrop-blur-md p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors px-3 py-1 rounded-full bg-muted/60 border border-border/80 w-fit"
                >
                  <ArrowLeft size={14} />
                  Volver al Panel
                </Link>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                    Reporte Financiero Integral
                  </h1>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/25">
                    Análisis Financiero
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                {/* Menú de Exportación Directa Arriba */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      className="rounded-xl font-bold text-xs h-10 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-4 transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>Exportar Reporte</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border border-border bg-card">
                    <DropdownMenuItem
                      onClick={() => {
                        exportToExcel(exportPayload);
                        toast({
                          title: 'Excel generado',
                          description: 'Se descargó el libro Excel (.xlsx) con los 6 módulos completos.',
                        });
                      }}
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-emerald-500/10 font-medium text-xs text-foreground transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Libro Excel (.xlsx)</span>
                        <span className="text-[10px] text-muted-foreground">6 módulos, balances y fórmulas</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        exportToWord(exportPayload);
                        toast({
                          title: 'Word generado',
                          description: 'Se descargó el informe corporativo (.docx) completo.',
                        });
                      }}
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-blue-500/10 font-medium text-xs text-foreground transition-colors"
                    >
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-700 dark:text-blue-400">Documento Word (.docx)</span>
                        <span className="text-[10px] text-muted-foreground">Reporte directivo editable</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        toast({
                          title: 'Preparando PDF',
                          description: 'Abriendo vista de impresión con el informe de los 6 módulos.',
                        });
                        exportToPDF(exportPayload);
                      }}
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-rose-500/10 font-medium text-xs text-foreground transition-colors"
                    >
                      <Printer className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-rose-700 dark:text-rose-400">Imprimir / PDF (.pdf)</span>
                        <span className="text-[10px] text-muted-foreground">Diseño limpio de presentación</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  onClick={handleRegenerateAI}
                  disabled={regenerating}
                  className="rounded-xl border-primary/25 hover:border-primary/50 hover:bg-primary/5 font-semibold text-xs h-10 shadow-sm"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${regenerating ? 'animate-spin' : 'text-primary'}`} />
                  {regenerating ? 'Recalculando...' : 'Actualizar Análisis'}
                </Button>
                <Button asChild variant="outline" className="rounded-xl border-primary/25 hover:border-primary/50 font-semibold text-xs h-10 shadow-sm">
                  <Link href="/dashboard/reports">
                    <FileText className="mr-2 h-4 w-4 text-primary" /> Historial
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <Tabs defaultValue="ratios" className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full h-auto p-1.5 gap-1.5 rounded-2xl bg-card/85 backdrop-blur-md border border-primary/20 shadow-sm">
              <TabsTrigger value="ratios" className="py-2.5 rounded-xl font-semibold text-xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                <Scale className="h-4 w-4 mr-1.5" /> Razones Financieras
              </TabsTrigger>
              <TabsTrigger value="verticalHorizontal" className="py-2.5 rounded-xl font-semibold text-xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                <Layers className="h-4 w-4 mr-1.5" /> Vertical y Horizontal
              </TabsTrigger>
              <TabsTrigger value="breakEven" className="py-2.5 rounded-xl font-semibold text-xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                <Gauge className="h-4 w-4 mr-1.5" /> Punto de Equilibrio
              </TabsTrigger>
              <TabsTrigger value="dupont" className="py-2.5 rounded-xl font-semibold text-xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                <BarChart className="h-4 w-4 mr-1.5" /> Sistema DuPont
              </TabsTrigger>
              <TabsTrigger value="leverage" className="py-2.5 rounded-xl font-semibold text-xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                <Sliders className="h-4 w-4 mr-1.5" /> Apalancamiento
              </TabsTrigger>
              <TabsTrigger value="flows" className="py-2.5 rounded-xl font-semibold text-xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Origen y Aplicación
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: RAZONES FINANCIERAS */}
            <TabsContent value="ratios" className="space-y-6">
              {/* Liquidez */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="text-primary h-5 w-5" /> Análisis de Liquidez
                  </CardTitle>
                  <CardDescription>Capacidad de la empresa para cumplir sus obligaciones de corto plazo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {liquidityRatios.map((ratio) => (
                      <RatioCard key={ratio.title} {...ratio} />
                    ))}
                  </div>
                  {analysisData?.liquidity && (
                    <StructuredAIInsights
                      title="Evaluación de Liquidez y Solvencia Inmediata"
                      description="Capacidad de pago a corto plazo, capital de trabajo y análisis de fondos ociosos."
                      data={analysisData.liquidity}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Actividad */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="text-primary h-5 w-5" /> Análisis de Actividad y Eficiencia Operativa
                  </CardTitle>
                  <CardDescription>Eficiencia en el manejo y velocidad de rotación de inventarios, cobranza y activos totales.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {activityRatios.map((ratio) => (
                      <RatioCard key={ratio.title} {...ratio} />
                    ))}
                  </div>
                  {analysisData?.activity && (
                    <StructuredAIInsights
                      title="Evaluación de Actividad y Rotación Operativa"
                      description="Desglose por ciclo operativo: días de inventario, velocidad de cobro y productividad de activos."
                      data={analysisData.activity}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Endeudamiento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="text-primary h-5 w-5" /> Análisis de Endeudamiento y Solvencia
                  </CardTitle>
                  <CardDescription>Estructura de financiamiento con terceros, apalancamiento patrimonial y cobertura de compromisos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {debtRatios.map((ratio) => (
                      <RatioCard key={ratio.title} {...ratio} />
                    ))}
                  </div>
                  {analysisData?.debt && (
                    <StructuredAIInsights
                      title="Evaluación de Endeudamiento y Solvencia"
                      description="Riesgo crediticio, proporción de deuda financiera y capacidad de cobertura de intereses."
                      data={analysisData.debt}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Rentabilidad */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="text-primary h-5 w-5" /> Análisis de Rentabilidad
                  </CardTitle>
                  <CardDescription>Capacidad de generar utilidades sobre ventas, activos (ROA) y patrimonio (ROE).</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    {profitabilityRatios.map((ratio) => (
                      <RatioCard key={ratio.title} {...ratio} />
                    ))}
                  </div>
                  {analysisData?.profitability && (
                    <StructuredAIInsights
                      title="Evaluación de Rentabilidad y Márgenes"
                      description="Eficiencia en costos (Margen Bruto/Operativo/Neto) y retorno sobre capital invertido."
                      data={analysisData.profitability}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: ANÁLISIS VERTICAL Y HORIZONTAL */}
            <TabsContent value="verticalHorizontal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="text-primary h-5 w-5" /> Análisis Vertical y Horizontal
                  </CardTitle>
                  <CardDescription>
                    Comparación estructural porcentual (Vertical) y variación nominal y porcentual entre periodos (Horizontal).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="vh-balance" className="space-y-4">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="vh-balance">Balance General</TabsTrigger>
                      <TabsTrigger value="vh-income">Estado de Resultados</TabsTrigger>
                    </TabsList>

                    {/* Balance General VH */}
                    <TabsContent value="vh-balance" className="pt-2">
                      <div className="rounded-md border overflow-x-auto">
                        <Table className="w-full text-sm border-collapse">
                          <TableHeader>
                            <TableRow className="bg-muted/80 border-b text-xs">
                              <TableHead className="w-[30%] min-w-[200px] font-bold">
                                Cuenta
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Período Actual
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Vert. Act.
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Período Anterior
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Vert. Ant.
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Var. Absoluta
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Var. Porcentual (%)
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vhData?.balanceSheet?.map((row: AnalysisRow, idx: number) => {
                              if (row.isHeader) {
                                return (
                                  <TableRow key={`bs-h-${idx}`} className="bg-muted/90 hover:bg-muted/90 border-t-2 border-b">
                                    <TableCell colSpan={7} className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider text-foreground">
                                      {formatAccountName(row.cuenta)}
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              const isGrandTotal = row.isGrandTotal;
                              const isTotal = row.isTotal;

                              return (
                                <TableRow
                                  key={`bs-${row.cuenta}-${idx}`}
                                  className={`transition-colors ${
                                    isGrandTotal
                                      ? 'bg-primary/10 hover:bg-primary/15 font-extrabold text-base border-t-2 border-b-2 border-primary/40'
                                      : isTotal
                                      ? 'bg-muted/40 hover:bg-muted/50 font-bold border-t border-b'
                                      : 'hover:bg-muted/20'
                                  }`}
                                >
                                  <TableCell className={`${isGrandTotal ? 'font-extrabold text-primary' : isTotal ? 'font-bold' : 'pl-6 font-medium text-foreground/90'}`}>
                                    {formatAccountName(row.cuenta)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{formatNumber(row.periodoActual)}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatPercent(row.verticalActual)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatNumber(row.periodoAnterior)}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {formatPercent(row.verticalAnterior)}
                                  </TableCell>
                                  <TableCell
                                    className={`text-right font-semibold ${
                                      row.variacionAbsoluta !== null && row.variacionAbsoluta > 0
                                        ? 'text-emerald-600'
                                        : row.variacionAbsoluta !== null && row.variacionAbsoluta < 0
                                        ? 'text-red-600'
                                        : ''
                                    }`}
                                  >
                                    {row.variacionAbsoluta !== null
                                      ? `${row.variacionAbsoluta > 0 ? '+' : ''}${formatNumber(row.variacionAbsoluta)}`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {row.variacionRelativa !== null ? (
                                      <Badge
                                        variant="outline"
                                        className={getHeatmapBadgeClass(row.variacionRelativa)}
                                      >
                                        {formatPercent(row.variacionRelativa, true)}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* Estado de Resultados VH */}
                    <TabsContent value="vh-income" className="pt-2">
                      <div className="rounded-md border overflow-x-auto">
                        <Table className="w-full text-sm border-collapse">
                          <TableHeader>
                            <TableRow className="bg-muted/80 border-b text-xs">
                              <TableHead className="w-[30%] min-w-[200px] font-bold">
                                Cuenta
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Período Actual
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Vert. Act.
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Período Anterior
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Vert. Ant.
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Var. Absoluta
                              </TableHead>
                              <TableHead className="text-right font-bold">
                                Var. Porcentual (%)
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vhData?.incomeStatement?.map((row: AnalysisRow, idx: number) => {
                              if (row.isHeader) {
                                return (
                                  <TableRow key={`is-h-${idx}`} className="bg-muted/90 hover:bg-muted/90 border-t-2 border-b">
                                    <TableCell colSpan={7} className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider text-foreground">
                                      {formatAccountName(row.cuenta)}
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              const isGrandTotal = row.isGrandTotal;
                              const isTotal = row.isTotal;

                              return (
                                <TableRow
                                  key={`is-${row.cuenta}-${idx}`}
                                  className={`transition-colors ${
                                    isGrandTotal
                                      ? 'bg-primary/10 hover:bg-primary/15 font-extrabold text-base border-t-2 border-b-2 border-primary/40'
                                      : isTotal
                                      ? 'bg-muted/40 hover:bg-muted/50 font-bold border-t border-b'
                                      : 'hover:bg-muted/20'
                                  }`}
                                >
                                  <TableCell className={`${isGrandTotal ? 'font-extrabold text-primary' : isTotal ? 'font-bold' : 'pl-6 font-medium text-foreground/90'}`}>
                                    {formatAccountName(row.cuenta)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{formatNumber(row.periodoActual)}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatPercent(row.verticalActual)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatNumber(row.periodoAnterior)}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {formatPercent(row.verticalAnterior)}
                                  </TableCell>
                                  <TableCell
                                    className={`text-right font-semibold ${
                                      row.variacionAbsoluta !== null && row.variacionAbsoluta > 0
                                        ? 'text-emerald-600'
                                        : row.variacionAbsoluta !== null && row.variacionAbsoluta < 0
                                        ? 'text-red-600'
                                        : ''
                                    }`}
                                  >
                                    {row.variacionAbsoluta !== null
                                      ? `${row.variacionAbsoluta > 0 ? '+' : ''}${formatNumber(row.variacionAbsoluta)}`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {row.variacionRelativa !== null ? (
                                      <Badge
                                        variant="outline"
                                        className={getHeatmapBadgeClass(row.variacionRelativa)}
                                      >
                                        {formatPercent(row.variacionRelativa, true)}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {analysisData?.verticalHorizontal && (
                    <StructuredAIInsights
                      title="Evaluación de Estructura y Variaciones Interanuales"
                      description="Concentración patrimonial y fluctuaciones nominales y relativas clave."
                      data={analysisData.verticalHorizontal}
                    />
                  )}

                  {/* Gráfico de Barras Apiladas: Estructura del Balance */}
                  <BalanceStructureChart vhData={vhData} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: PUNTO DE EQUILIBRIO */}
            <TabsContent value="breakEven" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Gauge className="text-primary h-5 w-5" /> Análisis de Punto de Equilibrio (Break-Even)
                      </CardTitle>
                      <CardDescription>
                        Nivel mínimo de ventas necesario para cubrir la totalidad de costos fijos y variables sin pérdidas.
                      </CardDescription>
                    </div>

                    {/* Selector de Modo de Visualización */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 self-start md:self-auto">
                      <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/80">
                        <Button
                          type="button"
                          size="sm"
                          variant={breakEvenViewMode === 'money' ? 'default' : 'ghost'}
                          className="h-8 px-3 text-xs font-semibold"
                          onClick={() => setBreakEvenViewMode('money')}
                        >
                          <Banknote className="mr-1.5 h-3.5 w-3.5" /> En Dinero ($)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={breakEvenViewMode === 'units' ? 'default' : 'ghost'}
                          className={`h-8 px-3 text-xs font-semibold transition-all ${
                            !hasUnitPrice ? 'opacity-50 cursor-not-allowed text-muted-foreground' : ''
                          }`}
                          disabled={!hasUnitPrice}
                          onClick={() => hasUnitPrice && setBreakEvenViewMode('units')}
                          title={!hasUnitPrice ? 'Se requiere precio unitario (PVU)' : 'Punto de equilibrio en unidades físicas'}
                        >
                          <Package className="mr-1.5 h-3.5 w-3.5" /> En Unidades (u)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={breakEvenViewMode === 'both' ? 'default' : 'ghost'}
                          className={`h-8 px-3 text-xs font-semibold transition-all ${
                            !hasUnitPrice ? 'opacity-50 cursor-not-allowed text-muted-foreground' : ''
                          }`}
                          disabled={!hasUnitPrice}
                          onClick={() => hasUnitPrice && setBreakEvenViewMode('both')}
                          title={!hasUnitPrice ? 'Se requiere precio unitario (PVU)' : 'Punto de equilibrio monetario y en unidades'}
                        >
                          <Sliders className="mr-1.5 h-3.5 w-3.5" /> Combinado ($ + u)
                        </Button>
                      </div>

                      {!hasUnitPrice && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-semibold animate-in fade-in duration-200">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          <span>Se requiere precio</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Panel de Configuración de Precio de Venta Unitario (PVU) */}
                  <div className="p-4 rounded-xl border bg-muted/30 dark:bg-muted/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Definir Precio de Venta Unitario (PVU)</span>
                        {!hasUnitPrice ? (
                          <Badge variant="outline" className="text-[11px] font-medium text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                            Se requiere precio para unidades
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            Precio Configurado
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Calcula automáticamente unidades mínimas, MCU y volumen físico.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                          <span>Precio Unitario - Periodo Actual ($)</span>
                          {unitPriceActual && (
                            <span className="text-[11px] text-primary font-semibold">
                              $ {parseFloat(unitPriceActual.replace(',', '.') || '0').toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          placeholder="Ej. 1250.00"
                          value={unitPriceActual}
                          onChange={(e) => setUnitPriceActual(e.target.value)}
                          className="h-9 bg-background"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                          <span>Precio Unitario - Periodo Anterior ($)</span>
                          {unitPriceAnterior && (
                            <span className="text-[11px] text-muted-foreground font-semibold">
                              $ {parseFloat(unitPriceAnterior.replace(',', '.') || '0').toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          placeholder="Ej. 1100.00 (opcional)"
                          value={unitPriceAnterior}
                          onChange={(e) => setUnitPriceAnterior(e.target.value)}
                          className="h-9 bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid de Métricas Principales de Punto de Equilibrio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Tarjeta 1: Punto de Equilibrio */}
                    <div className="p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-sm font-semibold text-foreground">
                          {breakEvenViewMode === 'units' ? 'Punto de Equilibrio (u)' : breakEvenViewMode === 'both' ? 'Punto de Equilibrio' : 'Punto de Equilibrio ($)'}
                        </span>
                        <Badge variant="secondary">
                          {breakEvenViewMode === 'units' ? 'Unidades Mínimas' : 'Ventas Mínimas'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Actual</span>
                          {breakEvenViewMode === 'money' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-primary whitespace-nowrap tabular-nums tracking-tight" title={beData?.periodoActual?.puntoEquilibrioVentas !== null ? `$ ${formatNumber(beData?.periodoActual?.puntoEquilibrioVentas)}` : '-'}>
                              {beData?.periodoActual?.puntoEquilibrioVentas !== null ? `$ ${formatNumber(beData?.periodoActual?.puntoEquilibrioVentas)}` : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'units' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-primary whitespace-nowrap tabular-nums tracking-tight" title={formatUnits(breakEvenUnits?.periodoActual?.peUnidades)}>
                              {breakEvenUnits?.periodoActual?.peUnidades !== null ? formatUnits(breakEvenUnits?.periodoActual?.peUnidades) : (unitPriceActual ? '-' : 'Definir PVU')}
                            </span>
                          )}
                          {breakEvenViewMode === 'both' && (
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-primary whitespace-nowrap tabular-nums tracking-tight">
                                {beData?.periodoActual?.puntoEquilibrioVentas !== null ? `$ ${formatNumber(beData?.periodoActual?.puntoEquilibrioVentas)}` : '-'}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap tabular-nums">
                                {breakEvenUnits?.periodoActual?.peUnidades !== null ? formatUnits(breakEvenUnits?.periodoActual?.peUnidades) : (unitPriceActual ? '-' : 'Sin PVU')}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 border-l border-border/60 pl-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Anterior</span>
                          {breakEvenViewMode === 'money' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={beData?.periodoAnterior?.puntoEquilibrioVentas !== null ? `$ ${formatNumber(beData?.periodoAnterior?.puntoEquilibrioVentas)}` : '-'}>
                              {beData?.periodoAnterior?.puntoEquilibrioVentas !== null ? `$ ${formatNumber(beData?.periodoAnterior?.puntoEquilibrioVentas)}` : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'units' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={formatUnits(breakEvenUnits?.periodoAnterior?.peUnidades)}>
                              {breakEvenUnits?.periodoAnterior?.peUnidades !== null ? formatUnits(breakEvenUnits?.periodoAnterior?.peUnidades) : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'both' && (
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight">
                                {beData?.periodoAnterior?.puntoEquilibrioVentas !== null ? `$ ${formatNumber(beData?.periodoAnterior?.puntoEquilibrioVentas)}` : '-'}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground/80 whitespace-nowrap tabular-nums">
                                {breakEvenUnits?.periodoAnterior?.peUnidades !== null ? formatUnits(breakEvenUnits?.periodoAnterior?.peUnidades) : '-'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta 2: Margen de Seguridad */}
                    <div className="p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-sm font-semibold text-foreground">
                          {breakEvenViewMode === 'units' ? 'Margen Seguridad (u)' : breakEvenViewMode === 'both' ? 'Margen de Seguridad' : 'Margen de Seguridad ($)'}
                        </span>
                        <Badge variant="outline">
                          {breakEvenViewMode === 'units' ? 'Colchón (u)' : 'Colchón ($)'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Actual</span>
                          {breakEvenViewMode === 'money' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-foreground whitespace-nowrap tabular-nums tracking-tight" title={beData?.periodoActual?.margenSeguridadMonto !== null ? `$ ${formatNumber(beData?.periodoActual?.margenSeguridadMonto)}` : '-'}>
                              {beData?.periodoActual?.margenSeguridadMonto !== null ? `$ ${formatNumber(beData?.periodoActual?.margenSeguridadMonto)}` : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'units' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-foreground whitespace-nowrap tabular-nums tracking-tight" title={formatUnits(breakEvenUnits?.periodoActual?.margenSeguridadUnidades)}>
                              {breakEvenUnits?.periodoActual?.margenSeguridadUnidades !== null ? formatUnits(breakEvenUnits?.periodoActual?.margenSeguridadUnidades) : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'both' && (
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap tabular-nums tracking-tight">
                                {beData?.periodoActual?.margenSeguridadMonto !== null ? `$ ${formatNumber(beData?.periodoActual?.margenSeguridadMonto)}` : '-'}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap tabular-nums">
                                {breakEvenUnits?.periodoActual?.margenSeguridadUnidades !== null ? formatUnits(breakEvenUnits?.periodoActual?.margenSeguridadUnidades) : '-'}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 border-l border-border/60 pl-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Anterior</span>
                          {breakEvenViewMode === 'money' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={beData?.periodoAnterior?.margenSeguridadMonto !== null ? `$ ${formatNumber(beData?.periodoAnterior?.margenSeguridadMonto)}` : '-'}>
                              {beData?.periodoAnterior?.margenSeguridadMonto !== null ? `$ ${formatNumber(beData?.periodoAnterior?.margenSeguridadMonto)}` : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'units' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={formatUnits(breakEvenUnits?.periodoAnterior?.margenSeguridadUnidades)}>
                              {breakEvenUnits?.periodoAnterior?.margenSeguridadUnidades !== null ? formatUnits(breakEvenUnits?.periodoAnterior?.margenSeguridadUnidades) : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'both' && (
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight">
                                {beData?.periodoAnterior?.margenSeguridadMonto !== null ? `$ ${formatNumber(beData?.periodoAnterior?.margenSeguridadMonto)}` : '-'}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground/80 whitespace-nowrap tabular-nums">
                                {breakEvenUnits?.periodoAnterior?.margenSeguridadUnidades !== null ? formatUnits(breakEvenUnits?.periodoAnterior?.margenSeguridadUnidades) : '-'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta 3: Margen de Contribución */}
                    <div className="p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-sm font-semibold text-foreground">
                          {breakEvenViewMode === 'units' ? 'Margen Contrib. Unitario (MCU)' : breakEvenViewMode === 'both' ? 'Margen Contribución' : 'Margen Contribución ($)'}
                        </span>
                        <Badge variant="outline">
                          {breakEvenViewMode === 'units' ? 'PVU - CVU' : 'Ventas - C.V.'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Actual</span>
                          {breakEvenViewMode === 'money' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums tracking-tight" title={beData?.periodoActual?.margenContribucion !== null ? `$ ${formatNumber(beData?.periodoActual?.margenContribucion)}` : '-'}>
                              {beData?.periodoActual?.margenContribucion !== null ? `$ ${formatNumber(beData?.periodoActual?.margenContribucion)}` : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'units' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums tracking-tight" title={breakEvenUnits?.periodoActual?.margenContribucionUnitario !== null ? `$ ${formatNumber(breakEvenUnits?.periodoActual?.margenContribucionUnitario)}` : '-'}>
                              {breakEvenUnits?.periodoActual?.margenContribucionUnitario !== null ? `$ ${formatNumber(breakEvenUnits?.periodoActual?.margenContribucionUnitario)}` : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'both' && (
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums tracking-tight">
                                {beData?.periodoActual?.margenContribucion !== null ? `$ ${formatNumber(beData?.periodoActual?.margenContribucion)}` : '-'}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap tabular-nums">
                                MCU: {breakEvenUnits?.periodoActual?.margenContribucionUnitario !== null ? `$ ${formatNumber(breakEvenUnits?.periodoActual?.margenContribucionUnitario)}` : '-'}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 border-l border-border/60 pl-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Anterior</span>
                          {breakEvenViewMode === 'money' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={beData?.periodoAnterior?.margenContribucion !== null ? `$ ${formatNumber(beData?.periodoAnterior?.margenContribucion)}` : '-'}>
                              {beData?.periodoAnterior?.margenContribucion !== null ? `$ ${formatNumber(beData?.periodoAnterior?.margenContribucion)}` : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'units' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={breakEvenUnits?.periodoAnterior?.margenContribucionUnitario !== null ? `$ ${formatNumber(breakEvenUnits?.periodoAnterior?.margenContribucionUnitario)}` : '-'}>
                              {breakEvenUnits?.periodoAnterior?.margenContribucionUnitario !== null ? `$ ${formatNumber(breakEvenUnits?.periodoAnterior?.margenContribucionUnitario)}` : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'both' && (
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight">
                                {beData?.periodoAnterior?.margenContribucion !== null ? `$ ${formatNumber(beData?.periodoAnterior?.margenContribucion)}` : '-'}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground/80 whitespace-nowrap tabular-nums">
                                MCU: {breakEvenUnits?.periodoAnterior?.margenContribucionUnitario !== null ? `$ ${formatNumber(breakEvenUnits?.periodoAnterior?.margenContribucionUnitario)}` : '-'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta 4: Razón Contribución / Ventas Físicas */}
                    <div className="p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-sm font-semibold text-foreground">
                          {breakEvenViewMode === 'units' ? 'Ventas Totales (u)' : breakEvenViewMode === 'both' ? 'Razón MC / Ventas (u)' : 'Razón Contribución (%)'}
                        </span>
                        <Badge variant="outline">
                          {breakEvenViewMode === 'units' ? 'Volumen Físico' : 'MC / Ventas'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Actual</span>
                          {breakEvenViewMode === 'money' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-foreground whitespace-nowrap tabular-nums tracking-tight" title={formatPercent((beData?.periodoActual?.razonMargenContribucion ?? null) !== null ? (beData?.periodoActual?.razonMargenContribucion * 100) : null)}>
                              {formatPercent((beData?.periodoActual?.razonMargenContribucion ?? null) !== null ? (beData?.periodoActual?.razonMargenContribucion * 100) : null)}
                            </span>
                          )}
                          {breakEvenViewMode === 'units' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-foreground whitespace-nowrap tabular-nums tracking-tight" title={formatUnits(breakEvenUnits?.periodoActual?.ventasUnidades)}>
                              {breakEvenUnits?.periodoActual?.ventasUnidades !== null ? formatUnits(breakEvenUnits?.periodoActual?.ventasUnidades) : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'both' && (
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap tabular-nums tracking-tight">
                                {formatPercent((beData?.periodoActual?.razonMargenContribucion ?? null) !== null ? (beData?.periodoActual?.razonMargenContribucion * 100) : null)}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap tabular-nums">
                                Vol: {breakEvenUnits?.periodoActual?.ventasUnidades !== null ? formatUnits(breakEvenUnits?.periodoActual?.ventasUnidades) : '-'}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 border-l border-border/60 pl-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Anterior</span>
                          {breakEvenViewMode === 'money' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={formatPercent((beData?.periodoAnterior?.razonMargenContribucion ?? null) !== null ? (beData?.periodoAnterior?.razonMargenContribucion * 100) : null)}>
                              {formatPercent((beData?.periodoAnterior?.razonMargenContribucion ?? null) !== null ? (beData?.periodoAnterior?.razonMargenContribucion * 100) : null)}
                            </span>
                          )}
                          {breakEvenViewMode === 'units' && (
                            <span className="text-sm sm:text-base xl:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={formatUnits(breakEvenUnits?.periodoAnterior?.ventasUnidades)}>
                              {breakEvenUnits?.periodoAnterior?.ventasUnidades !== null ? formatUnits(breakEvenUnits?.periodoAnterior?.ventasUnidades) : '-'}
                            </span>
                          )}
                          {breakEvenViewMode === 'both' && (
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight">
                                {formatPercent((beData?.periodoAnterior?.razonMargenContribucion ?? null) !== null ? (beData?.periodoAnterior?.razonMargenContribucion * 100) : null)}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground/80 whitespace-nowrap tabular-nums">
                                Vol: {breakEvenUnits?.periodoAnterior?.ventasUnidades !== null ? formatUnits(breakEvenUnits?.periodoAnterior?.ventasUnidades) : '-'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Estructura de Costos Base */}
                  <div className="rounded-xl border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/70">
                          <TableHead className="font-bold">Componente Financiero de Costos</TableHead>
                          <TableHead className="text-right font-bold">Periodo Anterior ($)</TableHead>
                          <TableHead className="text-right font-bold">Periodo Actual ($)</TableHead>
                          <TableHead className="text-right font-bold">Variación ($)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Ventas Netas Totales</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatNumber(beData?.periodoAnterior?.ventas)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatNumber(beData?.periodoActual?.ventas)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {beData?.periodoActual?.ventas !== null && beData?.periodoAnterior?.ventas !== null
                              ? `${beData.periodoActual.ventas - beData.periodoAnterior.ventas > 0 ? '+' : ''}${formatNumber(beData.periodoActual.ventas - beData.periodoAnterior.ventas)}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600">Costos Variables (Costo de Ventas)</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatNumber(beData?.periodoAnterior?.costosVariables)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatNumber(beData?.periodoActual?.costosVariables)}</TableCell>
                          <TableCell className="text-right">
                            {beData?.periodoActual?.costosVariables !== null && beData?.periodoAnterior?.costosVariables !== null
                              ? `${beData.periodoActual.costosVariables - beData.periodoAnterior.costosVariables > 0 ? '+' : ''}${formatNumber(beData.periodoActual.costosVariables - beData.periodoAnterior.costosVariables)}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-orange-600">Costos y Gastos Fijos (Operación)</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatNumber(beData?.periodoAnterior?.costosFijos)}</TableCell>
                          <TableCell className="text-right font-semibold text-orange-600">{formatNumber(beData?.periodoActual?.costosFijos)}</TableCell>
                          <TableCell className="text-right">
                            {beData?.periodoActual?.costosFijos !== null && beData?.periodoAnterior?.costosFijos !== null
                              ? `${beData.periodoActual.costosFijos - beData.periodoAnterior.costosFijos > 0 ? '+' : ''}${formatNumber(beData.periodoActual.costosFijos - beData.periodoAnterior.costosFijos)}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Tabla de Métricas Unitarias (cuando se ha definido PVU) */}
                  {(unitPriceActual || unitPriceAnterior || breakEvenViewMode !== 'money') && (
                    <div className="rounded-xl border overflow-x-auto bg-muted/10">
                      <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Desglose Unitario y Físico (Unit Economics)</span>
                        </div>
                        <Badge variant="outline">Unidades y Precios</Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="font-bold">Métrica Unitaria</TableHead>
                            <TableHead className="text-right font-bold">Periodo Anterior</TableHead>
                            <TableHead className="text-right font-bold">Periodo Actual</TableHead>
                            <TableHead className="text-right font-bold">Variación</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Precio de Venta Unitario (PVU)</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {breakEvenUnits?.periodoAnterior?.pvu ? `$ ${formatNumber(breakEvenUnits.periodoAnterior.pvu)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              {breakEvenUnits?.periodoActual?.pvu ? `$ ${formatNumber(breakEvenUnits.periodoActual.pvu)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {breakEvenUnits?.periodoActual?.pvu && breakEvenUnits?.periodoAnterior?.pvu
                                ? `${breakEvenUnits.periodoActual.pvu - breakEvenUnits.periodoAnterior.pvu > 0 ? '+' : ''}$ ${formatNumber(breakEvenUnits.periodoActual.pvu - breakEvenUnits.periodoAnterior.pvu)}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-red-600">Costo Variable Unitario (CVU)</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {breakEvenUnits?.periodoAnterior?.costoVariableUnitario ? `$ ${formatNumber(breakEvenUnits.periodoAnterior.costoVariableUnitario)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-600">
                              {breakEvenUnits?.periodoActual?.costoVariableUnitario ? `$ ${formatNumber(breakEvenUnits.periodoActual.costoVariableUnitario)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {breakEvenUnits?.periodoActual?.costoVariableUnitario && breakEvenUnits?.periodoAnterior?.costoVariableUnitario
                                ? `${breakEvenUnits.periodoActual.costoVariableUnitario - breakEvenUnits.periodoAnterior.costoVariableUnitario > 0 ? '+' : ''}$ ${formatNumber(breakEvenUnits.periodoActual.costoVariableUnitario - breakEvenUnits.periodoAnterior.costoVariableUnitario)}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">Margen de Contribución Unitario (MCU = PVU - CVU)</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {breakEvenUnits?.periodoAnterior?.margenContribucionUnitario ? `$ ${formatNumber(breakEvenUnits.periodoAnterior.margenContribucionUnitario)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              {breakEvenUnits?.periodoActual?.margenContribucionUnitario ? `$ ${formatNumber(breakEvenUnits.periodoActual.margenContribucionUnitario)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {breakEvenUnits?.periodoActual?.margenContribucionUnitario && breakEvenUnits?.periodoAnterior?.margenContribucionUnitario
                                ? `${breakEvenUnits.periodoActual.margenContribucionUnitario - breakEvenUnits.periodoAnterior.margenContribucionUnitario > 0 ? '+' : ''}$ ${formatNumber(breakEvenUnits.periodoActual.margenContribucionUnitario - breakEvenUnits.periodoAnterior.margenContribucionUnitario)}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Ventas Totales en Unidades (Físicas)</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatUnits(breakEvenUnits?.periodoAnterior?.ventasUnidades)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatUnits(breakEvenUnits?.periodoActual?.ventasUnidades)}
                            </TableCell>
                            <TableCell className="text-right">
                              {breakEvenUnits?.periodoActual?.ventasUnidades && breakEvenUnits?.periodoAnterior?.ventasUnidades
                                ? `${breakEvenUnits.periodoActual.ventasUnidades - breakEvenUnits.periodoAnterior.ventasUnidades > 0 ? '+' : ''}${formatUnits(breakEvenUnits.periodoActual.ventasUnidades - breakEvenUnits.periodoAnterior.ventasUnidades)}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-primary/5">
                            <TableCell className="font-bold text-primary">Punto de Equilibrio en Unidades (PE Físico)</TableCell>
                            <TableCell className="text-right text-muted-foreground font-semibold">
                              {formatUnits(breakEvenUnits?.periodoAnterior?.peUnidades)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {formatUnits(breakEvenUnits?.periodoActual?.peUnidades)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {breakEvenUnits?.periodoActual?.peUnidades && breakEvenUnits?.periodoAnterior?.peUnidades
                                ? `${breakEvenUnits.periodoActual.peUnidades - breakEvenUnits.periodoAnterior.peUnidades > 0 ? '+' : ''}${formatUnits(breakEvenUnits.periodoActual.peUnidades - breakEvenUnits.periodoAnterior.peUnidades)}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {analysisData?.breakEven && (
                    <StructuredAIInsights
                      title="Evaluación de Punto de Equilibrio y Margen de Seguridad"
                      description="Sensibilidad operativa, colchón de absorción de caídas de ventas y fijación estratégica de precios."
                      data={analysisData.breakEven}
                    />
                  )}

                  {/* Gráfico Clásico de Punto de Equilibrio */}
                  <BreakEvenChart breakEvenData={beData} breakEvenUnits={breakEvenUnits} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: SISTEMA DUPONT */}
            <TabsContent value="dupont" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <BarChart className="text-primary h-5 w-5" />
                    Sistema DuPont (Desglose del ROE)
                  </CardTitle>
                  <CardDescription>
                    Descompone la Rentabilidad sobre el Patrimonio en Eficiencia Operativa, Productividad de Activos y Apalancamiento Financiero.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Formula banner */}
                  <div className="p-4 bg-muted/50 rounded-xl border text-center font-mono text-sm md:text-base">
                    <strong>ROE</strong> = Margen Neto (%) × Rotación de Activos (veces) × Multiplicador de Capital
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dupontRatios.map((ratio) => (
                      <RatioCard key={ratio.title} {...ratio} />
                    ))}
                  </div>

                  {analysisData?.dupont && (
                    <StructuredAIInsights
                      title="Evaluación del Desglose DuPont (ROE)"
                      description="Análisis del motor principal de rentabilidad (Margen Neto × Rotación de Activos × Multiplicador de Capital)."
                      data={analysisData.dupont}
                    />
                  )}

                  {/* Gráfico de Cascada (Waterfall): Descomposición Factorial del ROE */}
                  <DupontWaterfallChart ratios={analysisResult?.ratios} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: APALANCAMIENTO */}
            <TabsContent value="leverage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="text-primary h-5 w-5" /> Análisis de Apalancamiento (Operativo, Financiero y Total)
                  </CardTitle>
                  <CardDescription>
                    Evalúa la sensibilidad y riesgo de la empresa ante variaciones en el volumen de ventas y deudas financieras.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tarjetas de Apalancamiento con tipografía unificada */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* GAO */}
                    <div className="p-5 rounded-xl border bg-card shadow-sm flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <span className="text-xs font-bold text-muted-foreground uppercase">Apalancamiento Operativo</span>
                          <Badge variant="outline">GAO</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-3">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Actual</span>
                            <span className="text-xl sm:text-2xl font-bold text-foreground whitespace-nowrap tabular-nums tracking-tight" title={levData?.periodoActual?.gao !== null ? `${levData?.periodoActual?.gao?.toFixed(2)}` : '-'}>
                              {levData?.periodoActual?.gao !== null ? `${levData?.periodoActual?.gao?.toFixed(2)}` : '-'}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0 border-l border-border/60 pl-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Anterior</span>
                            <span className="text-xl sm:text-2xl font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={levData?.periodoAnterior?.gao !== null ? `${levData?.periodoAnterior?.gao?.toFixed(2)}` : '-'}>
                              {levData?.periodoAnterior?.gao !== null ? `${levData?.periodoAnterior?.gao?.toFixed(2)}` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                        Fórmula: <strong>Margen de Contribución / Utilidad de Operación (UAII)</strong>
                      </p>
                    </div>

                    {/* GAF */}
                    <div className="p-5 rounded-xl border bg-card shadow-sm flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <span className="text-xs font-bold text-muted-foreground uppercase">Apalancamiento Financiero</span>
                          <Badge variant="outline">GAF</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-3">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Actual</span>
                            <span className="text-xl sm:text-2xl font-bold text-foreground whitespace-nowrap tabular-nums tracking-tight" title={levData?.periodoActual?.gaf !== null ? `${levData?.periodoActual?.gaf?.toFixed(2)}` : '-'}>
                              {levData?.periodoActual?.gaf !== null ? `${levData?.periodoActual?.gaf?.toFixed(2)}` : '-'}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0 border-l border-border/60 pl-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Anterior</span>
                            <span className="text-xl sm:text-2xl font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={levData?.periodoAnterior?.gaf !== null ? `${levData?.periodoAnterior?.gaf?.toFixed(2)}` : '-'}>
                              {levData?.periodoAnterior?.gaf !== null ? `${levData?.periodoAnterior?.gaf?.toFixed(2)}` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                        Fórmula: <strong>Utilidad de Operación (UAII) / Utilidad Antes de Impuestos (UAI)</strong>
                      </p>
                    </div>

                    {/* GAT */}
                    <div className="p-5 rounded-xl border bg-card shadow-sm flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <span className="text-xs font-bold text-muted-foreground uppercase">Apalancamiento Total</span>
                          <Badge variant="secondary">GAT</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-3">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Actual</span>
                            <span className="text-xl sm:text-2xl font-bold text-primary whitespace-nowrap tabular-nums tracking-tight" title={levData?.periodoActual?.gat !== null ? `${levData?.periodoActual?.gat?.toFixed(2)}` : '-'}>
                              {levData?.periodoActual?.gat !== null ? `${levData?.periodoActual?.gat?.toFixed(2)}` : '-'}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0 border-l border-border/60 pl-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Anterior</span>
                            <span className="text-xl sm:text-2xl font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={levData?.periodoAnterior?.gat !== null ? `${levData?.periodoAnterior?.gat?.toFixed(2)}` : '-'}>
                              {levData?.periodoAnterior?.gat !== null ? `${levData?.periodoAnterior?.gat?.toFixed(2)}` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                        Fórmula: <strong>GAO × GAF</strong> o <strong>Margen de Contribución / Utilidad Antes de Impuestos</strong>
                      </p>
                    </div>
                  </div>

                  {analysisData?.leverage && (
                    <StructuredAIInsights
                      title="Evaluación de Grados de Apalancamiento (GAO, GAF, GAT)"
                      description="Sensibilidad operativa ante variaciones en ventas y sensibilidad financiera ante costos de deuda."
                      data={analysisData.leverage}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>


            {/* TAB 6: ESTADO DE ORIGEN Y APLICACIÓN (EAF) */}
            <TabsContent value="flows" className="space-y-6">
              {eafData && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold">
                      <ArrowRightLeft className="text-primary h-5 w-5" />
                      Estado de Origen y Aplicación de Fondos (EAF)
                    </CardTitle>
                    <CardDescription>
                      Muestra detalladamente cómo la empresa generó fondos (Orígenes) y cómo los utilizó (Aplicaciones) entre ambos períodos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border overflow-x-auto shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/60 border-b">
                            <TableHead className="font-bold text-foreground">Cuenta</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Periodo Actual</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Periodo Anterior</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Variación</TableHead>
                            <TableHead className="text-right font-bold text-emerald-600 dark:text-emerald-400">Origen</TableHead>
                            <TableHead className="text-right font-bold text-red-600 dark:text-red-400">Aplicación</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eafData.activos?.length > 0 && (
                            <TableRow className="bg-muted/80 hover:bg-muted/80 border-b font-bold">
                              <TableCell colSpan={6} className="text-xs tracking-wider uppercase text-muted-foreground py-2 font-bold">
                                ACTIVOS
                              </TableCell>
                            </TableRow>
                          )}
                          {eafData.activos?.map((item: any) => (
                            <TableRow key={`activo-${item.cuenta}`} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-foreground">{formatAccountName(item.cuenta)}</TableCell>
                              <TableCell className="text-right">{formatNumber(item.periodoActual)}</TableCell>
                              <TableCell className="text-right">{formatNumber(item.periodoAnterior)}</TableCell>
                              <TableCell className="text-right font-medium">{formatNumber(item.cambio)}</TableCell>
                              <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                                {item.origen > 0 ? formatNumber(item.origen) : '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                                {item.aplicacion > 0 ? formatNumber(item.aplicacion) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}

                          {eafData.pasivos?.length > 0 && (
                            <TableRow className="bg-muted/80 hover:bg-muted/80 border-b font-bold">
                              <TableCell colSpan={6} className="text-xs tracking-wider uppercase text-muted-foreground py-2 font-bold">
                                PASIVOS
                              </TableCell>
                            </TableRow>
                          )}
                          {eafData.pasivos?.map((item: any) => (
                            <TableRow key={`pasivo-${item.cuenta}`} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-foreground">{formatAccountName(item.cuenta)}</TableCell>
                              <TableCell className="text-right">{formatNumber(item.periodoActual)}</TableCell>
                              <TableCell className="text-right">{formatNumber(item.periodoAnterior)}</TableCell>
                              <TableCell className="text-right font-medium">{formatNumber(item.cambio)}</TableCell>
                              <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                                {item.origen > 0 ? formatNumber(item.origen) : '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                                {item.aplicacion > 0 ? formatNumber(item.aplicacion) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}

                          {eafData.capitalContable?.length > 0 && (
                            <TableRow className="bg-muted/80 hover:bg-muted/80 border-b font-bold">
                              <TableCell colSpan={6} className="text-xs tracking-wider uppercase text-muted-foreground py-2 font-bold">
                                CAPITAL CONTABLE
                              </TableCell>
                            </TableRow>
                          )}
                          {eafData.capitalContable?.map((item: any) => (
                            <TableRow key={`capital-${item.cuenta}`} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-foreground">{formatAccountName(item.cuenta)}</TableCell>
                              <TableCell className="text-right">{formatNumber(item.periodoActual)}</TableCell>
                              <TableCell className="text-right">{formatNumber(item.periodoAnterior)}</TableCell>
                              <TableCell className="text-right font-medium">{formatNumber(item.cambio)}</TableCell>
                              <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                                {item.origen > 0 ? formatNumber(item.origen) : '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                                {item.aplicacion > 0 ? formatNumber(item.aplicacion) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-muted font-bold text-base border-t-2 border-primary/20">
                            <TableCell colSpan={4} className="font-bold text-foreground">
                              TOTALES (Incluyendo Efectivo)
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                              {formatNumber(eafData.totalOrigen)}
                            </TableCell>
                            <TableCell className="text-right text-red-600 dark:text-red-400 font-extrabold text-base">
                              {formatNumber(eafData.totalAplicacion)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>

                    <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1.5">
                      <p className="font-semibold text-foreground text-sm">Reglas Fundamentales del EAF:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Activos:</strong> Un aumento es una <span className="text-red-600 dark:text-red-400 font-semibold">Aplicación</span> (uso de fondos) y una disminución es un <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Origen</span> (generación de fondos).</li>
                        <li><strong>Pasivos y Capital:</strong> Un aumento es un <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Origen</span> (financiamiento recibido) y una disminución es una <span className="text-red-600 dark:text-red-400 font-semibold">Aplicación</span> (desembolso / amortización).</li>
                      </ul>
                    </div>

                    {analysisData?.eaf && (
                      <StructuredAIInsights
                        title="Evaluación de Fuentes y Aplicaciones de Fondos (EAF)"
                        description="Origen de los recursos financieros y su destino de inversión o amortización."
                        data={analysisData.eaf}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AnalysisCore />
    </Suspense>
  );
}
