

import {
    normalizeAccountText,
    isAccountMatch,
    FINANCIAL_ACCOUNT_PATTERNS
} from './finance-accounts';
import {
    sanitizeFinancialNumber,
    safeNumber,
    safeDiv,
    safePct
} from './financial-sanitizer';
import {
    standardizeFinancialStatements,
    standardizePeriod,
    extractAccountValue,
    aggregateSubaccounts,
    type StandardizedFinancialModel,
    type StandardizedPeriod,
    type CanonicalBalanceSheet,
    type CanonicalIncomeStatement
} from './financial-standardizer';
import {
    auditFinancialModel,
    type FinancialAuditReport,
    type FinancialValidationWarning
} from './financial-audit';

export {
    sanitizeFinancialNumber,
    safeNumber,
    safeDiv,
    safePct,
    standardizeFinancialStatements,
    standardizePeriod,
    extractAccountValue,
    aggregateSubaccounts,
    auditFinancialModel,
    type StandardizedFinancialModel,
    type StandardizedPeriod,
    type CanonicalBalanceSheet,
    type CanonicalIncomeStatement,
    type FinancialAuditReport,
    type FinancialValidationWarning
};

export type FinancialPeriod = Record<string, number>;

export interface FinancialData {
    balanceSheet: {
        periodoActual: FinancialPeriod;
        periodoAnterior: FinancialPeriod;
    };
    incomeStatement: {
        periodoActual: FinancialPeriod;
        periodoAnterior: FinancialPeriod;
    };
}

const normalizeKey = (k: string) => normalizeAccountText(k);

const getAccountValue = (period: FinancialPeriod, keysOrPatterns: (string | RegExp)[]) => {
    if (!period || typeof period !== 'object') return 0;

    const entries = Object.entries(period).map(([k, v]) => ({
        key: k,
        val: safeNumber(v)
    }));

    // Pass 1: try exact normalized match for non-zero values
    for (const entry of entries) {
        if (entry.val !== 0) {
            const normKey = normalizeAccountText(entry.key);
            for (const pat of keysOrPatterns) {
                if (typeof pat === 'string' && normalizeAccountText(pat) === normKey) {
                    return entry.val;
                }
            }
        }
    }

    // Pass 2: regex / token / root matching for non-zero values
    for (const entry of entries) {
        if (entry.val !== 0 && isAccountMatch(entry.key, keysOrPatterns)) {
            return entry.val;
        }
    }

    // Pass 3: match even if zero was explicitly provided
    for (const entry of entries) {
        if (isAccountMatch(entry.key, keysOrPatterns)) {
            return entry.val;
        }
    }

    return 0;
};

const sumMatchingAccounts = (period: FinancialPeriod, patterns: (string | RegExp)[]) => {
    if (!period || typeof period !== 'object') return 0;
    let sum = 0;
    for (const [k, v] of Object.entries(period)) {
        if (!v || typeof v !== 'number' || !isFinite(v)) continue;
        const normKey = normalizeAccountText(k);
        if (/^(total|suma)\b/i.test(normKey) || /\b(total|suma)$/i.test(normKey)) continue; // ignore subtotal/total rows
        if (isAccountMatch(k, patterns)) {
            sum += Math.abs(v);
        }
    }
    return sum;
};

const calculatePeriodRatios = (bs: FinancialPeriod, is: FinancialPeriod) => {
    // Balance Sheet values with cross-lookup and fallback aggregation
    const activoCirculante = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.activoCirculante) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.activoCirculante)
    ) || sumMatchingAccounts(bs, FINANCIAL_ACCOUNT_PATTERNS.activoCirculanteSubaccounts);

    const activoNoCirculante = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculante) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculante)
    ) || sumMatchingAccounts(bs, FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculanteSubaccounts);

    const inventario = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.inventario) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.inventario) ||
        sumMatchingAccounts(bs, FINANCIAL_ACCOUNT_PATTERNS.inventario)
    );

    const cuentasPorCobrar = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar) ||
        sumMatchingAccounts(bs, FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar)
    );

    const pasivoCirculante = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculante) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculante)
    ) || sumMatchingAccounts(bs, FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculanteSubaccounts);

    const pasivoNoCirculante = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculante) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculante)
    ) || sumMatchingAccounts(bs, FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculanteSubaccounts);

    const pasivoTotal = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.pasivoTotal) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.pasivoTotal)
    ) || (pasivoCirculante + pasivoNoCirculante);

    const capitalContable = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.capitalContable) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.capitalContable)
    ) || sumMatchingAccounts(bs, FINANCIAL_ACCOUNT_PATTERNS.capitalContableSubaccounts);

    const activoTotal = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.activoTotal) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.activoTotal)
    ) || (activoCirculante + activoNoCirculante) || (pasivoTotal + capitalContable) || (Object.values(bs).reduce((sum, v) => sum + (v > 0 ? v : 0), 0) / 2);

    const efectivo = Math.abs(
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.efectivo) ||
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.efectivo)
    );

    // Income Statement values with absolute magnitude support
    const ventas = Math.abs(
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.ventas) ||
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.ventas)
    );

    let costoVentas = Math.abs(
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.costoVentas) ||
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.costoVentas)
    );

    const utilidadBrutaDirecta = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadBruta);

    if (costoVentas === 0 && ventas > 0 && utilidadBrutaDirecta > 0 && ventas > utilidadBrutaDirecta) {
        costoVentas = ventas - utilidadBrutaDirecta;
    }

    const utilidadBruta = utilidadBrutaDirecta !== 0 ? utilidadBrutaDirecta : (ventas > 0 && costoVentas > 0 ? ventas - costoVentas : (ventas > 0 ? ventas : 0));

    const gastosOperativos = Math.abs(
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos) ||
        getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos)
    ) || sumMatchingAccounts(is, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativosSubaccounts);

    const utilidadOperativaDirecta = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadOperativa);

    const utilidadOperativa = utilidadOperativaDirecta !== 0 ? utilidadOperativaDirecta : (utilidadBruta > 0 && gastosOperativos > 0 ? utilidadBruta - gastosOperativos : (utilidadBruta > 0 ? utilidadBruta : 0));

    const gastosFinancieros = Math.abs(
        getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros) ||
        sumMatchingAccounts(is, [/interes/i, /financier/i])
    );

    const utilidadAntesImpuestos = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadAntesImpuestos) ||
        (utilidadOperativa !== 0 ? utilidadOperativa - gastosFinancieros : 0);

    const utilidadNeta = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadNeta) ||
        (utilidadAntesImpuestos !== 0 ? utilidadAntesImpuestos : (utilidadOperativa !== 0 ? utilidadOperativa : 0));


    // 1. RAZONES DE LIQUIDEZ
    // Razón Corriente = Activo Circulante / Pasivo Circulante
    const razon_circulante = pasivoCirculante > 0 && activoCirculante > 0 ? activoCirculante / pasivoCirculante : null;
    // Prueba Ácida = (Activo Circulante - Inventarios) / Pasivo Circulante
    const razon_rapida = pasivoCirculante > 0 && activoCirculante > 0 ? (activoCirculante - inventario) / pasivoCirculante : null;
    // Capital de Trabajo Neto = Activo Circulante - Pasivo Circulante
    const capitalTrabajoNeto = activoCirculante > 0 || pasivoCirculante > 0 ? activoCirculante - pasivoCirculante : null;

    // 2. RAZONES DE ENDEUDAMIENTO / SOLVENCIA
    // Razón de Endeudamiento = Pasivo Total / Activo Total
    const razon_endeudamiento = activoTotal > 0 && pasivoTotal > 0 ? pasivoTotal / activoTotal : null;
    // Estructura de Capital (Deuda a Capital) = Pasivo Total / Capital Contable
    const razon_pasivo_capital = capitalContable > 0 && pasivoTotal > 0 ? pasivoTotal / capitalContable : null;
    // Cobertura de Intereses = Utilidad de Operación / Gastos Financieros
    const cobertura_intereses = gastosFinancieros > 0 && utilidadOperativa !== 0 ? utilidadOperativa / gastosFinancieros : null;

    // 3. RAZONES DE ACTIVIDAD / EFICIENCIA
    // Rotación de Inventarios = Costo de Ventas / Inventarios
    const baseCosto = costoVentas > 0 ? costoVentas : (ventas > 0 ? ventas : 0);
    const rotacion_inventarios = baseCosto > 0 && inventario > 0 ? baseCosto / inventario : null;
    // Días de Inventario = 365 / Rotación de Inventarios
    const diasInventario = rotacion_inventarios && rotacion_inventarios > 0 ? 365 / rotacion_inventarios : (inventario > 0 && baseCosto > 0 ? (inventario * 365) / baseCosto : null);
    // Rotación de Cuentas por Cobrar = Ventas Netas / Cuentas por Cobrar Comerciales
    const rotacion_cuentas_por_cobrar = ventas > 0 && cuentasPorCobrar > 0 ? ventas / cuentasPorCobrar : null;
    // Días de Cobro = 365 / Rotación de Cuentas por Cobrar
    const dias_cobro = rotacion_cuentas_por_cobrar && rotacion_cuentas_por_cobrar > 0 
        ? 365 / rotacion_cuentas_por_cobrar 
        : (ventas > 0 && cuentasPorCobrar > 0 ? (cuentasPorCobrar * 365) / ventas : null);
    // Rotación de Activos Totales = Ventas Netas / Activos Totales
    const rotacion_activos_totales = ventas > 0 && activoTotal > 0 ? ventas / activoTotal : null;

    // 4. RAZONES DE RENTABILIDAD
    // Margen Bruto = Utilidad Bruta / Ventas Netas
    const margen_utilidad_bruta = ventas > 0 && utilidadBruta !== 0 ? utilidadBruta / ventas : null;
    // Margen Operativo = Utilidad de Operación / Ventas Netas
    const margen_utilidad_operativa = ventas > 0 && utilidadOperativa !== 0 ? utilidadOperativa / ventas : null;
    // Margen Neto = Utilidad Neta / Ventas Netas
    const margen_utilidad_neta = ventas > 0 && utilidadNeta !== 0 ? utilidadNeta / ventas : null;
    // ROA (Rendimiento sobre los Activos) = Utilidad Neta / Activos Totales
    const rentabilidad_activo_roa = activoTotal > 0 && utilidadNeta !== 0 ? utilidadNeta / activoTotal : null;
    // ROE (Rendimiento sobre el Capital) = Utilidad Neta / Capital Contable
    const rentabilidad_patrimonio_roe = capitalContable > 0 && utilidadNeta !== 0 ? utilidadNeta / capitalContable : null;

    // Dupont Analysis
    const dupont_margen_neta = margen_utilidad_neta;
    const dupont_rotacion_activos = rotacion_activos_totales;
    const dupont_apalancamiento = activoTotal > 0 && capitalContable > 0 ? activoTotal / capitalContable : null;
    const dupont_roe = (dupont_margen_neta !== null && dupont_rotacion_activos !== null && dupont_apalancamiento !== null)
        ? dupont_margen_neta * dupont_rotacion_activos * dupont_apalancamiento
        : rentabilidad_patrimonio_roe;

    return {
        razon_circulante,
        razon_corriente: razon_circulante,
        razon_rapida,
        prueba_acida: razon_rapida,
        capital_de_trabajo_neto: capitalTrabajoNeto,
        rotacion_inventarios,
        dias_inventario: diasInventario,
        rotacion_cuentas_por_cobrar,
        dias_cobro,
        periodo_promedio_cobro: dias_cobro,
        rotacion_activos_totales,
        razon_endeudamiento,
        razon_pasivo_capital,
        estructura_capital: razon_pasivo_capital,
        cobertura_intereses,
        margen_utilidad_bruta,
        margen_bruto: margen_utilidad_bruta,
        margen_utilidad_operativa,
        margen_operativo: margen_utilidad_operativa,
        margen_utilidad_neta,
        margen_neto: margen_utilidad_neta,
        rentabilidad_activo_roa,
        roa: rentabilidad_activo_roa,
        rentabilidad_patrimonio_roe,
        roe: rentabilidad_patrimonio_roe,
        dupont_margen_neta,
        dupont_rotacion_activos,
        dupont_apalancamiento,
        dupont_roe,
    };
};

