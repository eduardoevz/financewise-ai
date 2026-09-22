/**
 * Financial Audit & Completeness Diagnostic Engine
 * Inspects the standardized model to detect any missing indispensable accounts
 * and generates structured, descriptive warnings with actionable guidance.
 */

import {
  StandardizedFinancialModel,
  StandardizedPeriod,
  standardizeFinancialStatements,
} from './financial-standardizer';

export type AuditSeverity = 'error' | 'warning' | 'info';

export interface FinancialValidationWarning {
  id: string;
  module: 'dupont' | 'breakEven' | 'leverage' | 'liquidity' | 'debt' | 'activity' | 'profitability' | 'balanceSheet';
  moduleTitle: string;
  severity: AuditSeverity;
  missingAccount: string;
  message: string;
  remedy: string;
}

export interface FinancialAuditReport {
  isValid: boolean;
  canCalculateDuPont: boolean;
  canCalculateBreakEven: boolean;
  canCalculateLeverage: boolean;
  warnings: FinancialValidationWarning[];
  summary: {
    totalWarnings: number;
    errors: number;
    warnings: number;
    info: number;
  };
  balanceBalanceSquare: {
    periodoActual: {
      activoTotal: number;
      pasivoMasCapital: number;
      diferencia: number;
      isCuadrado: boolean;
    };
    periodoAnterior: {
      activoTotal: number;
      pasivoMasCapital: number;
      diferencia: number;
      isCuadrado: boolean;
    };
  };
}

/**
 * Audits a single period for module completeness
 */
function auditPeriodCompleteness(
  period: StandardizedPeriod,
  periodName: 'Actual' | 'Anterior',
  warnings: FinancialValidationWarning[]
) {
  const bs = period.balanceSheet;
  const is = period.incomeStatement;

  // 1. Audit DuPont Analysis
  if (is.ventas === 0) {
    warnings.push({
      id: `dupont-ventas-${periodName.toLowerCase()}`,
      module: 'dupont',
      moduleTitle: 'Sistema DuPont',
      severity: 'error',
      missingAccount: 'Ventas Netas / Ingresos',
      message: `En el período ${periodName}, no se detectaron Ventas Netas. No se puede calcular el Margen Neto ni la Rotación de Activos para el ROE DuPont.`,
      remedy: 'Verifica que tu Excel incluya una fila como "Ventas", "Ventas Netas", "Ingresos Operacionales" o "Facturación".'
    });
  }

  if (bs.activoTotal === 0) {
    warnings.push({
      id: `dupont-activo-${periodName.toLowerCase()}`,
      module: 'dupont',
      moduleTitle: 'Sistema DuPont',
      severity: 'error',
      missingAccount: 'Total Activo',
      message: `En el período ${periodName}, no se detectó el Activo Total. No se puede calcular la Rotación de Activos ni el Multiplicador de Capital.`,
      remedy: 'Asegúrate de incluir las cuentas de Activos o una fila "Total Activo" en el Balance General.'
    });
  }

  if (bs.capitalContableTotal === 0) {
    warnings.push({
      id: `dupont-capital-${periodName.toLowerCase()}`,
      module: 'dupont',
      moduleTitle: 'Sistema DuPont',
      severity: 'warning',
      missingAccount: 'Capital Contable / Patrimonio',
      message: `En el período ${periodName}, no se detectó el Capital Contable. El Multiplicador de Apalancamiento y el ROE no se pueden calcular directamente.`,
      remedy: 'Incluye filas como "Capital Social", "Utilidades Retenidas" o "Total Patrimonio" en tu archivo.'
    });
  }

  if (is.utilidadNeta === 0 && is.utilidadAntesImpuestos === 0 && is.utilidadOperativa === 0) {
    warnings.push({
      id: `dupont-utilidad-${periodName.toLowerCase()}`,
      module: 'dupont',
      moduleTitle: 'Sistema DuPont / Rentabilidad',
      severity: 'warning',
      missingAccount: 'Utilidad Neta / Resultado del Ejercicio',
      message: `En el período ${periodName}, no se identificó la Utilidad Neta en el Estado de Resultados.`,
      remedy: 'Verifica que el Estado de Resultados incluya una línea de "Utilidad Neta", "Resultado del Ejercicio" o "Ganancia Neta".'
    });
  }

  // 2. Audit Break-Even Analysis
  if (is.ventas > 0) {
    if (is.costoVentas === 0) {
      warnings.push({
        id: `be-costoventas-${periodName.toLowerCase()}`,
        module: 'breakEven',
        moduleTitle: 'Punto de Equilibrio',
        severity: 'warning',
        missingAccount: 'Costos Variables (Costo de Ventas)',
        message: `En el período ${periodName}, no se encontró "Costo de Ventas". Se asumirá un margen de contribución del 100% o estructura estimada.`,
        remedy: 'Incluye una cuenta como "Costo de Ventas", "Costo de lo Vendido" o "Costos Variables".'
      });
    }

    if (is.gastosOperativosTotal === 0) {
      warnings.push({
        id: `be-gastosfijos-${periodName.toLowerCase()}`,
        module: 'breakEven',
        moduleTitle: 'Punto de Equilibrio',
        severity: 'warning',
        missingAccount: 'Costos y Gastos Fijos de Operación',
        message: `En el período ${periodName}, no se detectaron Gastos Operativos fijos. El punto de equilibrio calculado será $0.`,
        remedy: 'Añade cuentas como "Gastos de Administración", "Gastos de Venta" o "Gastos Operativos".'
      });
    }
  }

  // 3. Audit Leverage (Apalancamiento)
  if (is.utilidadOperativa !== 0 && is.gastosFinancieros === 0) {
    warnings.push({
      id: `lev-gastosfinancieros-${periodName.toLowerCase()}`,
      module: 'leverage',
      moduleTitle: 'Apalancamiento Financiero (GAF)',
      severity: 'info',
      missingAccount: 'Gastos Financieros / Intereses',
      message: `En el período ${periodName}, no se reportaron Gastos Financieros (intereses de deuda). El GAF se asume neutro (1.00x).`,
      remedy: 'Si la empresa paga intereses por deuda, incluye una línea como "Gastos Financieros" o "Intereses".'
    });
  }

  // 4. Audit Liquidity
  if (bs.activoCirculanteTotal > 0 && bs.pasivoCirculanteTotal === 0) {
    warnings.push({
      id: `liq-pasivocirculante-${periodName.toLowerCase()}`,
      module: 'liquidity',
      moduleTitle: 'Razones de Liquidez',
      severity: 'warning',
      missingAccount: 'Pasivo Circulante / Corto Plazo',
      message: `En el período ${periodName}, no se detectaron Pasivos Circulantes para calcular la Razón Corriente y Prueba Ácida.`,
      remedy: 'Incluye deudas a corto plazo como "Cuentas por Pagar", "Proveedores" o "Documentos por Pagar".'
    });
  }
}

