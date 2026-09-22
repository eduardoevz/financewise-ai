/**
 * Standardized Financial Model & Canonical Ingestion Engine
 * Transforms any raw Excel or database financial structure into a canonical, strictly-typed model.
 * All financial calculators consume this standardized model directly.
 */

import {
  normalizeAccountText,
  isAccountMatch,
  FINANCIAL_ACCOUNT_PATTERNS
} from './finance-accounts';
import { sanitizeFinancialNumber, safeNumber, safeDiv } from './financial-sanitizer';

export interface CanonicalBalanceSheet {
  // Activos
  efectivo: number;
  cuentasPorCobrar: number;
  inventarios: number;
  otrosActivosCirculantes: number;
  activoCirculanteTotal: number;

  propiedadPlantaEquipo: number;
  depreciacionAcumulada: number;
  otrosActivosNoCirculantes: number;
  activoNoCirculanteTotal: number;

  activoTotal: number;

  // Pasivos
  cuentasPorPagar: number;
  documentosPorPagarCP: number;
  impuestosPorPagar: number;
  otrosPasivosCirculantes: number;
  pasivoCirculanteTotal: number;

  deudaLargoPlazo: number;
  otrosPasivosNoCirculantes: number;
  pasivoNoCirculanteTotal: number;

  pasivoTotal: number;

  // Patrimonio / Capital
  capitalSocial: number;
  utilidadesRetenidas: number;
  resultadoEjercicio: number;
  otrosPatrimonio: number;
  capitalContableTotal: number;

  pasivoYCapitalTotal: number;
}

export interface CanonicalIncomeStatement {
  ventas: number;
  costoVentas: number;
  utilidadBruta: number;

  gastosVentas: number;
  gastosAdministracion: number;
  depreciacionAmortizacion: number;
  gastosOperativosTotal: number;

  utilidadOperativa: number; // UAII / EBIT

  gastosFinancieros: number; // Intereses
  otrosIngresosGastos: number;

  utilidadAntesImpuestos: number; // UAI / EBT

  impuestos: number; // Impuesto sobre la renta / ISR
  utilidadNeta: number; // Utilidad / Resultado Neto
}

export interface StandardizedPeriod {
  balanceSheet: CanonicalBalanceSheet;
  incomeStatement: CanonicalIncomeStatement;
  rawBalanceSheet: Record<string, number>;
  rawIncomeStatement: Record<string, number>;
  sourceAccountCount: {
    balance: number;
    income: number;
  };
}

export interface StandardizedFinancialModel {
  periodoActual: StandardizedPeriod;
  periodoAnterior: StandardizedPeriod;
  metadata: {
    hasPeriodoAnterior: boolean;
    standardizedAt: string;
    detectedYears?: {
      actual?: string | number;
      anterior?: string | number;
    };
  };
}

/**
 * Extracts account value using multi-pass matching:
 * 1. Exact normalized key match
 * 2. Semantic synonym dictionary match
 * 3. Token-level & regex match
 */
export function extractAccountValue(
  period: Record<string, number> | undefined,
  patterns: (string | RegExp)[]
): number {
  if (!period || typeof period !== 'object') return 0;

  const entries = Object.entries(period).map(([k, v]) => ({
    key: k,
    val: safeNumber(v)
  }));

  // Pass 1: exact normalized match for non-zero entries
  for (const entry of entries) {
    if (entry.val !== 0) {
      const normKey = normalizeAccountText(entry.key);
      for (const pat of patterns) {
        if (typeof pat === 'string' && normalizeAccountText(pat) === normKey) {
          return entry.val;
        }
      }
    }
  }

  // Pass 2: semantic/regex matching for non-zero entries
  for (const entry of entries) {
    if (entry.val !== 0 && isAccountMatch(entry.key, patterns)) {
      return entry.val;
    }
  }

  // Pass 3: match even if zero was explicitly specified
  for (const entry of entries) {
    if (isAccountMatch(entry.key, patterns)) {
      return entry.val;
    }
  }

  return 0;
}

/**
 * Aggregates all accounts matching subaccount patterns, ignoring grand totals / subtotals
 */
export function aggregateSubaccounts(
  period: Record<string, number> | undefined,
  patterns: (string | RegExp)[]
): number {
  if (!period || typeof period !== 'object') return 0;
  let sum = 0;
  for (const [k, v] of Object.entries(period)) {
    if (!v || typeof v !== 'number' || !isFinite(v)) continue;
    const normKey = normalizeAccountText(k);
    if (/^(total|suma)\b/i.test(normKey) || /\b(total|suma)$/i.test(normKey)) continue;
    if (isAccountMatch(k, patterns)) {
      sum += Math.abs(v);
    }
  }
  return sum;
}