export const calculateAllRatios = (data: FinancialData) => {
    const ratiosActual = calculatePeriodRatios(data.balanceSheet.periodoActual, data.incomeStatement.periodoActual);
    const ratiosAnterior = calculatePeriodRatios(data.balanceSheet.periodoAnterior, data.incomeStatement.periodoAnterior);

    const combinedRatios: any = {};
    for (const key in ratiosActual) {
        combinedRatios[key] = {
            periodoActual: (ratiosActual as any)[key],
            periodoAnterior: (ratiosAnterior as any)[key]
        };
    }
    return combinedRatios;
};

export interface AnalysisRow {
    cuenta: string;
    periodoActual: number | null;
    periodoAnterior: number | null;
    variacionAbsoluta: number | null;
    variacionRelativa: number | null;
    verticalActual: number | null;
    verticalAnterior: number | null;
    isHeader?: boolean;
    isTotal?: boolean;
    isGrandTotal?: boolean;
}

export const calculateVerticalAndHorizontalAnalysis = (data: FinancialData) => {
    const bsActual = data.balanceSheet.periodoActual;
    const bsAnterior = data.balanceSheet.periodoAnterior;
    const isActual = data.incomeStatement.periodoActual;
    const isAnterior = data.incomeStatement.periodoAnterior;

    const totalActivoActual = getAccountValue(bsActual, FINANCIAL_ACCOUNT_PATTERNS.activoTotal) ||
        Object.values(bsActual).reduce((sum, v) => sum + (v > 0 ? v : 0), 0) / 2;
    const totalActivoAnterior = getAccountValue(bsAnterior, FINANCIAL_ACCOUNT_PATTERNS.activoTotal) ||
        Object.values(bsAnterior).reduce((sum, v) => sum + (v > 0 ? v : 0), 0) / 2;

    const totalPasivoCapitalActual = (
        getAccountValue(bsActual, FINANCIAL_ACCOUNT_PATTERNS.pasivoTotal) +
        getAccountValue(bsActual, FINANCIAL_ACCOUNT_PATTERNS.capitalContable)
    ) || getAccountValue(bsActual, ['total_pasivo_y_capital', /total.*pasivo.*(capital|patrimonio)/i]) || totalActivoActual;

    const totalPasivoCapitalAnterior = (
        getAccountValue(bsAnterior, FINANCIAL_ACCOUNT_PATTERNS.pasivoTotal) +
        getAccountValue(bsAnterior, FINANCIAL_ACCOUNT_PATTERNS.capitalContable)
    ) || getAccountValue(bsAnterior, ['total_pasivo_y_capital', /total.*pasivo.*(capital|patrimonio)/i]) || totalActivoAnterior;

    const ventasActual = getAccountValue(isActual, FINANCIAL_ACCOUNT_PATTERNS.ventas);
    const ventasAnterior = getAccountValue(isAnterior, FINANCIAL_ACCOUNT_PATTERNS.ventas);

    const buildRow = (key: string, actualMap: FinancialPeriod, anteriorMap: FinancialPeriod, baseActual: number, baseAnterior: number, flags: { isHeader?: boolean; isTotal?: boolean; isGrandTotal?: boolean } = {}): AnalysisRow => {
        if (flags.isHeader) {
            return {
                cuenta: key,
                periodoActual: null,
                periodoAnterior: null,
                variacionAbsoluta: null,
                variacionRelativa: null,
                verticalActual: null,
                verticalAnterior: null,
                isHeader: true
            };
        }

        const hasActual = Object.prototype.hasOwnProperty.call(actualMap, key);
        const hasAnterior = Object.prototype.hasOwnProperty.call(anteriorMap, key);

        const valActual = hasActual ? safeNumber(actualMap[key]) : null;
        const valAnterior = hasAnterior ? safeNumber(anteriorMap[key]) : null;

        // Variación Absoluta: Valor Período 2 - Valor Período 1
        let variacionAbsoluta: number | null = null;
        if (valActual !== null && valAnterior !== null) {
            variacionAbsoluta = valActual - valAnterior;
        } else if (valActual !== null) {
            variacionAbsoluta = valActual;
        } else if (valAnterior !== null) {
            variacionAbsoluta = -valAnterior;
        }

        // Variación Relativa / Porcentual (%): ((Valor Período 2 - Valor Período 1) / |Valor Período 1|) * 100
        let variacionRelativa: number | null = null;
        if (valAnterior !== null && valAnterior !== 0 && valActual !== null) {
            variacionRelativa = ((valActual - valAnterior) / Math.abs(valAnterior)) * 100;
        } else if (valAnterior === 0 && valActual !== null && valActual !== 0) {
            variacionRelativa = valActual > 0 ? 100 : -100;
        }

        // Análisis Vertical (%): (Valor de cada cuenta / Base) * 100
        const verticalActual = (valActual !== null && baseActual > 0) ? (valActual / baseActual) * 100 : null;
        const verticalAnterior = (valAnterior !== null && baseAnterior > 0) ? (valAnterior / baseAnterior) * 100 : null;

        return {
            cuenta: key,
            periodoActual: valActual,
            periodoAnterior: valAnterior,
            variacionAbsoluta,
            variacionRelativa,
            verticalActual,
            verticalAnterior,
            ...flags
        };
    };

    // Explicit check for Balance Sheet accounts
    const isExplicitBalanceAccount = (k: string) => {
        // Exclude nominal tax expense accounts
        if (isAccountMatch(k, [
            /^impuesto(s)?$/i,
            /impuesto.*renta/i,
            /impuestos.*renta/i,
            /impuesto.*ganancia/i,
            /^isr$/i,
            /gasto.*impuesto/i,
            /provision.*impuesto/i,
            ...FINANCIAL_ACCOUNT_PATTERNS.impuestos
        ]) && !isAccountMatch(k, [/pagar/i, /cxp/i, /por.*pagar/i])) {
            return false;
        }

        return isAccountMatch(k, [
            ...FINANCIAL_ACCOUNT_PATTERNS.efectivo,
            ...FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar,
            ...FINANCIAL_ACCOUNT_PATTERNS.inventario,
            ...FINANCIAL_ACCOUNT_PATTERNS.activoCirculante,
            ...FINANCIAL_ACCOUNT_PATTERNS.activoCirculanteSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculante,
            ...FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculanteSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.activoTotal,
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculante,
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculanteSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculante,
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculanteSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoTotal,
            ...FINANCIAL_ACCOUNT_PATTERNS.capitalContable,
            ...FINANCIAL_ACCOUNT_PATTERNS.capitalContableSubaccounts,
            /inventar/i, /mercanc/i, /mercader/i, /almacen/i, /existenc/i,
            /caja/i, /banco/i, /efectivo/i, /cliente/i, /deudor/i, /anticip/i, /incobrable/i,
            /propiedad/i, /planta/i, /equipo/i, /terreno/i, /edificio/i, /maquinaria/i, /intangible/i,
            /proveedor/i, /acreedor/i, /impuesto.*pagar/i, /prestamo/i, /hipoteca/i, /deuda.*lp/i,
            /capital.*social/i, /utilidad.*retenida/i, /utilidad.*acumulada/i,
            /activo/i, /pasivo/i, /patrimonio/i, /capital/i, /cuenta.*cobrar/i, /cuenta.*pagar/i
        ]) && !isAccountMatch(k, [
            /costo.*venta/i, /costo.*vendid/i, /utilidad.*bruta/i, /utilidad.*oper/i, /utilidad.*neta/i, /resultado.*ejercicio/i,
            /impuesto.*renta/i, /impuesto.*ganancia/i, /^impuesto(s)?$/i, /^isr$/i, /gasto.*impuesto/i,
            /ebit/i, /ebt/i, /ingreso.*vent/i, /ventas.*neta/i, /^ventas$/i
        ]);
    };

    // Ensure clean segregation of balance and income accounts
    const isIncomeKey = (k: string) =>
        !isExplicitBalanceAccount(k) &&
        isAccountMatch(k, [
            ...FINANCIAL_ACCOUNT_PATTERNS.ventas,
            ...FINANCIAL_ACCOUNT_PATTERNS.costoVentas,
            ...FINANCIAL_ACCOUNT_PATTERNS.utilidadBruta,
            ...FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos,
            ...FINANCIAL_ACCOUNT_PATTERNS.gastosOperativosSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.utilidadOperativa,
            ...FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros,
            ...FINANCIAL_ACCOUNT_PATTERNS.utilidadAntesImpuestos,
            ...FINANCIAL_ACCOUNT_PATTERNS.impuestos,
            ...FINANCIAL_ACCOUNT_PATTERNS.utilidadNeta,
            /venta/i, /costo/i, /gasto/i, /ebit/i, /ebt/i, /impuesto.*renta/i, /isr/i, /impuesto.*ganancia/i, /provision.*impuesto/i
        ]);

    // Build segregated maps
    const cleanBsActual: FinancialPeriod = {};
    const cleanBsAnterior: FinancialPeriod = {};
    const cleanIsActual: FinancialPeriod = {};
    const cleanIsAnterior: FinancialPeriod = {};

    // From Balance Sheet source
    for (const [k, v] of Object.entries(bsActual)) {
        if (isIncomeKey(k)) {
            cleanIsActual[k] = v;
        } else {
            cleanBsActual[k] = v;
        }
    }
    for (const [k, v] of Object.entries(bsAnterior)) {
        if (isIncomeKey(k)) {
            cleanIsAnterior[k] = v;
        } else {
            cleanBsAnterior[k] = v;
        }
    }

    // From Income Statement source
    for (const [k, v] of Object.entries(isActual)) {
        if (isExplicitBalanceAccount(k) || (!isIncomeKey(k) && isAccountMatch(k, [/activo|pasivo|capital|patrimonio|caja|banco|cliente|proveedor|inventar|anticip|incobrable|terreno|edificio/i]))) {
            cleanBsActual[k] = v;
        } else {
            cleanIsActual[k] = v;
        }
    }
    for (const [k, v] of Object.entries(isAnterior)) {
        if (isExplicitBalanceAccount(k) || (!isIncomeKey(k) && isAccountMatch(k, [/activo|pasivo|capital|patrimonio|caja|banco|cliente|proveedor|inventar|anticip|incobrable|terreno|edificio/i]))) {
            cleanBsAnterior[k] = v;
        } else {
            cleanIsAnterior[k] = v;
        }
    }

    // Sorting helper matching presentation slide standards
    const getAccountOrderRank = (k: string, isIncome: boolean): number => {
        if (!isIncome) {
            // Activo Circulante
            if (isAccountMatch(k, [/caja|banco|efectivo/i])) return 10;
            if (isAccountMatch(k, [/cuenta.*cobrar|cliente|deudor/i]) && !isAccountMatch(k, [/incobrable/i])) return 20;
            if (isAccountMatch(k, [/incobrable/i])) return 30;
            if (isAccountMatch(k, [/inventar|mercanc|almacen|existenc/i])) return 40;
            if (isAccountMatch(k, [/anticip|pago.*anticipado/i])) return 50;

            // Activo No Circulante
            if (isAccountMatch(k, [/terreno/i])) return 110;
            if (isAccountMatch(k, [/edificio|equipo|maquinaria|planta|inmueble/i]) && !isAccountMatch(k, [/depreciaci/i])) return 120;
            if (isAccountMatch(k, [/depreciaci/i])) return 130;
            if (isAccountMatch(k, [/intangible|patente|marca/i])) return 140;

            // Pasivo Circulante
            if (isAccountMatch(k, [/cuenta.*pagar|proveedor/i])) return 210;
            if (isAccountMatch(k, [/documento.*pagar.*(corto|cp)|documento.*pagar$/i])) return 220;
            if (isAccountMatch(k, [/impuesto.*pagar|isr.*pagar|iva.*pagar/i])) return 230;
            if (isAccountMatch(k, [/sueldo.*pagar|acreedor/i])) return 240;

            // Pasivo No Circulante
            if (isAccountMatch(k, [/prestamo.*(bancario|lp)|largo.*plazo|deuda.*lp/i])) return 310;
            if (isAccountMatch(k, [/hipoteca|bonos/i])) return 320;

            // Capital Contable
            if (isAccountMatch(k, [/capital.*social|accion/i])) return 410;
            if (isAccountMatch(k, [/utilidad.*retenida|utilidad.*acumulada|reserva/i])) return 420;
            if (isAccountMatch(k, [/resultado.*ejercicio|utilidad.*ejercicio/i])) return 430;

            return 500;
        } else {
            // Income statement ordering
            if (isAccountMatch(k, [/venta.*neta|ingreso.*venta|^ventas$/i])) return 10;
            if (isAccountMatch(k, [/costo.*venta|costo.*vendid|costo.*mercanc/i])) return 20;
            if (isAccountMatch(k, [/utilidad.*bruta|margen.*bruto/i])) return 30;
            if (isAccountMatch(k, [/gasto.*vent/i])) return 40;
            if (isAccountMatch(k, [/gasto.*admin/i])) return 50;
            if (isAccountMatch(k, [/depreciaci|amortizaci/i])) return 60;
            if (isAccountMatch(k, [/gasto.*operaci|gasto.*operat/i])) return 70;
            if (isAccountMatch(k, [/utilidad.*operaci|resultado.*operat|ebit/i])) return 80;
            if (isAccountMatch(k, [/gasto.*financier|interes/i])) return 90;
            if (isAccountMatch(k, [/utilidad.*antes.*impuesto|ebt/i])) return 100;
            if (isAccountMatch(k, [/impuesto.*renta|isr|impuesto.*ganancia/i])) return 110;
            if (isAccountMatch(k, [/utilidad.*neta|resultado.*ejercicio|ganancia.*neta/i])) return 120;
            return 200;
        }
    };

    // Categorization logic for Balance Sheet
    const categorizeBalanceSheet = (): AnalysisRow[] => {
        const allKeys = Array.from(new Set([...Object.keys(cleanBsActual), ...Object.keys(cleanBsAnterior)]));
        const rows: AnalysisRow[] = [];

        const isActivoCirc = (k: string) => isAccountMatch(k, [
            ...FINANCIAL_ACCOUNT_PATTERNS.activoCirculanteSubaccounts,
            /caja|banco|efectivo|cliente|cuenta.*cobrar|inventario|mercanc|anticip|corriente|circulante|almacen|existenc|incobrable|deudor/i
        ]) && !isAccountMatch(k, [/no_corriente|no_circulante|fijo|largo_plazo|total/i]);

        const isActivoFijo = (k: string) => isAccountMatch(k, [
            ...FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculanteSubaccounts,
            /fijo|propiedad|planta|equipo|inmueble|terreno|edificio|maquinaria|vehiculo|transporte|computo|mobiliario|intangible|patente|marca|depreciaci|amortizaci|no_corriente|no_circulante/i
        ]) && !isAccountMatch(k, [/total/i]);

        const isPasivoCirc = (k: string) => isAccountMatch(k, [
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculanteSubaccounts,
            /proveedor|cuenta.*pagar|documento.*pagar|acreedor|impuesto.*pagar|isr.*pagar|iva.*pagar|sueldo.*pagar|retencion|pasivo.*(circulante|corriente)|corto.*plazo/i
        ]) && !isAccountMatch(k, [/largo_plazo|no_corriente|no_circulante|fijo|total/i]);

        const isPasivoLP = (k: string) => isAccountMatch(k, [
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculanteSubaccounts,
            /largo_plazo|deuda.*lp|hipoteca|bonos|prestamo.*(bancario|lp)|obligacion.*pagar|pasivo.*(no_corriente|no_circulante|fijo)/i
        ]) && !isAccountMatch(k, [/total/i]);

        const isCapital = (k: string) => isAccountMatch(k, [
            ...FINANCIAL_ACCOUNT_PATTERNS.capitalContableSubaccounts,
            /capital|patrimonio|accion|reserva|utilidad.*retenida|utilidad.*acumulada|resultado.*acumulado|perdida.*acumulada|resultado.*ejercicio|utilidad.*ejercicio|superavit|aportacion/i
        ]) && !isAccountMatch(k, [/total/i]);

        let keysActivoCirc = allKeys.filter(k => isActivoCirc(k));
        let keysActivoFijo = allKeys.filter(k => isActivoFijo(k) && !keysActivoCirc.includes(k));
        const otherActivos = allKeys.filter(k => isAccountMatch(k, [/activo/i]) && !keysActivoCirc.includes(k) && !keysActivoFijo.includes(k) && !isAccountMatch(k, [/total|pasivo/i]));

        let keysPasivoCirc = allKeys.filter(k => isPasivoCirc(k) && !keysActivoCirc.includes(k) && !keysActivoFijo.includes(k));
        let keysPasivoLP = allKeys.filter(k => isPasivoLP(k) && !keysPasivoCirc.includes(k) && !keysActivoCirc.includes(k) && !keysActivoFijo.includes(k));
        const otherPasivos = allKeys.filter(k => isAccountMatch(k, [/pasivo/i]) && !keysPasivoCirc.includes(k) && !keysPasivoLP.includes(k) && !isAccountMatch(k, [/total/i]));

        let keysCapital = allKeys.filter(k => isCapital(k) && !keysPasivoCirc.includes(k) && !keysPasivoLP.includes(k) && !keysActivoCirc.includes(k) && !keysActivoFijo.includes(k));

        // Sort keys within their respective groups
        keysActivoCirc.sort((a, b) => getAccountOrderRank(a, false) - getAccountOrderRank(b, false));
        keysActivoFijo.sort((a, b) => getAccountOrderRank(a, false) - getAccountOrderRank(b, false));
        keysPasivoCirc.sort((a, b) => getAccountOrderRank(a, false) - getAccountOrderRank(b, false));
        keysPasivoLP.sort((a, b) => getAccountOrderRank(a, false) - getAccountOrderRank(b, false));
        keysCapital.sort((a, b) => getAccountOrderRank(a, false) - getAccountOrderRank(b, false));

        // Calculate accurate group subtotals and totals ensuring balance sheet equality
        const totActCircActual = getAccountValue(cleanBsActual, FINANCIAL_ACCOUNT_PATTERNS.activoCirculante) || keysActivoCirc.reduce((s, k) => s + (cleanBsActual[k] || 0), 0);
        const totActCircAnterior = getAccountValue(cleanBsAnterior, FINANCIAL_ACCOUNT_PATTERNS.activoCirculante) || keysActivoCirc.reduce((s, k) => s + (cleanBsAnterior[k] || 0), 0);

        const totActNoCircActual = getAccountValue(cleanBsActual, FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculante) || [...keysActivoFijo, ...otherActivos].reduce((s, k) => s + (cleanBsActual[k] || 0), 0);
        const totActNoCircAnterior = getAccountValue(cleanBsAnterior, FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculante) || [...keysActivoFijo, ...otherActivos].reduce((s, k) => s + (cleanBsAnterior[k] || 0), 0);

        const calculatedActivoActual = (totActCircActual + totActNoCircActual) || totalActivoActual || totalPasivoCapitalActual;
        const calculatedActivoAnterior = (totActCircAnterior + totActNoCircAnterior) || totalActivoAnterior || totalPasivoCapitalAnterior;

        const totPasCircActual = getAccountValue(cleanBsActual, FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculante) || keysPasivoCirc.reduce((s, k) => s + (cleanBsActual[k] || 0), 0);
        const totPasCircAnterior = getAccountValue(cleanBsAnterior, FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculante) || keysPasivoCirc.reduce((s, k) => s + (cleanBsAnterior[k] || 0), 0);

        const totPasLPActual = getAccountValue(cleanBsActual, FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculante) || [...keysPasivoLP, ...otherPasivos].reduce((s, k) => s + (cleanBsActual[k] || 0), 0);
        const totPasLPAnterior = getAccountValue(cleanBsAnterior, FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculante) || [...keysPasivoLP, ...otherPasivos].reduce((s, k) => s + (cleanBsAnterior[k] || 0), 0);

        const totPasActual = getAccountValue(cleanBsActual, FINANCIAL_ACCOUNT_PATTERNS.pasivoTotal) || (totPasCircActual + totPasLPActual);
        const totPasAnterior = getAccountValue(cleanBsAnterior, FINANCIAL_ACCOUNT_PATTERNS.pasivoTotal) || (totPasCircAnterior + totPasLPAnterior);

        const totCapActual = getAccountValue(cleanBsActual, FINANCIAL_ACCOUNT_PATTERNS.capitalContable) || keysCapital.reduce((s, k) => s + (cleanBsActual[k] || 0), 0);
        const totCapAnterior = getAccountValue(cleanBsAnterior, FINANCIAL_ACCOUNT_PATTERNS.capitalContable) || keysCapital.reduce((s, k) => s + (cleanBsAnterior[k] || 0), 0);

        const calculatedPasivoCapitalActual = (totPasActual + totCapActual) || calculatedActivoActual;
        const calculatedPasivoCapitalAnterior = (totPasAnterior + totCapAnterior) || calculatedActivoAnterior;

        // Use the unified balanced total for 100% vertical analysis
        const balanceBaseActual = calculatedActivoActual || calculatedPasivoCapitalActual;
        const balanceBaseAnterior = calculatedActivoAnterior || calculatedPasivoCapitalAnterior;

        // 1. ACTIVOS CIRCULANTES
        keysActivoCirc.forEach(k => rows.push(buildRow(k, cleanBsActual, cleanBsAnterior, balanceBaseActual, balanceBaseAnterior)));
        
        // TOTAL ACTIVO CIRCULANTE (SUBTOTAL)
        rows.push({
            cuenta: 'total_activo_circulante',
            periodoActual: totActCircActual,
            periodoAnterior: totActCircAnterior,
            variacionAbsoluta: totActCircActual - totActCircAnterior,
            variacionRelativa: totActCircAnterior !== 0 ? ((totActCircActual - totActCircAnterior) / Math.abs(totActCircAnterior)) * 100 : null,
            verticalActual: balanceBaseActual > 0 ? (totActCircActual / balanceBaseActual) * 100 : null,
            verticalAnterior: balanceBaseAnterior > 0 ? (totActCircAnterior / balanceBaseAnterior) * 100 : null,
            isTotal: true
        });

        // 2. ACTIVOS NO CIRCULANTES (FIJOS)
        [...keysActivoFijo, ...otherActivos].forEach(k => rows.push(buildRow(k, cleanBsActual, cleanBsAnterior, balanceBaseActual, balanceBaseAnterior)));
        
        // TOTAL ACTIVO NO CIRCULANTE (SUBTOTAL)
        rows.push({
            cuenta: 'total_activo_no_circulante',
            periodoActual: totActNoCircActual,
            periodoAnterior: totActNoCircAnterior,
            variacionAbsoluta: totActNoCircActual - totActNoCircAnterior,
            variacionRelativa: totActNoCircAnterior !== 0 ? ((totActNoCircActual - totActNoCircAnterior) / Math.abs(totActNoCircAnterior)) * 100 : null,
            verticalActual: balanceBaseActual > 0 ? (totActNoCircActual / balanceBaseActual) * 100 : null,
            verticalAnterior: balanceBaseAnterior > 0 ? (totActNoCircAnterior / balanceBaseAnterior) * 100 : null,
            isTotal: true
        });

        // TOTAL ACTIVO (GRAN TOTAL - 100%)
        rows.push({
            cuenta: 'total_activo',
            periodoActual: balanceBaseActual,
            periodoAnterior: balanceBaseAnterior,
            variacionAbsoluta: balanceBaseActual - balanceBaseAnterior,
            variacionRelativa: balanceBaseAnterior !== 0 ? ((balanceBaseActual - balanceBaseAnterior) / Math.abs(balanceBaseAnterior)) * 100 : null,
            verticalActual: 100,
            verticalAnterior: 100,
            isGrandTotal: true
        });

        // 3. PASIVOS CIRCULANTES
        keysPasivoCirc.forEach(k => rows.push(buildRow(k, cleanBsActual, cleanBsAnterior, balanceBaseActual, balanceBaseAnterior)));
        
        // TOTAL PASIVO CIRCULANTE (SUBTOTAL)
        rows.push({
            cuenta: 'total_pasivo_circulante',
            periodoActual: totPasCircActual,
            periodoAnterior: totPasCircAnterior,
            variacionAbsoluta: totPasCircActual - totPasCircAnterior,
            variacionRelativa: totPasCircAnterior !== 0 ? ((totPasCircActual - totPasCircAnterior) / Math.abs(totPasCircAnterior)) * 100 : null,
            verticalActual: balanceBaseActual > 0 ? (totPasCircActual / balanceBaseActual) * 100 : null,
            verticalAnterior: balanceBaseAnterior > 0 ? (totPasCircAnterior / balanceBaseAnterior) * 100 : null,
            isTotal: true
        });

        // 4. PASIVOS NO CIRCULANTES (LARGO PLAZO)
        [...keysPasivoLP, ...otherPasivos].forEach(k => rows.push(buildRow(k, cleanBsActual, cleanBsAnterior, balanceBaseActual, balanceBaseAnterior)));
        
        // TOTAL PASIVO NO CIRCULANTE (SUBTOTAL)
        rows.push({
            cuenta: 'total_pasivo_no_circulante',
            periodoActual: totPasLPActual,
            periodoAnterior: totPasLPAnterior,
            variacionAbsoluta: totPasLPActual - totPasLPAnterior,
            variacionRelativa: totPasLPAnterior !== 0 ? ((totPasLPActual - totPasLPAnterior) / Math.abs(totPasLPAnterior)) * 100 : null,
            verticalActual: balanceBaseActual > 0 ? (totPasLPActual / balanceBaseActual) * 100 : null,
            verticalAnterior: balanceBaseAnterior > 0 ? (totPasLPAnterior / balanceBaseAnterior) * 100 : null,
            isTotal: true
        });

        // TOTAL PASIVO (SUBTOTAL)
        rows.push({
            cuenta: 'total_pasivo',
            periodoActual: totPasActual,
            periodoAnterior: totPasAnterior,
            variacionAbsoluta: totPasActual - totPasAnterior,
            variacionRelativa: totPasAnterior !== 0 ? ((totPasActual - totPasAnterior) / Math.abs(totPasAnterior)) * 100 : null,
            verticalActual: balanceBaseActual > 0 ? (totPasActual / balanceBaseActual) * 100 : null,
            verticalAnterior: balanceBaseAnterior > 0 ? (totPasAnterior / balanceBaseAnterior) * 100 : null,
            isTotal: true
        });

        // 5. CAPITAL CONTABLE
        keysCapital.forEach(k => rows.push(buildRow(k, cleanBsActual, cleanBsAnterior, balanceBaseActual, balanceBaseAnterior)));
        
        // TOTAL CAPITAL CONTABLE (SUBTOTAL)
        rows.push({
            cuenta: 'total_capital_contable',
            periodoActual: totCapActual,
            periodoAnterior: totCapAnterior,
            variacionAbsoluta: totCapActual - totCapAnterior,
            variacionRelativa: totCapAnterior !== 0 ? ((totCapActual - totCapAnterior) / Math.abs(totCapAnterior)) * 100 : null,
            verticalActual: balanceBaseActual > 0 ? (totCapActual / balanceBaseActual) * 100 : null,
            verticalAnterior: balanceBaseAnterior > 0 ? (totCapAnterior / balanceBaseAnterior) * 100 : null,
            isTotal: true
        });

        // TOTAL PASIVO Y CAPITAL (GRAN TOTAL - 100%)
        rows.push({
            cuenta: 'total_pasivo_y_capital',
            periodoActual: balanceBaseActual,
            periodoAnterior: balanceBaseAnterior,
            variacionAbsoluta: balanceBaseActual - balanceBaseAnterior,
            variacionRelativa: balanceBaseAnterior !== 0 ? ((balanceBaseActual - balanceBaseAnterior) / Math.abs(balanceBaseAnterior)) * 100 : null,
            verticalActual: 100,
            verticalAnterior: 100,
            isGrandTotal: true
        });

        return rows;
    };

    // Categorization logic for Income Statement
    const categorizeIncomeStatement = (): AnalysisRow[] => {
        // Exclude any balance sheet accounts like inventarios, caja, clientes, etc.
        const allKeys = Array.from(new Set([...Object.keys(cleanIsActual), ...Object.keys(cleanIsAnterior)]))
            .filter(k => !isExplicitBalanceAccount(k));

        allKeys.sort((a, b) => getAccountOrderRank(a, true) - getAccountOrderRank(b, true));

        const rows: AnalysisRow[] = [];

        allKeys.forEach(k => {
            const isUtBruta = isAccountMatch(k, [/utilidad.*bruta|margen.*bruto|ganancia.*bruta/i]);
            const isUtOperativa = isAccountMatch(k, [/utilidad.*operaci|resultado.*operat|ebit/i]);
            const isUtAntesImp = isAccountMatch(k, [/utilidad.*antes.*impuesto|ebt|resultado.*antes/i]);
            const isUtNeta = isAccountMatch(k, [/utilidad.*neta|resultado.*ejercicio|ganancia.*neta|resultado.*neto/i]);
            const isVentas = isAccountMatch(k, [/ventas|ingresos/i]) && !isAccountMatch(k, [/utilidad|costo|gasto/i]);

            let flags: { isHeader?: boolean; isTotal?: boolean; isGrandTotal?: boolean } = {};
            if (isUtNeta) flags = { isGrandTotal: true };
            else if (isUtBruta || isUtOperativa || isUtAntesImp || isVentas) flags = { isTotal: true };

            rows.push(buildRow(k, cleanIsActual, cleanIsAnterior, ventasActual, ventasAnterior, flags));
        });

        return rows;
    };

    return {
        balanceSheet: categorizeBalanceSheet(),
        incomeStatement: categorizeIncomeStatement(),
        totalActivoActual,
        totalActivoAnterior,
        ventasActual,
        ventasAnterior
    };
};