/**
 * Audits the full standardized model and returns a diagnostic report
 */
export function auditFinancialModel(
  input: StandardizedFinancialModel | { balanceSheet?: any[]; incomeStatement?: any[] }
): FinancialAuditReport {
  const model: StandardizedFinancialModel =
    'periodoActual' in input && input.periodoActual
      ? (input as StandardizedFinancialModel)
      : standardizeFinancialStatements({
          balanceSheet: 'balanceSheet' in input ? input.balanceSheet : undefined,
          incomeStatement: 'incomeStatement' in input ? input.incomeStatement : undefined,
        });

  const warnings: FinancialValidationWarning[] = [];

  const actBs = model.periodoActual.balanceSheet;
  const antBs = model.periodoAnterior.balanceSheet;

  // Audit Actual Period
  auditPeriodCompleteness(model.periodoActual, 'Actual', warnings);

  // Audit Anterior Period if present
  if (model.metadata.hasPeriodoAnterior) {
    auditPeriodCompleteness(model.periodoAnterior, 'Anterior', warnings);
  }

  // Check Balance Sheet Equality (Activo Total vs Pasivo + Capital)
  const diffAct = Math.abs(actBs.activoTotal - actBs.pasivoYCapitalTotal);
  const isCuadradoAct = actBs.activoTotal > 0 && diffAct < 1.0;

  const diffAnt = Math.abs(antBs.activoTotal - antBs.pasivoYCapitalTotal);
  const isCuadradoAnt = antBs.activoTotal > 0 && diffAnt < 1.0;

  if (actBs.activoTotal > 0 && !isCuadradoAct && diffAct > 50) {
    warnings.push({
      id: 'balance-descuadrado-actual',
      module: 'balanceSheet',
      moduleTitle: 'Cuadre del Balance General',
      severity: 'warning',
      missingAccount: 'Descuadre Activo vs Pasivo + Capital',
      message: `El Balance General del período Actual presenta una discrepancia de $${diffAct.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (Activo: $${actBs.activoTotal.toLocaleString('es-ES')} vs Pasivo+Capital: $${actBs.pasivoYCapitalTotal.toLocaleString('es-ES')}).`,
      remedy: 'Revisa que todas las partidas de pasivo y capital contable (incluyendo utilidades acumuladas y resultado del ejercicio) estén registradas.'
    });
  }

  const errors = warnings.filter(w => w.severity === 'error').length;
  const warnCount = warnings.filter(w => w.severity === 'warning').length;
  const infoCount = warnings.filter(w => w.severity === 'info').length;

  const canCalculateDuPont = model.periodoActual.incomeStatement.ventas > 0 && model.periodoActual.balanceSheet.activoTotal > 0;
  const canCalculateBreakEven = model.periodoActual.incomeStatement.ventas > 0;
  const canCalculateLeverage = model.periodoActual.incomeStatement.utilidadOperativa !== 0;

  return {
    isValid: errors === 0,
    canCalculateDuPont,
    canCalculateBreakEven,
    canCalculateLeverage,
    warnings,
    summary: {
      totalWarnings: warnings.length,
      errors,
      warnings: warnCount,
      info: infoCount,
    },
    balanceBalanceSquare: {
      periodoActual: {
        activoTotal: actBs.activoTotal,
        pasivoMasCapital: actBs.pasivoYCapitalTotal,
        diferencia: diffAct,
        isCuadrado: isCuadradoAct,
      },
      periodoAnterior: {
        activoTotal: antBs.activoTotal,
        pasivoMasCapital: antBs.pasivoYCapitalTotal,
        diferencia: diffAnt,
        isCuadrado: isCuadradoAnt,
      }
    }
  };
}
