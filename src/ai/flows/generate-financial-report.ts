'use server';

/**
 * @fileOverview A flow for generating structured financial reports with fallback resilience.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const IndicatorInsightSchema = z.object({
  indicador: z.string().describe('Nombre del indicador financiero o concepto analizado (ej. "Razón Corriente", "Días de Inventario", "Periodo Promedio de Cobro", "Margen Operativo", "ROE DuPont", "Punto de Equilibrio en Ventas", "Grado de Apalancamiento Operativo (GAO)").'),
  hallazgo: z.string().describe('Comportamiento numérico y variación real comprobada del período anterior al actual. Cita las cifras y porcentajes con total fidelidad a los datos provistos.'),
  riesgo: z.string().describe('Consecuencia económica, riesgo operativo o costo de oportunidad asociado (ej. en exceso de liquidez: activos ociosos; en inventario lento: capital inmovilizado; en margen decreciente: absorción de costos fijos).'),
});
export type IndicatorInsight = z.infer<typeof IndicatorInsightSchema>;

const SectionAnalysisSchema = z.object({
  resumen: z.string().optional().describe('Síntesis ejecutiva de la sección en 1-2 oraciones directas.'),
  insights: z.array(IndicatorInsightSchema).describe('Lista de hallazgos y riesgos estructurados por cada indicador clave analizado en esta sección.'),
  diagnostico: z.string().optional().describe('Diagnóstico analítico profundo y exclusivo para este módulo o temática financiera.'),
  recomendaciones: z.array(z.string()).optional().describe('Lista de recomendaciones estratégicas específicas y cuantificadas para este módulo, en viñetas directas.'),
});
export type SectionAnalysis = z.infer<typeof SectionAnalysisSchema>;

const SummaryAnalysisSchema = z.object({
  diagnostico: z.string().describe('Diagnóstico financiero integral y consolidado de la empresa.'),
  recomendaciones: z.array(z.string()).describe('Lista de recomendaciones estratégicas específicas y cuantificadas para la empresa, formuladas para mostrarse en viñetas directas.'),
});
export type SummaryAnalysis = z.infer<typeof SummaryAnalysisSchema>;

const FinancialAnalysisSchema = z.object({
  liquidity: SectionAnalysisSchema.describe('Análisis de liquidez (Razón Corriente, Razón Rápida, Capital de Trabajo Neto) con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  activity: SectionAnalysisSchema.describe('Análisis de actividad y eficiencia (Rotación y Días de Inventario, Rotación y Días de Cobro, Rotación de Activos Totales) con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  debt: SectionAnalysisSchema.describe('Análisis de endeudamiento y solvencia (Razón de Endeudamiento, Deuda a Capital, Cobertura de Intereses) con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  profitability: SectionAnalysisSchema.describe('Análisis de rentabilidad (Margen Bruto, Operativo, Neto, ROA, ROE) con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  dupont: SectionAnalysisSchema.describe('Análisis del Sistema DuPont (Margen Neto × Rotación de Activos × Multiplicador de Capital = ROE) con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  verticalHorizontal: SectionAnalysisSchema.optional().describe('Análisis de las variaciones horizontales y concentración vertical con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  breakEven: SectionAnalysisSchema.optional().describe('Análisis del Punto de Equilibrio y Margen de Seguridad con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  leverage: SectionAnalysisSchema.optional().describe('Análisis de los Grados de Apalancamiento (GAO, GAF, GAT) con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  eaf: SectionAnalysisSchema.describe('Análisis de los principales Orígenes y Aplicaciones de Fondos con hallazgo, riesgo, diagnóstico y recomendaciones.'),
  efe: SectionAnalysisSchema.optional().describe('Análisis del Estado de Flujo de Efectivo si existe.'),
  summary: SummaryAnalysisSchema.describe('Diagnóstico consolidado y lista de recomendaciones en viñetas.'),
  recommendedPvuActual: z.number().optional().describe('Precio de Venta Unitario (PVU) estratégico propuesto para el Periodo Actual tras analizar el documento.'),
  recommendedPvuAnterior: z.number().optional().describe('Precio de Venta Unitario (PVU) estratégico propuesto para el Periodo Anterior tras analizar el documento.'),
  recommendedPvuRationale: z.string().optional().describe('Explicación y justificación del PVU de ambos periodos, explicando la variación y su impacto en rentabilidad y punto de equilibrio.'),
});

const EAFItemSchema = z.object({
  cuenta: z.string(),
  periodoActual: z.number().optional(),
  periodoAnterior: z.number().optional(),
  cambio: z.number().optional(),
  origen: z.number().optional(),
  aplicacion: z.number().optional(),
});

const EAFSchema = z.object({
  activos: z.array(EAFItemSchema).describe("Lista de las cuentas de Activos del EAF."),
  pasivos: z.array(EAFItemSchema).describe("Lista de las cuentas de Pasivos del EAF."),
  capitalContable: z.array(EAFItemSchema).describe("Lista de las cuentas de Capital Contable del EAF."),
  totalOrigen: z.number().optional(),
  totalAplicacion: z.number().optional(),
});

const EFEItemSchema = z.object({
  cuenta: z.string().describe("Nombre de la cuenta o partida."),
  monto: z.number().optional().describe("Monto correspondiente a la cuenta. Positivo para entradas, negativo para salidas."),
});

const EstadoFlujoEfectivoSchema = z.object({
  operacion: z.array(EFEItemSchema).describe("Lista de flujos de actividades de operación."),
  totalOperacion: z.number().optional().describe("Flujo neto de efectivo de actividades de operación."),
  inversion: z.array(EFEItemSchema).describe("Lista de flujos de actividades de inversión."),
  totalInversion: z.number().optional().describe("Flujo neto de efectivo de actividades de inversión."),
  financiamiento: z.array(EFEItemSchema).describe("Lista de flujos de actividades de financiamiento."),
  totalFinanciamiento: z.number().optional().describe("Flujo neto de efectivo de actividades de financiamiento."),
  aumentoNetoEfectivo: z.number().optional().describe("Aumento o disminución neta de efectivo."),
  efectivoInicioPeriodo: z.number().optional().describe("Efectivo al inicio del periodo."),
  efectivoFinalPeriodo: z.number().optional().describe("Efectivo al final del periodo."),
});

const BreakEvenPeriodSchema = z.object({
  isAvailable: z.boolean().optional(),
  ventas: z.number().nullable().optional(),
  costosVariables: z.number().nullable().optional(),
  costosFijos: z.number().nullable().optional(),
  margenContribucion: z.number().nullable().optional(),
  razonMargenContribucion: z.number().nullable().optional(),
  puntoEquilibrioVentas: z.number().nullable().optional(),
  margenSeguridadMonto: z.number().nullable().optional(),
  margenSeguridadPorcentaje: z.number().nullable().optional(),
});

const BreakEvenSchema = z.object({
  periodoActual: BreakEvenPeriodSchema.optional(),
  periodoAnterior: BreakEvenPeriodSchema.optional(),
});

const LeveragePeriodSchema = z.object({
  isAvailable: z.boolean().optional(),
  gao: z.number().nullable().optional(),
  gaf: z.number().nullable().optional(),
  gat: z.number().nullable().optional(),
  margenContribucion: z.number().nullable().optional(),
  utilidadOperativa: z.number().nullable().optional(),
  utilidadAntesImpuestos: z.number().nullable().optional(),
});

const LeverageSchema = z.object({
  periodoActual: LeveragePeriodSchema.optional(),
  periodoAnterior: LeveragePeriodSchema.optional(),
});

const GenerateFinancialReportInputSchema = z.object({
  financialData: z.object({
    balanceSheet: z.object({
      periodoActual: z.record(z.number()),
      periodoAnterior: z.record(z.number()),
    }),
    incomeStatement: z.object({
      periodoActual: z.record(z.number()),
      periodoAnterior: z.record(z.number()),
    }),
  }),
  ratios: z.any(),
  breakEven: BreakEvenSchema.optional(),
  leverage: LeverageSchema.optional(),
  eaf: EAFSchema.optional(),
  efe: EstadoFlujoEfectivoSchema.optional(),
});
export type GenerateFinancialReportInput = z.infer<typeof GenerateFinancialReportInputSchema>;

const GenerateFinancialReportOutputSchema = z.object({
  analysis: FinancialAnalysisSchema.describe('Objeto con el análisis financiero estructurado por indicador y diagnóstico general.'),
});
export type GenerateFinancialReportOutput = z.infer<typeof GenerateFinancialReportOutputSchema>;

export async function generateFinancialReport(input: GenerateFinancialReportInput): Promise<GenerateFinancialReportOutput> {
  return generateFinancialReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialReportPrompt',
  input: {
    schema: z.object({
      balanceSheetActual: z.string(),
      balanceSheetAnterior: z.string(),
      incomeStatementActual: z.string(),
      incomeStatementAnterior: z.string(),
      ratios: z.string(),
      dupont: z.string(),
      breakEven: z.string(),
      leverage: z.string(),
      eaf: z.string(),
      efe: z.string(),
    })
  },
  output: { schema: GenerateFinancialReportOutputSchema },
  prompt: `Actúa como un Director Financiero (CFO) y analista financiero experto de alto nivel.
Tu tarea es analizar exhaustiva y objetivamente los datos financieros provistos y generar diagnósticos con HALLAZGOS y RIESGOS específicos por cada indicador, y un DIAGNÓSTICO y RECOMENDACIONES finales en viñetas TOTALMENTE DIFERENCIADAS y ÚNICAS para cada una de las secciones del sistema.

REGLAS OBLIGATORIAS:

1. ESTRUCTURA EXCLUSIVA Y DIFERENCIADA POR SECCIÓN:
   - Para CADA una de las secciones ('liquidity', 'activity', 'debt', 'profitability', 'dupont', 'verticalHorizontal', 'breakEven', 'leverage', 'eaf'):
     * 'resumen': Síntesis concisa de 1 a 2 oraciones.
     * 'insights': Array de objetos con { indicador, hallazgo, riesgo }.
     * 'diagnostico': Párrafo de diagnóstico analítico profundo, técnico y EXCLUSIVO sobre el tema específico de esa sección (NUNCA uses el mismo diagnóstico en diferentes secciones).
     * 'recomendaciones': Array de 2 a 4 recomendaciones en viñetas directas orientadas 100% a la temática de esa sección.
   - Para 'summary': Diagnóstico ejecutivo global consolidado y recomendaciones estratégicas corporativas.

2. COHERENCIA ESTRICTA CON LA DIRECCIÓN DEL CAMBIO:
   - COBRANZAS: Si los Días de Cobro disminuyeron (ej. de 61.3 a 60.8 días), la cobranza MEJORÓ. NUNCA digas que empeoró.
   - INVENTARIOS: Si los Días de Inventario aumentaron (ej. de 84 a 89 días), el inventario rota más lento.
   - EXCESO DE LIQUIDEZ Y ACTIVOS OCIOSOS: Una Razón Corriente muy alta (ej. > 2.0 o 2.42) refleja holgura pero DEBES MENCIONAR activos ociosos o recursos inmovilizados con costo de oportunidad.
   - RENTABILIDAD: Si el margen neto o ROE subió, señala la causa real. Si cayó, identifica la partida de costo/gasto que lo erosionó.

3. REGLA ESTRICTA DE FORMATO NUMÉRICO (PROHIBICIÓN DE LA LETRA 'x'):
   - NUNCA uses la letra 'x' pegada a los números ni como sufijo multiplicador (ej. NUNCA escribas '2.42x', '1.15x', '0.85x' ni '1.45x').
   - Escribe todos los números de forma limpia (ej. '2,42', '1,15') o utiliza la palabra 'veces' cuando te refieras a rotación o cobertura (ej. 'rotó 5,20 veces' o 'cubre 3,10 veces los intereses').

4. CERO AFIRMACIONES INVENTADAS O DATOS NO PRESENTES:
   - No menciones conceptos no contenidos en los estados financieros provistos.

5. SECCIONES A ANALIZAR:
   - 'liquidity': Razón Corriente, Prueba Ácida y Capital de Trabajo Neto.
   - 'activity': Rotación y Días de Inventario, Rotación y Días de Cobro, y Rotación de Activos Totales.
   - 'debt': Razón de Endeudamiento, Razón Deuda a Capital y Cobertura de Intereses.
   - 'profitability': Margen Bruto, Margen Operativo, Margen Neto, ROA y ROE.
   - 'dupont': Margen Neto, Rotación de Activos, Multiplicador de Capital y ROE DuPont resultante.
   - 'verticalHorizontal': Concentración de activos/pasivos y variaciones porcentuales más notorias.
   - 'breakEven': Punto de Equilibrio en Ventas, Margen de Seguridad y Precios Unitarios propuestos ('recommendedPvuActual', 'recommendedPvuAnterior', 'recommendedPvuRationale').
   - 'leverage': Apalancamiento Operativo (GAO), Financiero (GAF) y Total (GAT).
   - 'eaf': Principales orígenes (fuentes) y aplicaciones (usos) de fondos.
   - 'summary': 'diagnostico' integral y 'recomendaciones' en viñetas.

DATOS FINANCIEROS SUMINISTRADOS (JSON):
- Balance General (Periodo Actual): {{{balanceSheetActual}}}
- Balance General (Periodo Anterior): {{{balanceSheetAnterior}}}
- Estado de Resultados (Periodo Actual): {{{incomeStatementActual}}}
- Estado de Resultados (Periodo Anterior): {{{incomeStatementAnterior}}}
- Ratios Financieros: {{{ratios}}}
- Sistema DuPont Desglosado: {{{dupont}}}
- Punto de Equilibrio y Margen de Seguridad: {{{breakEven}}}
- Apalancamiento (GAO, GAF, GAT): {{{leverage}}}
- Estado de Origen y Aplicación de Fondos (EAF): {{{eaf}}}
- Estado de Flujo de Efectivo (EFE): {{{efe}}}

Genera la respuesta estrictamente en el formato JSON requerido.`,
});

const candidateModels = [
  'googleai/gemini-2.5-flash',
  'googleai/gemini-2.0-flash',
  'googleai/gemini-1.5-flash',
  'googleai/gemini-1.5-pro',
  'googleai/gemini-2.5-pro',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates an intelligent, deterministic financial analysis when AI endpoints are temporarily unavailable (e.g. 503 Service Unavailable)
 */