/**
 * Transforms a raw period (Balance Sheet & Income Statement) into a canonical standardized period
 */
export function standardizePeriod(
  rawBs: Record<string, any> = {},
  rawIs: Record<string, any> = {}
): StandardizedPeriod {
  // 1. Sanitize raw data maps
  const cleanBs: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawBs || {})) {
    if (!k || !k.trim()) continue;
    cleanBs[k] = sanitizeFinancialNumber(v);
  }

  const cleanIs: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawIs || {})) {
    if (!k || !k.trim()) continue;
    cleanIs[k] = sanitizeFinancialNumber(v);
  }

  // 2. Extract Canonical Balance Sheet Items
  const efectivo = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.efectivo));
  const cuentasPorCobrar = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar));
  const inventarios = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.inventario));

  let activoCirculanteTotal = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.activoCirculante));
  if (activoCirculanteTotal === 0) {
    // Fallback: sum of circulating assets
    activoCirculanteTotal = aggregateSubaccounts(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.activoCirculanteSubaccounts);
    if (activoCirculanteTotal === 0) {
      activoCirculanteTotal = efectivo + cuentasPorCobrar + inventarios;
    }
  }
  const otrosActivosCirculantes = Math.max(0, activoCirculanteTotal - (efectivo + cuentasPorCobrar + inventarios));

  const propiedadPlantaEquipo = Math.abs(extractAccountValue(cleanBs, [
    'propiedad planta y equipo', 'propiedad, planta y equipo (neto)', 'edificios y equipos (neto)', 'terrenos',
    /propiedad.*planta/i, /edificio.*equipo/i, /activo.*fijo/i
  ]));
  const depreciacionAcumulada = Math.abs(extractAccountValue(cleanBs, [
    'depreciacion acumulada', /depreciaci.*acumulad/i, /amortizaci.*acumulad/i
  ]));

  let activoNoCirculanteTotal = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculante));
  if (activoNoCirculanteTotal === 0) {
    activoNoCirculanteTotal = aggregateSubaccounts(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculanteSubaccounts);
    if (activoNoCirculanteTotal === 0 && propiedadPlantaEquipo > 0) {
      activoNoCirculanteTotal = Math.max(0, propiedadPlantaEquipo - depreciacionAcumulada);
    }
  }
  const otrosActivosNoCirculantes = Math.max(0, activoNoCirculanteTotal - propiedadPlantaEquipo);

  let activoTotal = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.activoTotal));
  if (activoTotal === 0) {
    activoTotal = activoCirculanteTotal + activoNoCirculanteTotal;
    if (activoTotal === 0) {
      activoTotal = Object.values(cleanBs).reduce((sum, v) => sum + (v > 0 ? v : 0), 0) / 2;
    }
  }

  // Pasivos
  const cuentasPorPagar = Math.abs(extractAccountValue(cleanBs, [
    'cuentas por pagar', 'cuentas por pagar comerciales', 'proveedores', 'cxp',
    /cuenta.*pagar/i, /proveedor/i, /cxp/i
  ]));
  const documentosPorPagarCP = Math.abs(extractAccountValue(cleanBs, [
    'documentos por pagar', 'documentos por pagar a corto plazo', 'doctos por pagar',
    /documento.*pagar.*(corto|cp)/i, /docto.*pagar/i
  ]));
  const impuestosPorPagar = Math.abs(extractAccountValue(cleanBs, [
    'impuestos por pagar', 'impuesto por pagar', 'isr por pagar', 'iva por pagar',
    /impuesto.*pagar/i, /isr.*pagar/i, /iva.*pagar/i
  ]));

  let pasivoCirculanteTotal = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculante));
  if (pasivoCirculanteTotal === 0) {
    pasivoCirculanteTotal = aggregateSubaccounts(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculanteSubaccounts);
    if (pasivoCirculanteTotal === 0) {
      pasivoCirculanteTotal = cuentasPorPagar + documentosPorPagarCP + impuestosPorPagar;
    }
  }
  const otrosPasivosCirculantes = Math.max(0, pasivoCirculanteTotal - (cuentasPorPagar + documentosPorPagarCP + impuestosPorPagar));

  const deudaLargoPlazo = Math.abs(extractAccountValue(cleanBs, [
    'prestamos bancarios a largo plazo', 'prestamos bancarios lp', 'deuda a largo plazo', 'hipotecas por pagar', 'bonos por pagar',
    /prestamo.*(largo|lp)/i, /deuda.*(largo|lp)/i, /hipoteca/i, /bonos/i
  ]));

  let pasivoNoCirculanteTotal = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculante));
  if (pasivoNoCirculanteTotal === 0) {
    pasivoNoCirculanteTotal = aggregateSubaccounts(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculanteSubaccounts);
    if (pasivoNoCirculanteTotal === 0) {
      pasivoNoCirculanteTotal = deudaLargoPlazo;
    }
  }
  const otrosPasivosNoCirculantes = Math.max(0, pasivoNoCirculanteTotal - deudaLargoPlazo);

  let pasivoTotal = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.pasivoTotal));
  if (pasivoTotal === 0) {
    pasivoTotal = pasivoCirculanteTotal + pasivoNoCirculanteTotal;
  }

  // Capital Contable
  const capitalSocial = Math.abs(extractAccountValue(cleanBs, [
    'capital social', 'acciones comunes', 'acciones preferentes', /capital.*social/i, /accion.*comun/i
  ]));
  const utilidadesRetenidas = Math.abs(extractAccountValue(cleanBs, [
    'utilidades retenidas', 'utilidades acumuladas', 'reservas', /utilidad.*retenida/i, /utilidad.*acumulada/i, /reserva/i
  ]));
  const resultadoEjercicio = extractAccountValue(cleanBs, [
    'resultado del ejercicio', 'utilidad del ejercicio', /resultado.*ejercicio/i, /utilidad.*ejercicio/i
  ]);

  let capitalContableTotal = Math.abs(extractAccountValue(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.capitalContable));
  if (capitalContableTotal === 0) {
    capitalContableTotal = aggregateSubaccounts(cleanBs, FINANCIAL_ACCOUNT_PATTERNS.capitalContableSubaccounts);
    if (capitalContableTotal === 0) {
      capitalContableTotal = capitalSocial + utilidadesRetenidas + (resultadoEjercicio || 0);
    }
    if (capitalContableTotal === 0 && activoTotal > 0 && pasivoTotal > 0) {
      capitalContableTotal = Math.max(0, activoTotal - pasivoTotal);
    }
  }
  const otrosPatrimonio = Math.max(0, capitalContableTotal - (capitalSocial + utilidadesRetenidas));

  let pasivoYCapitalTotal = extractAccountValue(cleanBs, [
    'total pasivo y capital', 'total pasivo y patrimonio', /total.*pasivo.*(capital|patrimonio)/i
  ]);
  if (pasivoYCapitalTotal === 0) {
    pasivoYCapitalTotal = pasivoTotal + capitalContableTotal;
  }

  // 3. Extract Canonical Income Statement Items
  const ventas = Math.abs(extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.ventas));
  const costoVentas = Math.abs(extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.costoVentas));

  let utilidadBruta = extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.utilidadBruta);
  if (utilidadBruta === 0 && ventas > 0) {
    utilidadBruta = ventas - costoVentas;
  }

  const gastosVentas = Math.abs(extractAccountValue(cleanIs, [
    'gastos de venta', 'gastos de mercadeo', 'gastos comerciales', /gasto.*vent/i, /gasto.*comercia/i
  ]));
  const gastosAdministracion = Math.abs(extractAccountValue(cleanIs, [
    'gastos de administracion', 'gastos administrativos', /gasto.*admin/i
  ]));
  const depreciacionAmortizacion = Math.abs(extractAccountValue(cleanIs, [
    'depreciacion y amortizacion', 'depreciacion', 'amortizacion', /depreciaci/i, /amortizaci/i
  ]));

  let gastosOperativosTotal = Math.abs(extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos));
  if (gastosOperativosTotal === 0) {
    gastosOperativosTotal = aggregateSubaccounts(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativosSubaccounts);
    if (gastosOperativosTotal === 0) {
      gastosOperativosTotal = gastosVentas + gastosAdministracion + depreciacionAmortizacion;
    }
  }

  let utilidadOperativa = extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.utilidadOperativa);
  if (utilidadOperativa === 0 && utilidadBruta !== 0) {
    utilidadOperativa = utilidadBruta - gastosOperativosTotal;
  }

  const gastosFinancieros = Math.abs(extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros));
  const otrosIngresosGastos = extractAccountValue(cleanIs, [
    'otros ingresos y gastos', 'otros ingresos', 'otros gastos', /otros.*ingreso/i, /otros.*gasto/i
  ]);

  let utilidadAntesImpuestos = extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.utilidadAntesImpuestos);
  if (utilidadAntesImpuestos === 0 && utilidadOperativa !== 0) {
    utilidadAntesImpuestos = utilidadOperativa - gastosFinancieros + (otrosIngresosGastos || 0);
  }

  const impuestos = Math.abs(extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.impuestos));

  let utilidadNeta = extractAccountValue(cleanIs, FINANCIAL_ACCOUNT_PATTERNS.utilidadNeta);
  if (utilidadNeta === 0 && utilidadAntesImpuestos !== 0) {
    utilidadNeta = utilidadAntesImpuestos - impuestos;
  }

  return {
    balanceSheet: {
      efectivo,
      cuentasPorCobrar,
      inventarios,
      otrosActivosCirculantes,
      activoCirculanteTotal,
      propiedadPlantaEquipo,
      depreciacionAcumulada,
      otrosActivosNoCirculantes,
      activoNoCirculanteTotal,
      activoTotal,
      cuentasPorPagar,
      documentosPorPagarCP,
      impuestosPorPagar,
      otrosPasivosCirculantes,
      pasivoCirculanteTotal,
      deudaLargoPlazo,
      otrosPasivosNoCirculantes,
      pasivoNoCirculanteTotal,
      pasivoTotal,
      capitalSocial,
      utilidadesRetenidas,
      resultadoEjercicio,
      otrosPatrimonio,
      capitalContableTotal,
      pasivoYCapitalTotal,
    },
    incomeStatement: {
      ventas,
      costoVentas,
      utilidadBruta,
      gastosVentas,
      gastosAdministracion,
      depreciacionAmortizacion,
      gastosOperativosTotal,
      utilidadOperativa,
      gastosFinancieros,
      otrosIngresosGastos,
      utilidadAntesImpuestos,
      impuestos,
      utilidadNeta,
    },
    rawBalanceSheet: cleanBs,
    rawIncomeStatement: cleanIs,
    sourceAccountCount: {
      balance: Object.keys(cleanBs).length,
      income: Object.keys(cleanIs).length,
    }
  };
}