export const calculateBreakEven = (data: FinancialData) => {
    const calcForPeriod = (bs: FinancialPeriod, is: FinancialPeriod) => {
        const ventas = Math.abs(
            getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.ventas) ||
            getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.ventas)
        );

        let costoVentas = Math.abs(
            getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.costoVentas) ||
            getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.costoVentas)
        );

        const utilidadBrutaDirecta = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadBruta);
        if (costoVentas === 0 && ventas > 0 && utilidadBrutaDirecta > 0 && ventas > utilidadBrutaDirecta) {
            costoVentas = ventas - utilidadBrutaDirecta;
        }

        const gastosOperativos = Math.abs(
            getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos) ||
            getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos)
        ) || sumMatchingAccounts(is, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativosSubaccounts);

        const gastosFinancieros = Math.abs(
            getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros) ||
            getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros)
        ) || sumMatchingAccounts(is, FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros);

        const isAvailable = ventas > 0 && (costoVentas > 0 || gastosOperativos > 0);

        if (!isAvailable) {
            return {
                isAvailable: false,
                ventas: null,
                costosVariables: null,
                costosFijos: null,
                margenContribucion: null,
                razonMargenContribucion: null,
                puntoEquilibrioVentas: null,
                margenSeguridadMonto: null,
                margenSeguridadPorcentaje: null,
            };
        }

        const costosVariables = costoVentas;
        const costosFijos = gastosOperativos;
        const margenContribucion = ventas - costosVariables;
        const razonMargenContribucion = ventas > 0 ? margenContribucion / ventas : 0;
        const puntoEquilibrioVentas = razonMargenContribucion > 0 ? costosFijos / razonMargenContribucion : null;
        const margenSeguridadMonto = puntoEquilibrioVentas !== null ? ventas - puntoEquilibrioVentas : null;
        const margenSeguridadPorcentaje = (margenSeguridadMonto !== null && ventas > 0) ? (margenSeguridadMonto / ventas) * 100 : null;

        return {
            isAvailable: true,
            ventas,
            costosVariables,
            costosFijos,
            margenContribucion,
            razonMargenContribucion,
            puntoEquilibrioVentas,
            margenSeguridadMonto,
            margenSeguridadPorcentaje,
        };
    };

    return {
        periodoActual: calcForPeriod(data.balanceSheet.periodoActual, data.incomeStatement.periodoActual),
        periodoAnterior: calcForPeriod(data.balanceSheet.periodoAnterior, data.incomeStatement.periodoAnterior),
    };
};