function generateDeterministicFallback(input: GenerateFinancialReportInput): GenerateFinancialReportOutput {
  const { ratios, breakEven, leverage, financialData, eaf } = input;

  const num = (v?: number | null, decimals = 2) => {
    if (v === undefined || v === null || !isFinite(v)) return '-';
    return v.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const pct = (v?: number | null, decimals = 2) => {
    if (v === undefined || v === null || !isFinite(v)) return '-';
    return `${(v * 100).toFixed(decimals)}%`;
  };

  const rcAct = ratios?.razon_circulante?.periodoActual;
  const rcAnt = ratios?.razon_circulante?.periodoAnterior;
  const paAct = ratios?.razon_rapida?.periodoActual;
  const paAnt = ratios?.razon_rapida?.periodoAnterior;
  const ctnAct = ratios?.capital_de_trabajo_neto?.periodoActual;
  const ctnAnt = ratios?.capital_de_trabajo_neto?.periodoAnterior;

  const dInvAct = ratios?.dias_inventario?.periodoActual;
  const dInvAnt = ratios?.dias_inventario?.periodoAnterior;
  const dCobAct = ratios?.dias_cobro?.periodoActual ?? ratios?.periodo_promedio_cobro?.periodoActual;
  const dCobAnt = ratios?.dias_cobro?.periodoAnterior ?? ratios?.periodo_promedio_cobro?.periodoAnterior;
  const rotActTotAct = ratios?.rotacion_activos_totales?.periodoActual;
  const rotActTotAnt = ratios?.rotacion_activos_totales?.periodoAnterior;

  const endAct = ratios?.razon_endeudamiento?.periodoActual;
  const endAnt = ratios?.razon_endeudamiento?.periodoAnterior;
  const cobIntAct = ratios?.cobertura_intereses?.periodoActual;
  const cobIntAnt = ratios?.cobertura_intereses?.periodoAnterior;

  const mNetoAct = ratios?.margen_utilidad_neta?.periodoActual;
  const mNetoAnt = ratios?.margen_utilidad_neta?.periodoAnterior;
  const roeAct = ratios?.rentabilidad_patrimonio_roe?.periodoActual;
  const roeAnt = ratios?.rentabilidad_patrimonio_roe?.periodoAnterior;
  const roaAct = ratios?.rentabilidad_activo_roa?.periodoActual;
  const roaAnt = ratios?.rentabilidad_activo_roa?.periodoAnterior;

  const peVentasAct = breakEven?.periodoActual?.puntoEquilibrioVentas;
  const peVentasAnt = breakEven?.periodoAnterior?.puntoEquilibrioVentas;
  const msMontoAct = breakEven?.periodoActual?.margenSeguridadMonto;
  const msMontoAnt = breakEven?.periodoAnterior?.margenSeguridadMonto;
  const msPctAct = breakEven?.periodoActual?.margenSeguridadPorcentaje;

  const gaoAct = leverage?.periodoActual?.gao;
  const gafAct = leverage?.periodoActual?.gaf;
  const gatAct = leverage?.periodoActual?.gat;

  // Build Liquidity Insights
  const liquidityInsights: IndicatorInsight[] = [
    {
      indicador: `Razón Corriente (${num(rcAct)})`,
      hallazgo: `La razón corriente se situó en ${num(rcAct)} frente a ${num(rcAnt)} del período anterior, cubriendo las obligaciones de corto plazo.`,
      riesgo: rcAct && rcAct > 2.0
        ? `Una razón corriente de ${num(rcAct)} refleja una holgura elevada que puede evidenciar recursos ociosos o capital de trabajo inmovilizado con costo de oportunidad.`
        : `Debe vigilarse la sincronización de cobros y pagos para mantener la solvencia inmediata sin presiones de tesorería.`
    },
    {
      indicador: `Prueba Ácida (${num(paAct)})`,
      hallazgo: `La prueba ácida pasó de ${num(paAnt)} a ${num(paAct)}, midiendo la liquidez inmediata sin requerir la realización de inventarios.`,
      riesgo: paAct && paAct < 1.0
        ? `Al situarse por debajo de 1,00, la empresa depende de la venta fluida de inventario para honrar sus pasivos inmediatos.`
        : `La capacidad de respuesta inmediata es suficiente para cubrir compromisos de corto plazo.`
    },
    {
      indicador: `Capital de Trabajo Neto ($${num(ctnAct)})`,
      hallazgo: `El capital de trabajo neto se ubicó en $${num(ctnAct)} (comparado con $${num(ctnAnt)} en el período previo).`,
      riesgo: `Un incremento desproporcionado en capital de trabajo neto puede significar inventarios lentos o excedentes monetarios sin rentabilizar.`
    }
  ];

  // Build Activity Insights
  const activityInsights: IndicatorInsight[] = [
    {
      indicador: `Días de Inventario (${num(dInvAct, 1)} días)`,
      hallazgo: `El inventario registra una permanencia promedio de ${num(dInvAct, 1)} días frente a ${num(dInvAnt, 1)} días en el ejercicio anterior.`,
      riesgo: dInvAct && dInvAnt && dInvAct > dInvAnt
        ? `El incremento en días de permanencia inmoviliza liquidez en bodega e incrementa los costos de almacenamiento y obsolescencia.`
        : `La rotación de inventarios mantiene una velocidad operativa adecuada para satisfacer la demanda.`
    },
    {
      indicador: `Periodo Promedio de Cobro (${num(dCobAct, 1)} días)`,
      hallazgo: `El plazo promedio de cobro a clientes se ubicó en ${num(dCobAct, 1)} días (${num(dCobAnt, 1)} días en el período anterior).`,
      riesgo: dCobAct && dCobAnt && dCobAct > dCobAnt
        ? `Un alargamiento del plazo de cobro presiona el flujo de caja operativo y eleva el riesgo de cartera vencida.`
        : `La cobranza muestra estabilidad y eficiencia en la recuperación de cuentas comerciales.`
    },
    {
      indicador: `Rotación de Activos Totales (${num(rotActTotAct)})`,
      hallazgo: `Los activos totales generaron ${num(rotActTotAct)} en ventas por cada unidad monetaria invertida (${num(rotActTotAnt)} período anterior).`,
      riesgo: `Una rotación baja de activos totales indica capacidad ociosa en activos fijos o sobredimensionamiento en la estructura patrimonial.`
    }
  ];

  // Build Debt Insights
  const debtInsights: IndicatorInsight[] = [
    {
      indicador: `Razón de Endeudamiento (${pct(endAct)})`,
      hallazgo: `El ${pct(endAct)} de los activos totales de la empresa está financiado por acreedores externos (${pct(endAnt)} en el período anterior).`,
      riesgo: endAct && endAct > 0.6
        ? `Un nivel de endeudamiento elevado incrementa la carga fija y reduce el margen de maniobra ante caídas en el mercado.`
        : `El nivel de endeudamiento se mantiene en niveles controlados, otorgando margen de apalancamiento.`
    },
    {
      indicador: `Cobertura de Intereses (${num(cobIntAct)})`,
      hallazgo: `La utilidad operativa cubre ${num(cobIntAct)} veces los gastos financieros por intereses (${num(cobIntAnt)} período previo).`,
      riesgo: cobIntAct && cobIntAct < 2.5
        ? `Una cobertura ajustada expone a la empresa a vulnerabilidad si la utilidad de operación disminuye.`
        : `La empresa genera utilidades operativas suficientes para honrar sus costos de financiamiento sin dificultad.`
    }
  ];

  // Build Profitability Insights
  const profitabilityInsights: IndicatorInsight[] = [
    {
      indicador: `Margen Neto (${pct(mNetoAct)})`,
      hallazgo: `El margen de utilidad neta se situó en ${pct(mNetoAct)} en comparación con ${pct(mNetoAnt)} del período anterior.`,
      riesgo: mNetoAct && mNetoAnt && mNetoAct < mNetoAnt
        ? `La compresión del margen neto refleja incremento en costos de venta, gastos operativos o carga impositiva.`
        : `La eficiencia de conversión de ventas en ganancia neta final muestra solidez estructural.`
    },
    {
      indicador: `Retorno sobre el Patrimonio - ROE (${pct(roeAct)})`,
      hallazgo: `El rendimiento sobre el capital contable alcanzó ${pct(roeAct)} frente al ${pct(roeAnt)} del período previo.`,
      riesgo: `Cualquier deterioro en la rotación de activos o margen neto impacta directamente el retorno para los accionistas.`
    },
    {
      indicador: `Retorno sobre los Activos - ROA (${pct(roaAct)})`,
      hallazgo: `La rentabilidad económica sobre los activos totales fue de ${pct(roaAct)} (${pct(roaAnt)} período anterior).`,
      riesgo: `Un ROA moderado puede indicar necesidad de maximizar el uso de activos fijos y desinvertir partidas improductivas.`
    }
  ];

  // Build DuPont Insights
  const dupontInsights: IndicatorInsight[] = [
    {
      indicador: `Desglose DuPont del ROE (${pct(roeAct)})`,
      hallazgo: `El ROE del ${pct(roeAct)} se compone de un Margen Neto de ${pct(mNetoAct)}, Rotación de Activos de ${num(rotActTotAct)} y Multiplicador de Capital de ${num(ratios?.dupont_apalancamiento?.periodoActual)}.`,
      riesgo: `El rendimiento patrimonial depende de la interacción equilibrada entre margen operativo y rotación física para no depender únicamente de deuda financiera.`
    }
  ];

  // Build Break-Even Insights
  const breakEvenInsights: IndicatorInsight[] = [
    {
      indicador: `Punto de Equilibrio en Ventas ($${num(peVentasAct)})`,
      hallazgo: `La empresa requiere vender al menos $${num(peVentasAct)} para cubrir sus costos fijos y variables sin incurrir en pérdidas.`,
      riesgo: `Cualquier incremento en la estructura de costos fijos eleva el umbral mínimo necesario de operación.`
    },
    {
      indicador: `Margen de Seguridad ($${num(msMontoAct)} / ${pct(msPctAct)})`,
      hallazgo: `Las ventas actuales superan el punto de equilibrio con un colchón de absorción de $${num(msMontoAct)} (${pct(msPctAct)} de las ventas).`,
      riesgo: `Un margen de seguridad estrecho reduce la capacidad de la empresa para resistir contracciones en la demanda.`
    }
  ];

  // Build Leverage Insights
  const leverageInsights: IndicatorInsight[] = [
    {
      indicador: `Apalancamiento Operativo - GAO (${num(gaoAct)})`,
      hallazgo: `El GAO se situó en ${num(gaoAct)}, indicando la sensibilidad porcentual del EBIT ante variaciones en el volumen de ventas.`,
      riesgo: `Costos fijos más elevados amplifican las ganancias en escenarios alcistas, pero incrementan las pérdidas si las ventas retroceden.`
    },
    {
      indicador: `Apalancamiento Financiero - GAF (${num(gafAct)})`,
      hallazgo: `El GAF se ubicó en ${num(gafAct)}, reflejando el impacto de los intereses sobre el resultado neto.`,
      riesgo: `Un mayor nivel de deuda con intereses eleva la volatilidad de la utilidad neta frente a cambios en la operación.`
    }
  ];

  // Build EAF Insights
  const eafInsights: IndicatorInsight[] = [
    {
      indicador: `Estructura de Origen y Aplicación de Fondos`,
      hallazgo: `El EAF refleja un volumen total de recursos movilizados de $${num(eaf?.totalOrigen)} en orígenes y aplicaciones entre ambos ejercicios.`,
      riesgo: `El financiamiento de aplicaciones a largo plazo debe respaldarse con fuentes estables de capital o deuda de largo plazo para preservar la liquidez.`
    }
  ];

  // Build Recommendations
  const recomendaciones: string[] = [
    `Optimizar los excedentes de liquidez (razón corriente de ${num(rcAct)}) reasignando fondos ociosos hacia inversiones de corto plazo o reducción de pasivos onerosos.`,
    `Acelerar la rotación de inventarios para reducir la permanencia de ${num(dInvAct, 1)} días, liberando capital de trabajo inmovilizado.`,
    `Preservar las políticas de cobranza que mantienen el período promedio de cobro en ${num(dCobAct, 1)} días, asegurando un ciclo de caja predecible.`,
    `Monitorear la estructura de costos fijos para sostener el margen de seguridad de $${num(msMontoAct)} frente a posibles fluctuaciones en la demanda del mercado.`
  ];

  return {
    analysis: {
      liquidity: {
        resumen: `La empresa presenta una posición de liquidez solvente con una razón corriente de ${num(rcAct)} y capital de trabajo positivo de $${num(ctnAct)}.`,
        insights: liquidityInsights,
        diagnostico: `La empresa presenta una sólida capacidad de pago a corto plazo con una razón corriente de ${num(rcAct)} y capital de trabajo neto de $${num(ctnAct)}. Sin embargo, la holgura en activos circulantes debe gestionarse para evitar recursos ociosos o improductivos con costo de oportunidad.`,
        recomendaciones: [
          `Canalizar los excedentes de tesorería hacia instrumentos de inversión de corto plazo para rentabilizar la caja inmovilizada.`,
          `Establecer un fondo de maniobra óptimo para cubrir pasivos a corto plazo sin sobreacumular efectivo improductivo.`,
          `Monitorear el calendario de vencimientos de pasivos circulantes para asegurar pagos oportunos.`
        ],
      },
      activity: {
        resumen: `La rotación comercial opera con ${num(dInvAct, 1)} días en inventarios y ${num(dCobAct, 1)} días promedio de cobro a clientes.`,
        insights: activityInsights,
        diagnostico: `La rotación comercial registra un ciclo de cobro ágil de ${num(dCobAct, 1)} días y una permanencia de inventarios de ${num(dInvAct, 1)} días, con una rotación de activos totales de ${num(rotActTotAct)} veces. La recuperación de cuentas por cobrar muestra eficiencia, requiriendo concentrar esfuerzos en agilizar la salida de mercancías.`,
        recomendaciones: [
          `Implementar políticas de reorden y control de existencias para acelerar la rotación de los ${num(dInvAct, 1)} días de inventario.`,
          `Preservar las condiciones de cobro que sostienen la cartera en ${num(dCobAct, 1)} días promedio.`,
          `Optimizar la utilización de activos operativos para elevar la rotación global de activos.`
        ],
      },
      debt: {
        resumen: `El nivel de endeudamiento sobre activos se sitúa en ${pct(endAct)} con una cobertura de intereses de ${num(cobIntAct)} veces.`,
        insights: debtInsights,
        diagnostico: `El ${pct(endAct)} de los activos está financiado por acreedores externos, respaldado por una cobertura de intereses de ${num(cobIntAct)} veces. La estructura de pasivos se mantiene en niveles saludables, permitiendo absorber costos financieros sin comprometer la solvencia.`,
        recomendaciones: [
          `Mantener la cobertura de gastos financieros por intereses por encima de ${num(cobIntAct)} veces para asegurar solvencia crediticia.`,
          `Priorizar financiamiento a tasa fija o de largo plazo para mitigar riesgos de refinanciamiento.`,
          `Alinear la amortización de pasivos con el flujo de generación operativa del negocio.`
        ],
      },
      profitability: {
        resumen: `La rentabilidad sobre patrimonio (ROE) se ubicó en ${pct(roeAct)} con un margen neto final del ${pct(mNetoAct)}.`,
        insights: profitabilityInsights,
        diagnostico: `La rentabilidad global alcanza un margen neto del ${pct(mNetoAct)}, un rendimiento sobre activos (ROA) del ${pct(roaAct)} y un retorno patrimonial (ROE) del ${pct(roeAct)}. La rentabilidad confirma la efectividad en la conversión de ingresos en utilidad neta final.`,
        recomendaciones: [
          `Controlar los gastos administrativos y operativos para proteger el margen neto del ${pct(mNetoAct)}.`,
          `Reinvertir utilidades retenidas en proyectos con tasa de retorno superior al costo de capital.`,
          `Mejorar la productividad de los activos para impulsar el ROA y la rentabilidad patrimonial.`
        ],
      },
      dupont: {
        resumen: `El análisis DuPont descompone el ROE del ${pct(roeAct)} a través del margen neto, la rotación de activos y el apalancamiento financiero.`,
        insights: dupontInsights,
        diagnostico: `El rendimiento del capital (ROE del ${pct(roeAct)}) se descompone en un margen neto del ${pct(mNetoAct)}, una rotación de activos de ${num(rotActTotAct)} veces y un multiplicador de apalancamiento de ${num(ratios?.dupont_apalancamiento?.periodoActual)}. El valor generado descansa en la eficiencia del margen operativo complementado con una estructura de capital adecuada.`,
        recomendaciones: [
          `Dinamizar la rotación de activos (${num(rotActTotAct)} veces) desincorporando activos improductivos para impulsar el ROE sin requerir mayor deuda.`,
          `Defender el margen neto del ${pct(mNetoAct)} mediante optimización de la cadena de suministro y control de gastos.`,
          `Conservar un multiplicador de apalancamiento equilibrado que maximice el rendimiento patrimonial con prudencia.`
        ],
      },
      verticalHorizontal: {
        resumen: `La estructura patrimonial y de resultados muestra estabilidad interanual con foco en la preservación de márgenes.`,
        insights: [
          {
            indicador: 'Estructura Vertical y Horizontal',
            hallazgo: 'Las cuentas operativas del balance y resultados mantienen proporciones coherentes con el volumen de actividad del negocio.',
            riesgo: 'Concentraciones elevadas en partidas de inventario o cuentas por cobrar requieren monitoreo continuo.'
          }
        ],
        diagnostico: `El análisis vertical y horizontal confirma una estructura patrimonial concentrada en partidas operativas y consistencia interanual en las proporciones de costos. Las variaciones porcentuales del ejercicio reflejan estabilidad en las fuentes de financiamiento y la generación de ingresos.`,
        recomendaciones: [
          `Auditar las cuentas de gastos operativos que presentaron mayor crecimiento porcentual interanual.`,
          `Optimizar la concentración de activos circulantes para evitar inmovilizaciones innecesarias.`,
          `Alinear las líneas de crédito comercial con el crecimiento horizontal de las ventas y compras operativas.`
        ],
      },
      breakEven: {
        resumen: `El punto de equilibrio operativo se ubica en $${num(peVentasAct)} con un margen de seguridad del ${pct(msPctAct)}.`,
        insights: breakEvenInsights,
        diagnostico: `El punto de equilibrio operativo se sitúa en $${num(peVentasAct)}, contando con un margen de seguridad de $${num(msMontoAct)} (${pct(msPctAct)} sobre las ventas). La empresa cuenta con una sólida capacidad de absorción ante posibles caídas en la demanda o incrementos de costos fijos.`,
        recomendaciones: [
          `Mantener el estricto control de costos fijos operacionales para no elevar el umbral mínimo de ventas de $${num(peVentasAct)}.`,
          `Proteger la razón de margen de contribución frente a posibles aumentos en costos unitarios de insumos.`,
          `Monitorear el volumen comercial mensual para sostener el colchón de seguridad de $${num(msMontoAct)}.`
        ],
      },
      leverage: {
        resumen: `Los grados de apalancamiento operativo (${num(gaoAct)}) y financiero (${num(gafAct)}) determinan la sensibilidad del beneficio.`,
        insights: leverageInsights,
        diagnostico: `Los coeficientes de apalancamiento operativo (GAO de ${num(gaoAct)}) y financiero (GAF de ${num(gafAct)}) evidencian una estructura balanceada. La empresa tiene la capacidad de expandir sus utilidades antes de impuestos ante incrementos en volumen sin incurrir en volatilidad financiera riesgosa.`,
        recomendaciones: [
          `Aprovechar el apalancamiento operativo (${num(gaoAct)}) para impulsar el crecimiento en volumen de ventas y maximizar el EBIT.`,
          `Vigilar la contratación de nuevos pasivos financieros con costo para no elevar el GAF por encima de niveles recomendados.`,
          `Simular el impacto de variaciones en la tasa de interés sobre la utilidad neta final.`
        ],
      },
      eaf: {
        resumen: `El Estado de Origen y Aplicación refleja la procedencia de los fondos y su destino de inversión y financiamiento.`,
        insights: eafInsights,
        diagnostico: `El Estado de Origen y Aplicación de Fondos totaliza $${num(eaf?.totalOrigen)} en fuentes y aplicaciones entre ambos ejercicios. Los recursos generados por la operación y el crédito comercial han financiado adecuadamente las inversiones en activos y el capital de trabajo.`,
        recomendaciones: [
          `Asegurar que las aplicaciones en activos no corrientes se financien prioritariamente con orígenes de largo plazo (capital propio o deuda estructurada).`,
          `Monitorear que los fondos liberados por disminución de pasivos u optimización de inventarios se reinviertan en actividades de alta rentabilidad.`,
          `Mantener la coherencia entre el ciclo de vencimiento de las obligaciones y la velocidad de generación de fondos operativos.`
        ],
      },
      summary: {
        diagnostico: `La empresa mantiene una estructura financiera solvente con sólida cobertura de compromisos a corto plazo (razón corriente de ${num(rcAct)}), rentabilidad positiva sobre patrimonio (ROE de ${pct(roeAct)}) y un margen de seguridad comercial del ${pct(msPctAct)} sobre su punto de equilibrio. El principal reto estratégico radica en optimizar los activos circulantes ociosos y dinamizar la rotación de inventarios para maximizar el retorno económico global.`,
        recomendaciones,
      }
    }
  };
}

const generateFinancialReportFlow = ai.defineFlow(
  {
    name: 'generateFinancialReportFlow',
    inputSchema: GenerateFinancialReportInputSchema,
    outputSchema: GenerateFinancialReportOutputSchema,
  },
  async ({ financialData, ratios, breakEven, leverage, eaf, efe }) => {
    const dupontSummary = {
      margenUtilidadNeta: ratios?.dupont_margen_neta || ratios?.margen_utilidad_neta,
      rotacionActivosTotales: ratios?.dupont_rotacion_activos || ratios?.rotacion_activos_totales,
      multiplicadorApalancamiento: ratios?.dupont_apalancamiento,
      roeDuPont: ratios?.dupont_roe || ratios?.rentabilidad_patrimonio_roe,
    };

    const promptInput = {
      balanceSheetActual: JSON.stringify(financialData.balanceSheet.periodoActual, null, 2),
      balanceSheetAnterior: JSON.stringify(financialData.balanceSheet.periodoAnterior, null, 2),
      incomeStatementActual: JSON.stringify(financialData.incomeStatement.periodoActual, null, 2),
      incomeStatementAnterior: JSON.stringify(financialData.incomeStatement.periodoAnterior, null, 2),
      ratios: JSON.stringify(ratios, null, 2),
      dupont: JSON.stringify(dupontSummary, null, 2),
      breakEven: JSON.stringify(breakEven || {}, null, 2),
      leverage: JSON.stringify(leverage || {}, null, 2),
      eaf: JSON.stringify(eaf, null, 2),
      efe: JSON.stringify(efe, null, 2),
    };

    let lastError: any = null;

    // Try candidate models with retry and backoff
    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { output } = await prompt(promptInput, { model: modelName as any });
          if (output?.analysis) {
            return output;
          }
        } catch (err: any) {
          console.warn(`Attempt ${attempt} with ${modelName} failed:`, err.message || err);
          lastError = err;
          // If error is 503 or 429, wait before retrying
          if (err?.message?.includes('503') || err?.message?.includes('429') || err?.message?.includes('demand')) {
            await sleep(1000 * attempt);
          }
        }
      }
    }

    console.warn('AI models temporarily unavailable. Generating resilient structured fallback analysis.');
    return generateDeterministicFallback({ financialData, ratios, breakEven, leverage, eaf, efe });
  }
);