/**
 * Extracts and normalizes actual/anterior period records from either array or object formats
 */
export function extractPeriodDictionaries(data: any): {
  periodoActual: Record<string, number>;
  periodoAnterior: Record<string, number>;
} {
  const actual: Record<string, number> = {};
  const anterior: Record<string, number> = {};

  if (!data) return { periodoActual: actual, periodoAnterior: anterior };

  // Case 1: Array of rows [{ accountName, periodoActual, periodoAnterior }]
  if (Array.isArray(data)) {
    for (const row of data) {
      const name = (row.accountName || row.name || row.account || row.concepto || '').toString();
      if (!name) continue;
      if (row.periodoActual !== undefined && row.periodoActual !== null) {
        actual[name] = safeNumber(row.periodoActual);
      }
      if (row.periodoAnterior !== undefined && row.periodoAnterior !== null) {
        anterior[name] = safeNumber(row.periodoAnterior);
      }
    }
    return { periodoActual: actual, periodoAnterior: anterior };
  }

  // Case 2: Structured object { periodoActual: {...}, periodoAnterior: {...} }
  if (typeof data === 'object') {
    if (data.periodoActual || data.periodoAnterior) {
      return {
        periodoActual: typeof data.periodoActual === 'object' && data.periodoActual ? data.periodoActual : {},
        periodoAnterior: typeof data.periodoAnterior === 'object' && data.periodoAnterior ? data.periodoAnterior : {},
      };
    }
    // Case 3: Flat dictionary
    return { periodoActual: data, periodoAnterior: {} };
  }

  return { periodoActual: actual, periodoAnterior: anterior };
}

/**
 * Standardizes a full two-period financial dataset
 */
export function standardizeFinancialStatements(data: {
  balanceSheet?: any;
  incomeStatement?: any;
}): StandardizedFinancialModel {
  const bs = extractPeriodDictionaries(data?.balanceSheet);
  const is = extractPeriodDictionaries(data?.incomeStatement);

  const actualPeriod = standardizePeriod(bs.periodoActual, is.periodoActual);
  const anteriorPeriod = standardizePeriod(bs.periodoAnterior, is.periodoAnterior);

  const hasPeriodoAnterior =
    anteriorPeriod.sourceAccountCount.balance > 0 ||
    anteriorPeriod.sourceAccountCount.income > 0 ||
    anteriorPeriod.balanceSheet.activoTotal > 0 ||
    anteriorPeriod.incomeStatement.ventas > 0;

  return {
    periodoActual: actualPeriod,
    periodoAnterior: anteriorPeriod,
    metadata: {
      hasPeriodoAnterior,
      standardizedAt: new Date().toISOString(),
    }
  };
}