export const calculateLeverage = (data: FinancialData) => {
    const calcForPeriod = (bs: FinancialPeriod, is: FinancialPeriod) => {
        const ventas = Math.abs(
            getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.ventas) ||
            getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.ventas)
        );

        let costoVentas = Math.abs(
            getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.costoVentas) ||
            getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.costoVentas)
        );

        const utilidadBrutaDirecta = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadBruta);
        if (costoVentas === 0 && ventas > 0 && utilidadBrutaDirecta > 0 && ventas > utilidadBrutaDirecta) {
            costoVentas = ventas - utilidadBrutaDirecta;
        }

        const margenContribucion = (ventas > 0 || costoVentas > 0) ? (ventas > costoVentas ? ventas - costoVentas : ventas) : null;

        const gastosOperativos = Math.abs(
            getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos) ||
            getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos)
        ) || sumMatchingAccounts(is, FINANCIAL_ACCOUNT_PATTERNS.gastosOperativosSubaccounts);

        const utilidadOperativa = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadOperativa) ||
            (margenContribucion !== null && gastosOperativos > 0 ? margenContribucion - gastosOperativos : margenContribucion);

        const gastosFinancieros = Math.abs(
            getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros) ||
            getAccountValue(bs, FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros)
        ) || sumMatchingAccounts(is, FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros);

        const utilidadAntesImpuestos = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadAntesImpuestos) ||
            (utilidadOperativa !== null ? utilidadOperativa - gastosFinancieros : null);

        const utilidadNeta = getAccountValue(is, FINANCIAL_ACCOUNT_PATTERNS.utilidadNeta);

        const isAvailable = ventas > 0 && utilidadOperativa !== null && utilidadOperativa !== 0;

        // Grado de Apalancamiento Operativo (GAO) = Margen de Contribución / EBIT
        const gao = (isAvailable && margenContribucion !== null && utilidadOperativa !== 0) ? margenContribucion / utilidadOperativa : null;
        // Grado de Apalancamiento Financiero (GAF) = EBIT / EBT
        const gaf = (isAvailable && utilidadOperativa !== 0 && utilidadAntesImpuestos !== null && utilidadAntesImpuestos !== 0) ? utilidadOperativa / utilidadAntesImpuestos : null;
        // Grado de Apalancamiento Total (GAT) = GAO * GAF
        const gat = (gao !== null && gaf !== null) ? gao * gaf : null;

        return {
            isAvailable,
            ventas: ventas > 0 ? ventas : null,
            margenContribucion,
            utilidadOperativa,
            gastosFinancieros: gastosFinancieros > 0 ? gastosFinancieros : null,
            utilidadAntesImpuestos,
            utilidadNeta: utilidadNeta !== 0 ? utilidadNeta : null,
            gao,
            gaf,
            gat,
        };
    };

    return {
        periodoActual: calcForPeriod(data.balanceSheet.periodoActual, data.incomeStatement.periodoActual),
        periodoAnterior: calcForPeriod(data.balanceSheet.periodoAnterior, data.incomeStatement.periodoAnterior),
    };
};

export const calculateEAF = (
    balanceSheetData: FinancialData['balanceSheet'],
    incomeStatementData?: FinancialData['incomeStatement']
) => {
    if (!balanceSheetData) {
        return { activos: [], pasivos: [], capitalContable: [], totalOrigen: 0, totalAplicacion: 0 };
    }

    const isExplicitBalanceAccount = (k: string) => {
        // Exclude nominal tax expense accounts
        if (isAccountMatch(k, [
            /^impuesto(s)?$/i,
            /impuesto.*renta/i,
            /impuestos.*renta/i,
            /impuesto.*ganancia/i,
            /^isr$/i,
            /gasto.*impuesto/i,
            /provision.*impuesto/i,
            ...FINANCIAL_ACCOUNT_PATTERNS.impuestos
        ]) && !isAccountMatch(k, [/pagar/i, /cxp/i, /por.*pagar/i])) {
            return false;
        }

        return isAccountMatch(k, [
            ...FINANCIAL_ACCOUNT_PATTERNS.efectivo,
            ...FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar,
            ...FINANCIAL_ACCOUNT_PATTERNS.inventario,
            ...FINANCIAL_ACCOUNT_PATTERNS.activoCirculanteSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculanteSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculanteSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculanteSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.capitalContableSubaccounts,
            /caja|banco|efectivo|cliente|cobrar|cxc|deudor|inventar|mercanc|almacen|existenc|anticip|incobrable/i,
            /terreno|edificio|equipo|maquinaria|planta|propiedad|inmueble|vehiculo|transporte|computo|intangib|depreciaci.*acumulad/i,
            /proveedor|pagar|cxp|acreedor|prestamo|hipoteca|bonos|deuda|impuesto.*pagar|isr.*pagar|iva.*pagar|retencion/i,
            /capital.*social|utilidad.*retenida|utilidad.*acumulada|patrimonio/i
        ]) && !isAccountMatch(k, [
            /costo.*venta/i, /costo.*vendid/i, /utilidad.*bruta/i, /utilidad.*oper/i, /utilidad.*neta/i,
            /gasto.*oper/i, /gasto.*admin/i, /gasto.*vent/i, /depreciaci.*y.*amortizaci/i,
            /impuesto.*renta/i, /impuesto.*ganancia/i, /^impuesto(s)?$/i, /^isr$/i, /gasto.*impuesto/i,
            /ebit/i, /ebt/i, /ingreso.*vent/i, /ventas.*neta/i, /^ventas$/i
        ]);
    };

    // Merge in any balance accounts that might have been stored in income statement (e.g. inventarios, impuestos por pagar)
    const bsActual: Record<string, number> = { ...(balanceSheetData.periodoActual || {}) };
    const bsAnterior: Record<string, number> = { ...(balanceSheetData.periodoAnterior || {}) };

    if (incomeStatementData) {
        const isActual = incomeStatementData.periodoActual || {};
        const isAnterior = incomeStatementData.periodoAnterior || {};
        const allIsKeys = new Set([...Object.keys(isActual), ...Object.keys(isAnterior)]);

        for (const k of allIsKeys) {
            if (isExplicitBalanceAccount(k)) {
                if (isActual[k] !== undefined && bsActual[k] === undefined) {
                    bsActual[k] = safeNumber(isActual[k]);
                }
                if (isAnterior[k] !== undefined && bsAnterior[k] === undefined) {
                    bsAnterior[k] = safeNumber(isAnterior[k]);
                }
            }
        }
    }

    const allAccounts = Array.from(new Set([
        ...Object.keys(bsActual),
        ...Object.keys(bsAnterior)
    ]));

    const activos: any[] = [];
    const pasivos: any[] = [];
    const capitalContable: any[] = [];

    const isTotal = (key: string) => {
        const norm = normalizeAccountText(key);
        return /^(total|suma)\b/i.test(norm) || 
               /\b(total|suma)$/i.test(norm) || 
               /total.*(activo|pasivo|capital|patrimonio)/i.test(norm) ||
               /suma.*(activo|pasivo|capital|patrimonio)/i.test(norm);
    };

    const isIncomeAccount = (key: string) => {
        if (isExplicitBalanceAccount(key)) return false;

        return isAccountMatch(key, [
            ...FINANCIAL_ACCOUNT_PATTERNS.ventas,
            ...FINANCIAL_ACCOUNT_PATTERNS.costoVentas,
            ...FINANCIAL_ACCOUNT_PATTERNS.utilidadBruta,
            ...FINANCIAL_ACCOUNT_PATTERNS.gastosOperativos,
            ...FINANCIAL_ACCOUNT_PATTERNS.gastosOperativosSubaccounts,
            ...FINANCIAL_ACCOUNT_PATTERNS.utilidadOperativa,
            ...FINANCIAL_ACCOUNT_PATTERNS.gastosFinancieros,
            ...FINANCIAL_ACCOUNT_PATTERNS.utilidadAntesImpuestos,
            ...FINANCIAL_ACCOUNT_PATTERNS.impuestos,
            ...FINANCIAL_ACCOUNT_PATTERNS.utilidadNeta,
            /impuesto.*renta/i, /impuesto.*ganancia/i, /^impuesto(s)?$/i, /^isr$/i, /gasto.*impuesto/i, /provision.*impuesto/i,
            /venta/i, /costo.*venta/i, /costo.*vendid/i, /utilidad.*bruta/i, /utilidad.*oper/i, /utilidad.*neta/i,
            /ebit/i, /ebt/i, /gasto.*admin/i, /gasto.*vent/i, /gasto.*oper/i, /interes.*financ/i
        ]);
    };

    const isContraAsset = (k: string) => {
        return isAccountMatch(k, [
            'estimacion cuentas incobrables',
            'estimacion para cuentas incobrables',
            'estimacion de cuentas incobrables',
            'provision cuentas incobrables',
            'depreciacion acumulada',
            'amortizacion acumulada',
            'deterioro acumulado',
            /estimaci.*(cuenta|cobrar|incobrable)/i,
            /provision.*(cuenta|cobrar|incobrable)/i,
            /depreciaci.*acumulada/i,
            /amortizaci.*acumulada/i,
            /deterioro.*acumulado/i
        ]);
    };

    const getEAFOrderRank = (k: string, classification: 'activos' | 'pasivos' | 'capitalContable'): number => {
        if (classification === 'activos') {
            if (isAccountMatch(k, [/caja|banco|efectivo/i])) return 10;
            if (isAccountMatch(k, [/cuenta.*cobrar|cliente/i]) && !isAccountMatch(k, [/incobrable/i])) return 20;
            if (isAccountMatch(k, [/incobrable/i])) return 30;
            if (isAccountMatch(k, [/inventar|mercanc|almacen|existenc/i])) return 40;
            if (isAccountMatch(k, [/anticip|pago.*anticipado/i])) return 50;
            if (isAccountMatch(k, [/terreno/i])) return 60;
            if (isAccountMatch(k, [/edificio|equipo|maquinaria|planta|inmueble/i])) return 70;
            if (isAccountMatch(k, [/intangible|patente/i])) return 80;
            return 90;
        } else if (classification === 'pasivos') {
            if (isAccountMatch(k, [/cuenta.*pagar|proveedor/i])) return 10;
            if (isAccountMatch(k, [/documento.*pagar.*(corto|cp)|documento.*pagar$/i])) return 20;
            if (isAccountMatch(k, [/impuesto.*pagar|isr.*pagar|iva.*pagar/i])) return 30;
            if (isAccountMatch(k, [/sueldo.*pagar|acreedor/i])) return 40;
            if (isAccountMatch(k, [/prestamo|largo.*plazo|deuda.*lp/i])) return 50;
            if (isAccountMatch(k, [/hipoteca|bonos/i])) return 60;
            return 70;
        } else {
            if (isAccountMatch(k, [/capital.*social|accion/i])) return 10;
            if (isAccountMatch(k, [/utilidad.*retenida|utilidad.*acumulada|reserva/i])) return 20;
            if (isAccountMatch(k, [/resultado.*ejercicio|utilidad.*ejercicio/i])) return 30;
            return 40;
        }
    };

    allAccounts.forEach(cuenta => {
        if (isTotal(cuenta)) return;
        if (isIncomeAccount(cuenta)) return;

        let rawActual = safeNumber(bsActual[cuenta]);
        let rawAnterior = safeNumber(bsAnterior[cuenta]);

        // Classification
        let classification: 'activos' | 'pasivos' | 'capitalContable' = 'activos';

        if (
            isAccountMatch(cuenta, FINANCIAL_ACCOUNT_PATTERNS.pasivoCirculanteSubaccounts) ||
            isAccountMatch(cuenta, FINANCIAL_ACCOUNT_PATTERNS.pasivoNoCirculanteSubaccounts) ||
            isAccountMatch(cuenta, [/pasivo|proveedor|pagar|cxp|acreedor|deuda|prestamo|hipoteca|bonos|obligaci|impuesto.*pagar|isr.*pagar|iva.*pagar|tributo|arrendamiento|sobregiro|anticipo.*cliente/i])
        ) {
            classification = 'pasivos';
        } else if (
            isAccountMatch(cuenta, FINANCIAL_ACCOUNT_PATTERNS.capitalContableSubaccounts) ||
            isAccountMatch(cuenta, [/capital|patrimonio|utilidad.*retenida|utilidad.*acumulada|reserva|accion|superavit|aportaci/i])
        ) {
            classification = 'capitalContable';
        } else if (
            isAccountMatch(cuenta, FINANCIAL_ACCOUNT_PATTERNS.activoCirculanteSubaccounts) ||
            isAccountMatch(cuenta, FINANCIAL_ACCOUNT_PATTERNS.activoNoCirculanteSubaccounts) ||
            isAccountMatch(cuenta, FINANCIAL_ACCOUNT_PATTERNS.efectivo) ||
            isAccountMatch(cuenta, FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar) ||
            isAccountMatch(cuenta, FINANCIAL_ACCOUNT_PATTERNS.inventario) ||
            isAccountMatch(cuenta, [/activo|caja|banco|efectivo|cliente|cobrar|deudor|inventar|mercanc|anticip|terreno|edificio|equipo|maquinaria|mueble|vehiculo|propiedad|planta|depreciaci|amortizaci|intangib|seguro|incobrable|deterioro|inversion/i])
        ) {
            classification = 'activos';
        } else {
            return;
        }

        let montoActual = rawActual;
        let montoAnterior = rawAnterior;

        // If it's a contra-asset entered as positive, make it negative to reflect contra-asset nature
        if (classification === 'activos' && isContraAsset(cuenta)) {
            if (rawActual > 0 || rawAnterior > 0) {
                montoActual = rawActual > 0 ? -rawActual : rawActual;
                montoAnterior = rawAnterior > 0 ? -rawAnterior : rawAnterior;
            }
        }

        const cambio = montoActual - montoAnterior;
        let origen = 0;
        let aplicacion = 0;

        if (classification === 'activos') {
            // Activos:
            // Aumento (>0) -> Aplicación (uso de fondos)
            // Disminución (<0) -> Origen (generación de fondos)
            if (cambio > 0) {
                aplicacion = cambio;
            } else if (cambio < 0) {
                origen = -cambio;
            }
        } else {
            // Pasivos y Capital Contable:
            // Aumento (>0) -> Origen (fuente de financiamiento)
            // Disminución (<0) -> Aplicación (pago o uso de fondos)
            if (cambio > 0) {
                origen = cambio;
            } else if (cambio < 0) {
                aplicacion = -cambio;
            }
        }

        const item = {
            cuenta,
            periodoActual: montoActual,
            periodoAnterior: montoAnterior,
            cambio,
            origen,
            aplicacion,
            order: getEAFOrderRank(cuenta, classification)
        };

        if (classification === 'activos') activos.push(item);
        else if (classification === 'pasivos') pasivos.push(item);
        else if (classification === 'capitalContable') capitalContable.push(item);
    });

    activos.sort((a, b) => a.order - b.order);
    pasivos.sort((a, b) => a.order - b.order);
    capitalContable.sort((a, b) => a.order - b.order);

    const totalOrigen = [...activos, ...pasivos, ...capitalContable].reduce((acc, item) => acc + item.origen, 0);
    const totalAplicacion = [...activos, ...pasivos, ...capitalContable].reduce((acc, item) => acc + item.aplicacion, 0);

    return { activos, pasivos, capitalContable, totalOrigen, totalAplicacion };
};


export const calculateEFE = (balanceSheet: FinancialData['balanceSheet'], incomeStatement: FinancialData['incomeStatement']) => {
    const isA = incomeStatement.periodoActual;
    const isB = incomeStatement.periodoAnterior;
    const bsA = balanceSheet.periodoActual;
    const bsB = balanceSheet.periodoAnterior;

    const utilidadNeta = getAccountValue(isA, FINANCIAL_ACCOUNT_PATTERNS.utilidadNeta);
    const depreciacionAnterior = getAccountValue(isB, ['depreciacion', 'depreciacion y amortizacion', /depreciaci/i]);
    const depreciacionActual = getAccountValue(isA, ['depreciacion', 'depreciacion y amortizacion', /depreciaci/i]);
    const depreciacion = depreciacionActual - depreciacionAnterior > 0 ? depreciacionActual - depreciacionAnterior : depreciacionActual;
    
    const cambioCuentasPorCobrar = getAccountValue(bsA, FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar) - getAccountValue(bsB, FINANCIAL_ACCOUNT_PATTERNS.cuentasPorCobrar);
    const cambioInventarios = getAccountValue(bsA, FINANCIAL_ACCOUNT_PATTERNS.inventario) - getAccountValue(bsB, FINANCIAL_ACCOUNT_PATTERNS.inventario);
    const cambioCuentasPorPagar = getAccountValue(bsA, ['cuentas por pagar', 'proveedores', /cuenta.*pagar/i, /proveedor/i]) - getAccountValue(bsB, ['cuentas por pagar', 'proveedores', /cuenta.*pagar/i, /proveedor/i]);

    const operacion: any[] = [];
    operacion.push({ cuenta: 'Utilidad Neta', monto: utilidadNeta });
    if(depreciacion !== 0) operacion.push({ cuenta: 'Depreciación y Amortización', monto: depreciacion });
    if(cambioCuentasPorCobrar !== 0) operacion.push({ cuenta: 'Disminución (Aumento) en Cuentas por Cobrar', monto: -cambioCuentasPorCobrar });
    if(cambioInventarios !== 0) operacion.push({ cuenta: 'Disminución (Aumento) en Inventarios', monto: -cambioInventarios });
    if(cambioCuentasPorPagar !== 0) operacion.push({ cuenta: 'Aumento (Disminución) en Cuentas por Pagar', monto: cambioCuentasPorPagar });
    
    const totalOperacion = operacion.reduce((acc, item) => acc + safeNumber(item.monto), 0);
    
    const cambioActivosFijos = (getAccountValue(bsA, ['propiedad planta y equipo neto', 'activos fijos netos', /propiedad.*planta/i, /activo.*fijo/i]) - getAccountValue(bsB, ['propiedad planta y equipo neto', 'activos fijos netos', /propiedad.*planta/i, /activo.*fijo/i]));
    const inversion: any[] = [];
    if(cambioActivosFijos !== 0) inversion.push({cuenta: 'Adquisición de Activos Fijos (neto)', monto: -cambioActivosFijos });
    const totalInversion = inversion.reduce((acc, item) => acc + safeNumber(item.monto), 0);

    const cambioDeudaLP = getAccountValue(bsA, ['deuda lp', 'pasivos no corrientes', 'deuda a largo plazo', /deuda.*lp/i, /largo.*plazo/i]) - getAccountValue(bsB, ['deuda lp', 'pasivos no corrientes', 'deuda a largo plazo', /deuda.*lp/i, /largo.*plazo/i]);
    const emisionCapital = getAccountValue(bsA, ['capital social', /capital.*social/i]) - getAccountValue(bsB, ['capital social', /capital.*social/i]);
    const financiamiento: any[] = [];
    if (cambioDeudaLP !== 0) financiamiento.push({ cuenta: 'Aumento (Disminución) de Deuda a Largo Plazo', monto: cambioDeudaLP });
    if (emisionCapital > 0) financiamiento.push({ cuenta: 'Emisión de Capital', monto: emisionCapital });
    const totalFinanciamiento = financiamiento.reduce((acc, item) => acc + safeNumber(item.monto), 0);
    
    const aumentoNetoEfectivo = totalOperacion + totalInversion + totalFinanciamiento;
    const efectivoInicioPeriodo = getAccountValue(bsB, FINANCIAL_ACCOUNT_PATTERNS.efectivo);
    const efectivoFinalPeriodo = getAccountValue(bsA, FINANCIAL_ACCOUNT_PATTERNS.efectivo);

    // Adjustment if calculated final cash doesn't match balance sheet cash
    const cashDifference = efectivoFinalPeriodo - (efectivoInicioPeriodo + aumentoNetoEfectivo);
    
    let finalAumentoNeto = aumentoNetoEfectivo;
    if (Math.abs(cashDifference) > 1) { // Tolerance for rounding
        // Try to adjust through a common 'other' account if one exists or just log it
        let adjusted = false;
        if(financiamiento.length > 0) {
            financiamiento.push({ cuenta: 'Ajuste de Flujo de Efectivo', monto: cashDifference });
            adjusted = true;
        } else if(operacion.length > 0) {
            operacion.push({ cuenta: 'Ajuste de Flujo de Efectivo', monto: cashDifference });
            adjusted = true;
        }

        if(adjusted) {
            finalAumentoNeto = efectivoFinalPeriodo - efectivoInicioPeriodo;
        }
    }


    return {
        operacion,
        totalOperacion: totalOperacion + (finalAumentoNeto - aumentoNetoEfectivo),
        inversion,
        totalInversion,
        financiamiento,
        totalFinanciamiento,
        aumentoNetoEfectivo: finalAumentoNeto,
        efectivoInicioPeriodo,
        efectivoFinalPeriodo
    }
};
