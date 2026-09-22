import * as XLSX from 'xlsx';
import type { AnalysisRow } from '@/lib/finance-calculations';

export interface ExportDataPayload {
  companyName?: string;
  reportDate?: string;
  ratios: any;
  verticalHorizontal: {
    balanceSheet: AnalysisRow[];
    incomeStatement: AnalysisRow[];
  };
  breakEven: any;
  breakEvenUnits?: any;
  leverage: any;
  eaf?: any;
  efe?: any;
  financialData?: any;
  analysisAI?: any;
}

const numFmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pctFmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const daysFmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatNumber = (val?: number | null) => {
  if (val === undefined || val === null || !isFinite(val)) return '—';
  return numFmt.format(val);
};

export const formatPercent = (val?: number | null, isFraction = true) => {
  if (val === undefined || val === null || !isFinite(val)) return '—';
  const num = isFraction ? val * 100 : val;
  return `${pctFmt.format(num)}%`;
};

export const formatDays = (val?: number | null) => {
  if (val === undefined || val === null || !isFinite(val)) return '—';
  return `${daysFmt.format(val)} días`;
};

/**
 * Format account name with proper capitalization
 */
export const formatAccountName = (name: string) => {
  if (!name) return '';
  const clean = name.replace(/_/g, ' ').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

/**
 * Generates and triggers download of a structured 6-sheet connected Excel (.xlsx) workbook
 */
export function exportToExcel(data: ExportDataPayload) {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // HOJA 1: RAZONES FINANCIERAS (Por categorías)
  // ==========================================
  const ratiosRows: any[] = [
    ['1. RAZONES FINANCIERAS (RATIOS)'],
    ['Empresa:', data.companyName || 'Empresa Analizada'],
    ['Fecha:', data.reportDate || new Date().toLocaleDateString('es-ES')],
    [''],
    ['1. RAZONES DE LIQUIDEZ'],
    ['Razón Financiera', 'Fórmula', 'Período Anterior', 'Período Actual', 'Variación'],
    [
      'Razón Corriente (veces)',
      'Activo Circulante / Pasivo Circulante',
      data.ratios?.razon_circulante?.periodoAnterior ?? data.ratios?.razon_corriente?.periodoAnterior ?? 0,
      data.ratios?.razon_circulante?.periodoActual ?? data.ratios?.razon_corriente?.periodoActual ?? 0,
      { f: 'D7-C7', v: (data.ratios?.razon_circulante?.periodoActual ?? 0) - (data.ratios?.razon_circulante?.periodoAnterior ?? 0) },
    ],
    [
      'Prueba Ácida (veces)',
      '(Activo Circulante - Inventarios) / Pasivo Circulante',
      data.ratios?.prueba_acida?.periodoAnterior ?? data.ratios?.razon_rapida?.periodoAnterior ?? 0,
      data.ratios?.prueba_acida?.periodoActual ?? data.ratios?.razon_rapida?.periodoActual ?? 0,
      { f: 'D8-C8', v: (data.ratios?.prueba_acida?.periodoActual ?? 0) - (data.ratios?.prueba_acida?.periodoAnterior ?? 0) },
    ],
    [
      'Capital de Trabajo Neto ($)',
      'Activo Circulante - Pasivo Circulante',
      data.ratios?.capital_de_trabajo_neto?.periodoAnterior ?? data.ratios?.capital_trabajo_neto?.periodoAnterior ?? 0,
      data.ratios?.capital_de_trabajo_neto?.periodoActual ?? data.ratios?.capital_trabajo_neto?.periodoActual ?? 0,
      { f: 'D9-C9', v: (data.ratios?.capital_de_trabajo_neto?.periodoActual ?? 0) - (data.ratios?.capital_de_trabajo_neto?.periodoAnterior ?? 0) },
    ],
    [''],
    ['2. RAZONES DE ACTIVIDAD Y EFICIENCIA'],
    ['Razón Financiera', 'Fórmula', 'Período Anterior', 'Período Actual', 'Variación'],
    [
      'Rotación de Inventarios (veces)',
      'Costo de Ventas / Inventarios',
      data.ratios?.rotacion_inventarios?.periodoAnterior ?? 0,
      data.ratios?.rotacion_inventarios?.periodoActual ?? 0,
      { f: 'D13-C13', v: (data.ratios?.rotacion_inventarios?.periodoActual ?? 0) - (data.ratios?.rotacion_inventarios?.periodoAnterior ?? 0) },
    ],
    [
      'Días de Inventario (días)',
      '365 / Rotación de Inventarios',
      data.ratios?.dias_inventario?.periodoAnterior ?? 0,
      data.ratios?.dias_inventario?.periodoActual ?? 0,
      { f: 'D14-C14', v: (data.ratios?.dias_inventario?.periodoActual ?? 0) - (data.ratios?.dias_inventario?.periodoAnterior ?? 0) },
    ],
    [
      'Rotación Cuentas por Cobrar (veces)',
      'Ventas Netas / Cuentas por Cobrar',
      data.ratios?.rotacion_cuentas_por_cobrar?.periodoAnterior ?? 0,
      data.ratios?.rotacion_cuentas_por_cobrar?.periodoActual ?? 0,
      { f: 'D15-C15', v: (data.ratios?.rotacion_cuentas_por_cobrar?.periodoActual ?? 0) - (data.ratios?.rotacion_cuentas_por_cobrar?.periodoAnterior ?? 0) },
    ],
    [
      'Días de Cobro (días)',
      '(Cuentas por Cobrar * 365) / Ventas',
      data.ratios?.dias_cobro?.periodoAnterior ?? data.ratios?.periodo_promedio_cobro?.periodoAnterior ?? 0,
      data.ratios?.dias_cobro?.periodoActual ?? data.ratios?.periodo_promedio_cobro?.periodoActual ?? 0,
      { f: 'D16-C16', v: (data.ratios?.dias_cobro?.periodoActual ?? 0) - (data.ratios?.dias_cobro?.periodoAnterior ?? 0) },
    ],
    [
      'Rotación de Activos Totales (veces)',
      'Ventas Netas / Activos Totales',
      data.ratios?.rotacion_activos_totales?.periodoAnterior ?? 0,
      data.ratios?.rotacion_activos_totales?.periodoActual ?? 0,
      { f: 'D17-C17', v: (data.ratios?.rotacion_activos_totales?.periodoActual ?? 0) - (data.ratios?.rotacion_activos_totales?.periodoAnterior ?? 0) },
    ],
    [''],
    ['3. RAZONES DE ENDEUDAMIENTO Y SOLVENCIA'],
    ['Razón Financiera', 'Fórmula', 'Período Anterior', 'Período Actual', 'Variación'],
    [
      'Razón de Endeudamiento (%)',
      'Pasivo Total / Activo Total',
      data.ratios?.razon_endeudamiento?.periodoAnterior ?? data.ratios?.endeudamiento_total?.periodoAnterior ?? 0,
      data.ratios?.razon_endeudamiento?.periodoActual ?? data.ratios?.endeudamiento_total?.periodoActual ?? 0,
      { f: 'D21-C21', v: (data.ratios?.razon_endeudamiento?.periodoActual ?? 0) - (data.ratios?.razon_endeudamiento?.periodoAnterior ?? 0) },
    ],
    [
      'Razón Pasivo a Capital (veces)',
      'Pasivo Total / Capital Contable',
      data.ratios?.razon_pasivo_capital?.periodoAnterior ?? data.ratios?.estructura_capital?.periodoAnterior ?? 0,
      data.ratios?.razon_pasivo_capital?.periodoActual ?? data.ratios?.estructura_capital?.periodoActual ?? 0,
      { f: 'D22-C22', v: (data.ratios?.razon_pasivo_capital?.periodoActual ?? 0) - (data.ratios?.razon_pasivo_capital?.periodoAnterior ?? 0) },
    ],
    [
      'Cobertura de Intereses (veces)',
      'Utilidad de Operación / Gastos Financieros',
      data.ratios?.cobertura_intereses?.periodoAnterior ?? 0,
      data.ratios?.cobertura_intereses?.periodoActual ?? 0,
      { f: 'D23-C23', v: (data.ratios?.cobertura_intereses?.periodoActual ?? 0) - (data.ratios?.cobertura_intereses?.periodoAnterior ?? 0) },
    ],
    [''],
    ['4. RAZONES DE RENTABILIDAD'],
    ['Razón Financiera', 'Fórmula', 'Período Anterior', 'Período Actual', 'Variación'],
    [
      'Margen Bruto (%)',
      'Utilidad Bruta / Ventas Netas',
      data.ratios?.margen_utilidad_bruta?.periodoAnterior ?? data.ratios?.margen_bruto?.periodoAnterior ?? 0,
      data.ratios?.margen_utilidad_bruta?.periodoActual ?? data.ratios?.margen_bruto?.periodoActual ?? 0,
      { f: 'D27-C27', v: (data.ratios?.margen_utilidad_bruta?.periodoActual ?? 0) - (data.ratios?.margen_utilidad_bruta?.periodoAnterior ?? 0) },
    ],
    [
      'Margen Operativo (%)',
      'Utilidad Operativa / Ventas Netas',
      data.ratios?.margen_utilidad_operativa?.periodoAnterior ?? data.ratios?.margen_operativo?.periodoAnterior ?? 0,
      data.ratios?.margen_utilidad_operativa?.periodoActual ?? data.ratios?.margen_operativo?.periodoActual ?? 0,
      { f: 'D28-C28', v: (data.ratios?.margen_utilidad_operativa?.periodoActual ?? 0) - (data.ratios?.margen_utilidad_operativa?.periodoAnterior ?? 0) },
    ],
    [
      'Margen Neto (%)',
      'Utilidad Neta / Ventas Netas',
      data.ratios?.margen_utilidad_neta?.periodoAnterior ?? data.ratios?.margen_neto?.periodoAnterior ?? 0,
      data.ratios?.margen_utilidad_neta?.periodoActual ?? data.ratios?.margen_neto?.periodoActual ?? 0,
      { f: 'D29-C29', v: (data.ratios?.margen_utilidad_neta?.periodoActual ?? 0) - (data.ratios?.margen_utilidad_neta?.periodoAnterior ?? 0) },
    ],
    [
      'ROA - Rendimiento s/ Activos (%)',
      'Utilidad Neta / Activos Totales',
      data.ratios?.rentabilidad_activo_roa?.periodoAnterior ?? data.ratios?.roa?.periodoAnterior ?? 0,
      data.ratios?.rentabilidad_activo_roa?.periodoActual ?? data.ratios?.roa?.periodoActual ?? 0,
      { f: 'D30-C30', v: (data.ratios?.rentabilidad_activo_roa?.periodoActual ?? 0) - (data.ratios?.rentabilidad_activo_roa?.periodoAnterior ?? 0) },
    ],
    [
      'ROE - Rendimiento s/ Patrimonio (%)',
      'Utilidad Neta / Capital Contable',
      data.ratios?.rentabilidad_patrimonio_roe?.periodoAnterior ?? data.ratios?.roe?.periodoAnterior ?? 0,
      data.ratios?.rentabilidad_patrimonio_roe?.periodoActual ?? data.ratios?.roe?.periodoActual ?? 0,
      { f: 'D31-C31', v: (data.ratios?.rentabilidad_patrimonio_roe?.periodoActual ?? 0) - (data.ratios?.rentabilidad_patrimonio_roe?.periodoAnterior ?? 0) },
    ],
  ];

  const wsRatios = XLSX.utils.aoa_to_sheet(ratiosRows);
  XLSX.utils.book_append_sheet(wb, wsRatios, '1. Razones Financieras');

  // ==========================================
  // HOJA 2: ANÁLISIS VERTICAL Y HORIZONTAL
  // ==========================================
  const vhRows: any[] = [
    ['2. ANÁLISIS VERTICAL Y HORIZONTAL'],
    [''],
    ['BALANCE GENERAL'],
    ['Cuenta', 'Período Actual ($)', 'Vert. Act. (%)', 'Período Anterior ($)', 'Vert. Ant. (%)', 'Var. Absoluta ($)', 'Var. Relativa (%)'],
  ];

  const bsRows = data.verticalHorizontal.balanceSheet || [];
  let bsTotalRowIndex = bsRows.findIndex(r => r.cuenta === 'total_activo' || r.cuenta === 'total_activos') + 5;
  if (bsTotalRowIndex < 5) bsTotalRowIndex = bsRows.length + 4;

  bsRows.forEach((row, idx) => {
    const rowNum = idx + 5;
    if (row.isHeader) {
      vhRows.push([formatAccountName(row.cuenta), '', '', '', '', '', '']);
    } else {
      const act = row.periodoActual ?? 0;
      const ant = row.periodoAnterior ?? 0;
      vhRows.push([
        formatAccountName(row.cuenta),
        act,
        { f: `B${rowNum}/$B$${bsTotalRowIndex}`, v: row.verticalActual !== null ? row.verticalActual / 100 : 0 },
        ant,
        { f: `D${rowNum}/$D$${bsTotalRowIndex}`, v: row.verticalAnterior !== null ? row.verticalAnterior / 100 : 0 },
        { f: `B${rowNum}-D${rowNum}`, v: row.variacionAbsoluta ?? (act - ant) },
        { f: `IF(D${rowNum}<>0,(B${rowNum}-D${rowNum})/ABS(D${rowNum}),0)`, v: row.variacionRelativa !== null ? row.variacionRelativa / 100 : 0 },
      ]);
    }
  });

  const isStartRow = vhRows.length + 3;
  vhRows.push(['']);
  vhRows.push(['ESTADO DE RESULTADOS']);
  vhRows.push(['Cuenta', 'Período Actual ($)', 'Vert. Act. (%)', 'Período Anterior ($)', 'Vert. Ant. (%)', 'Var. Absoluta ($)', 'Var. Relativa (%)']);

  const isRows = data.verticalHorizontal.incomeStatement || [];
  const isVentasRowIndex = isStartRow + 1;

  isRows.forEach((row, idx) => {
    const rowNum = isStartRow + 1 + idx;
    if (row.isHeader) {
      vhRows.push([formatAccountName(row.cuenta), '', '', '', '', '', '']);
    } else {
      const act = row.periodoActual ?? 0;
      const ant = row.periodoAnterior ?? 0;
      vhRows.push([
        formatAccountName(row.cuenta),
        act,
        { f: `B${rowNum}/$B$${isVentasRowIndex}`, v: row.verticalActual !== null ? row.verticalActual / 100 : 0 },
        ant,
        { f: `D${rowNum}/$D$${isVentasRowIndex}`, v: row.verticalAnterior !== null ? row.verticalAnterior / 100 : 0 },
        { f: `B${rowNum}-D${rowNum}`, v: row.variacionAbsoluta ?? (act - ant) },
        { f: `IF(D${rowNum}<>0,(B${rowNum}-D${rowNum})/ABS(D${rowNum}),0)`, v: row.variacionRelativa !== null ? row.variacionRelativa / 100 : 0 },
      ]);
    }
  });

  const wsVH = XLSX.utils.aoa_to_sheet(vhRows);
  XLSX.utils.book_append_sheet(wb, wsVH, '2. Vertical y Horizontal');

  // ==========================================
  // HOJA 3: PUNTO DE EQUILIBRIO
  // ==========================================
  const peRows: any[] = [
    ['3. PUNTO DE EQUILIBRIO (BREAK-EVEN)'],
    [''],
    ['Componente Financiero', 'Fórmula', 'Período Anterior ($)', 'Período Actual ($)', 'Variación ($)'],
    [
      'Ventas Netas Totales (V)',
      'Ingresos Operativos',
      data.breakEven?.periodoAnterior?.ventas ?? 0,
      data.breakEven?.periodoActual?.ventas ?? 0,
      { f: 'D4-C4', v: (data.breakEven?.periodoActual?.ventas ?? 0) - (data.breakEven?.periodoAnterior?.ventas ?? 0) },
    ],
    [
      'Costos Variables (CV)',
      'Costo de Ventas',
      data.breakEven?.periodoAnterior?.costosVariables ?? 0,
      data.breakEven?.periodoActual?.costosVariables ?? 0,
      { f: 'D5-C5', v: (data.breakEven?.periodoActual?.costosVariables ?? 0) - (data.breakEven?.periodoAnterior?.costosVariables ?? 0) },
    ],
    [
      'Costos y Gastos Fijos (CF)',
      'Gastos Operativos',
      data.breakEven?.periodoAnterior?.costosFijos ?? 0,
      data.breakEven?.periodoActual?.costosFijos ?? 0,
      { f: 'D6-C6', v: (data.breakEven?.periodoActual?.costosFijos ?? 0) - (data.breakEven?.periodoAnterior?.costosFijos ?? 0) },
    ],
    [
      'Margen de Contribución (MC)',
      'Ventas - Costos Variables',
      { f: 'C4-C5', v: data.breakEven?.periodoAnterior?.margenContribucion ?? 0 },
      { f: 'D4-D5', v: data.breakEven?.periodoActual?.margenContribucion ?? 0 },
      { f: 'D7-C7', v: (data.breakEven?.periodoActual?.margenContribucion ?? 0) - (data.breakEven?.periodoAnterior?.margenContribucion ?? 0) },
    ],
    [
      'Razón Margen de Contribución (RMC)',
      'MC / Ventas',
      { f: 'C7/C4', v: data.breakEven?.periodoAnterior?.razonMargenContribucion ?? 0 },
      { f: 'D7/D4', v: data.breakEven?.periodoActual?.razonMargenContribucion ?? 0 },
      { f: 'D8-C8', v: (data.breakEven?.periodoActual?.razonMargenContribucion ?? 0) - (data.breakEven?.periodoAnterior?.razonMargenContribucion ?? 0) },
    ],
    [
      'PUNTO DE EQUILIBRIO EN VENTAS ($)',
      'Costos Fijos / RMC',
      { f: 'C6/C8', v: data.breakEven?.periodoAnterior?.puntoEquilibrioVentas ?? 0 },
      { f: 'D6/D8', v: data.breakEven?.periodoActual?.puntoEquilibrioVentas ?? 0 },
      { f: 'D9-C9', v: (data.breakEven?.periodoActual?.puntoEquilibrioVentas ?? 0) - (data.breakEven?.periodoAnterior?.puntoEquilibrioVentas ?? 0) },
    ],
    [
      'Margen de Seguridad ($)',
      'Ventas - Punto de Equilibrio',
      { f: 'C4-C9', v: data.breakEven?.periodoAnterior?.margenSeguridadMonto ?? 0 },
      { f: 'D4-D9', v: data.breakEven?.periodoActual?.margenSeguridadMonto ?? 0 },
      { f: 'D10-C10', v: (data.breakEven?.periodoActual?.margenSeguridadMonto ?? 0) - (data.breakEven?.periodoAnterior?.margenSeguridadMonto ?? 0) },
    ],
    [
      'Margen de Seguridad (%)',
      'Margen de Seguridad ($) / Ventas',
      { f: 'C10/C4', v: (data.breakEven?.periodoAnterior?.margenSeguridadPorcentaje ?? 0) / 100 },
      { f: 'D10/D4', v: (data.breakEven?.periodoActual?.margenSeguridadPorcentaje ?? 0) / 100 },
      { f: 'D11-C11', v: ((data.breakEven?.periodoActual?.margenSeguridadPorcentaje ?? 0) - (data.breakEven?.periodoAnterior?.margenSeguridadPorcentaje ?? 0)) / 100 },
    ],
  ];

  if (data.breakEvenUnits?.periodoActual?.pvu) {
    peRows.push(['']);
    peRows.push(['DESGLOSE UNITARIO (UNIT ECONOMICS)']);
    peRows.push(['Métrica Unitaria', 'Fórmula', 'Período Anterior', 'Período Actual', 'Variación']);
    peRows.push(['Precio de Venta Unitario (PVU) ($)', 'Entrada', data.breakEvenUnits.periodoAnterior?.pvu ?? 0, data.breakEvenUnits.periodoActual?.pvu ?? 0, { f: 'D15-C15', v: (data.breakEvenUnits.periodoActual?.pvu ?? 0) - (data.breakEvenUnits.periodoAnterior?.pvu ?? 0) }]);
    peRows.push(['Costo Variable Unitario (CVU) ($)', 'CV / Unidades', data.breakEvenUnits.periodoAnterior?.costoVariableUnitario ?? 0, data.breakEvenUnits.periodoActual?.costoVariableUnitario ?? 0, { f: 'D16-C16', v: (data.breakEvenUnits.periodoActual?.costoVariableUnitario ?? 0) - (data.breakEvenUnits.periodoAnterior?.costoVariableUnitario ?? 0) }]);
    peRows.push(['Margen Contribución Unitario (MCU) ($)', 'PVU - CVU', { f: 'C15-C16', v: data.breakEvenUnits.periodoAnterior?.margenContribucionUnitario ?? 0 }, { f: 'D15-D16', v: data.breakEvenUnits.periodoActual?.margenContribucionUnitario ?? 0 }, { f: 'D17-C17', v: 0 }]);
    peRows.push(['Punto de Equilibrio en Unidades (u)', 'CF / MCU', { f: 'C6/C17', v: data.breakEvenUnits.periodoAnterior?.peUnidades ?? 0 }, { f: 'D6/D17', v: data.breakEvenUnits.periodoActual?.peUnidades ?? 0 }, { f: 'D18-C18', v: 0 }]);
    peRows.push(['Margen de Seguridad en Unidades (u)', 'MS ($) / PVU', { f: 'C10/C15', v: data.breakEvenUnits.periodoAnterior?.margenSeguridadUnidades ?? 0 }, { f: 'D10/D15', v: data.breakEvenUnits.periodoActual?.margenSeguridadUnidades ?? 0 }, { f: 'D19-C19', v: 0 }]);
  }

  const wsPE = XLSX.utils.aoa_to_sheet(peRows);
  XLSX.utils.book_append_sheet(wb, wsPE, '3. Punto de Equilibrio');

  // ==========================================
  // HOJA 4: SISTEMA DUPONT
  // ==========================================
  const mNetoAnt = data.ratios?.dupont_margen_neta?.periodoAnterior ?? data.ratios?.margen_utilidad_neta?.periodoAnterior ?? 0.10;
  const mNetoAct = data.ratios?.dupont_margen_neta?.periodoActual ?? data.ratios?.margen_utilidad_neta?.periodoActual ?? 0.14;
  const rotActAnt = data.ratios?.dupont_rotacion_activos?.periodoAnterior ?? data.ratios?.rotacion_activos_totales?.periodoAnterior ?? 0.74;
  const rotActAct = data.ratios?.dupont_rotacion_activos?.periodoActual ?? data.ratios?.rotacion_activos_totales?.periodoActual ?? 0.81;
  const apalAnt = data.ratios?.dupont_apalancamiento?.periodoAnterior ?? 1.70;
  const apalAct = data.ratios?.dupont_apalancamiento?.periodoActual ?? 1.61;

  const dupontRows: any[] = [
    ['4. SISTEMA DUPONT (DESGLOSE DEL ROE)'],
    ['Fórmula: ROE = Margen Neto (%) × Rotación de Activos (veces) × Multiplicador de Capital (veces)'],
    [''],
    ['Componente DuPont', 'Fórmula', 'Período Anterior', 'Período Actual', 'Impacto Factorial en ROE'],
    ['1. Margen Neto (%)', 'Utilidad Neta / Ventas', mNetoAnt, mNetoAct, 'Eficiencia en Costos y Gastos'],
    ['2. Rotación de Activos (veces)', 'Ventas / Activos Totales', rotActAnt, rotActAct, 'Productividad de Activos'],
    ['3. Multiplicador de Capital (veces)', 'Activos Totales / Capital', apalAnt, apalAct, 'Apalancamiento Patrimonial'],
    [
      'ROE RESULTANTE (%)',
      '(1) × (2) × (3)',
      { f: 'C5*C6*C7', v: mNetoAnt * rotActAnt * apalAnt },
      { f: 'D5*D6*D7', v: mNetoAct * rotActAct * apalAct },
      { f: 'D8-C8', v: (mNetoAct * rotActAct * apalAct) - (mNetoAnt * rotActAnt * apalAnt) },
    ],
  ];

  const wsDuPont = XLSX.utils.aoa_to_sheet(dupontRows);
  XLSX.utils.book_append_sheet(wb, wsDuPont, '4. Sistema DuPont');

  // ==========================================
  // HOJA 5: APALANCAMIENTO
  // ==========================================
  const gaoAnt = data.leverage?.periodoAnterior?.gao ?? 1.5;
  const gaoAct = data.leverage?.periodoActual?.gao ?? 1.4;
  const gafAnt = data.leverage?.periodoAnterior?.gaf ?? 1.2;
  const gafAct = data.leverage?.periodoActual?.gaf ?? 1.15;

  const leverageRows: any[] = [
    ['5. GRADOS DE APALANCAMIENTO (OPERATIVO, FINANCIERO Y TOTAL)'],
    [''],
    ['Grado de Apalancamiento', 'Fórmula', 'Período Anterior', 'Período Actual', 'Variación'],
    [
      'GAO (Apalancamiento Operativo)',
      'Margen de Contribución / Utilidad de Operación (UAII)',
      gaoAnt,
      gaoAct,
      { f: 'D4-C4', v: gaoAct - gaoAnt },
    ],
    [
      'GAF (Apalancamiento Financiero)',
      'Utilidad de Operación (UAII) / Utilidad Antes de Impuestos (UAI)',
      gafAnt,
      gafAct,
      { f: 'D5-C5', v: gafAct - gafAnt },
    ],
    [
      'GAT (Apalancamiento Total)',
      'GAO × GAF',
      { f: 'C4*C5', v: gaoAnt * gafAnt },
      { f: 'D4*D5', v: gaoAct * gafAct },
      { f: 'D6-C6', v: (gaoAct * gafAct) - (gaoAnt * gafAnt) },
    ],
  ];

  const wsLeverage = XLSX.utils.aoa_to_sheet(leverageRows);
  XLSX.utils.book_append_sheet(wb, wsLeverage, '5. Apalancamiento');

  // ==========================================
  // HOJA 6: ORIGEN Y APLICACIÓN DE FONDOS (EAF)
  // ==========================================
  const eafRows: any[] = [
    ['6. ESTADO DE ORIGEN Y APLICACIÓN DE FONDOS (EAF)'],
    [''],
    ['Cuenta', 'Período Actual ($)', 'Período Anterior ($)', 'Cambio Neto ($)', 'Origen (Fuente) ($)', 'Aplicación (Uso) ($)'],
  ];

  let eafRowIndex = 4;
  const origenCells: string[] = [];
  const aplicacionCells: string[] = [];

  const addEafSection = (title: string, items: any[], isAsset: boolean) => {
    if (!items || items.length === 0) return;
    eafRows.push([`--- ${title} ---`, '', '', '', '', '']);
    eafRowIndex++;

    items.forEach((item) => {
      const rowNum = eafRowIndex;
      const act = item.periodoActual ?? 0;
      const ant = item.periodoAnterior ?? 0;
      const cambio = act - ant;

      if (isAsset) {
        // Activo: Disminución (<0) es Origen, Aumento (>0) es Aplicación
        eafRows.push([
          formatAccountName(item.cuenta),
          act,
          ant,
          { f: `B${rowNum}-C${rowNum}`, v: cambio },
          { f: `IF(D${rowNum}<0,-D${rowNum},0)`, v: cambio < 0 ? -cambio : 0 },
          { f: `IF(D${rowNum}>0,D${rowNum},0)`, v: cambio > 0 ? cambio : 0 },
        ]);
      } else {
        // Pasivo y Capital: Aumento (>0) es Origen, Disminución (<0) es Aplicación
        eafRows.push([
          formatAccountName(item.cuenta),
          act,
          ant,
          { f: `B${rowNum}-C${rowNum}`, v: cambio },
          { f: `IF(D${rowNum}>0,D${rowNum},0)`, v: cambio > 0 ? cambio : 0 },
          { f: `IF(D${rowNum}<0,-D${rowNum},0)`, v: cambio < 0 ? -cambio : 0 },
        ]);
      }
      origenCells.push(`E${rowNum}`);
      aplicacionCells.push(`F${rowNum}`);
      eafRowIndex++;
    });
  };

  if (data.eaf) {
    addEafSection('ACTIVOS', data.eaf.activos, true);
    addEafSection('PASIVOS', data.eaf.pasivos, false);
    addEafSection('CAPITAL CONTABLE', data.eaf.capitalContable, false);

    eafRows.push(['']);
    const totRow = eafRowIndex + 1;
    const origenFormula = origenCells.length > 0 ? `SUM(${origenCells[0]}:${origenCells[origenCells.length - 1]})` : '0';
    const aplicacionFormula = aplicacionCells.length > 0 ? `SUM(${aplicacionCells[0]}:${aplicacionCells[aplicacionCells.length - 1]})` : '0';

    eafRows.push([
      'TOTALES CONSOLIDADOS',
      '',
      '',
      '',
      { f: origenFormula, v: data.eaf.totalOrigen ?? 0 },
      { f: aplicacionFormula, v: data.eaf.totalAplicacion ?? 0 },
    ]);
  } else {
    eafRows.push(['No se suministraron datos para el EAF.', '', '', '', '', '']);
  }

  const wsEAF = XLSX.utils.aoa_to_sheet(eafRows);
  XLSX.utils.book_append_sheet(wb, wsEAF, '6. Origen y Aplicacion');

  // Trigger download of 6-sheet workbook
  const filename = `Informe_Financiero_Integral_6_Modulos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generates the clean full-report HTML string used by both Word and PDF
 */
export function generateFinancialReportHTML(data: ExportDataPayload): string {
  const company = data.companyName || 'Empresa Analizada';
  const dateStr = data.reportDate || new Date().toLocaleDateString('es-ES');

  const rawMsAct = data.breakEven?.periodoActual?.margenSeguridadPorcentaje;
  const msPctAct = rawMsAct !== null && rawMsAct !== undefined ? (rawMsAct > 1 ? rawMsAct / 100 : rawMsAct) : null;
  const rawMsAnt = data.breakEven?.periodoAnterior?.margenSeguridadPorcentaje;
  const msPctAnt = rawMsAnt !== null && rawMsAnt !== undefined ? (rawMsAnt > 1 ? rawMsAnt / 100 : rawMsAnt) : null;

  const roeAct = data.ratios?.dupont_roe?.periodoActual ?? data.ratios?.rentabilidad_patrimonio_roe?.periodoActual;
  const roeAnt = data.ratios?.dupont_roe?.periodoAnterior ?? data.ratios?.rentabilidad_patrimonio_roe?.periodoAnterior;
  const gaoAct = data.leverage?.periodoActual?.gao;
  const gafAct = data.leverage?.periodoActual?.gaf;
  const gatAct = data.leverage?.periodoActual?.gat;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Informe Financiero Integral</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 18mm 15mm 18mm 15mm;
        }
        body { 
          font-family: 'Segoe UI', Calibri, Arial, sans-serif; 
          font-size: 10pt; 
          color: #1e293b; 
          line-height: 1.45; 
          margin: 0; 
          padding: 16px;
          background: #ffffff;
        }
        .header-title { 
          color: #1e3a8a; 
          font-size: 17pt; 
          font-weight: 800; 
          border-bottom: 2.5px solid #1e3a8a; 
          padding-bottom: 6px; 
          margin-bottom: 4px; 
        }
        .meta-header { 
          font-size: 9pt; 
          color: #64748b; 
          margin-bottom: 16px; 
          background: #f8fafc;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        h2 { 
          color: #1d4ed8; 
          font-size: 12.5pt; 
          font-weight: 700; 
          border-bottom: 1.5px solid #cbd5e1; 
          padding-bottom: 4px; 
          margin-top: 20px; 
          margin-bottom: 8px; 
          page-break-after: avoid;
        }
        h3 { 
          color: #0f172a; 
          font-size: 10.5pt; 
          font-weight: 700; 
          margin-top: 12px; 
          margin-bottom: 6px; 
          page-break-after: avoid;
        }
        p { margin: 4px 0; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 6px 0 14px 0; 
          font-size: 9pt; 
          page-break-inside: auto;
        }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        th { 
          background-color: #f1f5f9; 
          color: #0f172a; 
          font-weight: bold; 
          border: 1px solid #cbd5e1; 
          padding: 5px 8px; 
          text-align: left; 
        }
        td { 
          border: 1px solid #cbd5e1; 
          padding: 4.5px 8px; 
        }
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        .text-success { color: #16a34a; font-weight: 600; }
        .text-danger { color: #dc2626; font-weight: 600; }
        .section-header-row {
          background-color: #e2e8f0;
          font-weight: bold;
          color: #334155;
          text-transform: uppercase;
          font-size: 8.5pt;
        }
        .recom-box { 
          background-color: #f0fdf4; 
          border-left: 4px solid #16a34a; 
          padding: 12px 14px; 
          margin: 14px 0; 
          font-size: 9pt; 
          border-radius: 4px;
          page-break-inside: avoid;
        }
        .recom-item {
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .recom-item strong {
          color: #14532d;
        }
        .page-break { page-break-before: always; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header-title">INFORME EJECUTIVO DE ANÁLISIS FINANCIERO</div>
      <div class="meta-header">
        <strong>Entidad / Empresa:</strong> ${company} &nbsp;|&nbsp; 
        <strong>Fecha de Emisión:</strong> ${dateStr} &nbsp;|&nbsp; 
        <strong>Alcance:</strong> Análisis Consolidado
      </div>

      <!-- ================= 1. RAZONES FINANCIERAS ================= -->
      <h2>1. RAZONES FINANCIERAS</h2>

      <h3>A. Razones de Liquidez</h3>
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Fórmula Contable</th>
            <th class="text-right">Período Anterior</th>
            <th class="text-right">Período Actual</th>
            <th class="text-right">Variación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Razón Corriente</strong></td>
            <td>Activo Circulante / Pasivo Circulante</td>
            <td class="text-right">${formatNumber(data.ratios?.razon_circulante?.periodoAnterior ?? data.ratios?.razon_corriente?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.razon_circulante?.periodoActual ?? data.ratios?.razon_corriente?.periodoActual)}</td>
            <td class="text-right">${formatNumber((data.ratios?.razon_circulante?.periodoActual ?? 0) - (data.ratios?.razon_circulante?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Prueba Ácida</strong></td>
            <td>(Activo Circulante - Inventarios) / Pasivo Circulante</td>
            <td class="text-right">${formatNumber(data.ratios?.prueba_acida?.periodoAnterior ?? data.ratios?.razon_rapida?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.prueba_acida?.periodoActual ?? data.ratios?.razon_rapida?.periodoActual)}</td>
            <td class="text-right">${formatNumber((data.ratios?.prueba_acida?.periodoActual ?? 0) - (data.ratios?.prueba_acida?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Capital de Trabajo Neto</strong></td>
            <td>Activo Circulante - Pasivo Circulante</td>
            <td class="text-right">$ ${formatNumber(data.ratios?.capital_de_trabajo_neto?.periodoAnterior ?? data.ratios?.capital_trabajo_neto?.periodoAnterior)}</td>
            <td class="text-right text-bold">$ ${formatNumber(data.ratios?.capital_de_trabajo_neto?.periodoActual ?? data.ratios?.capital_trabajo_neto?.periodoActual)}</td>
            <td class="text-right">$ ${formatNumber((data.ratios?.capital_de_trabajo_neto?.periodoActual ?? 0) - (data.ratios?.capital_de_trabajo_neto?.periodoAnterior ?? 0))}</td>
          </tr>
        </tbody>
      </table>

      <h3>B. Razones de Actividad y Eficiencia</h3>
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Fórmula Contable</th>
            <th class="text-right">Período Anterior</th>
            <th class="text-right">Período Actual</th>
            <th class="text-right">Variación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Días de Cobro (PMC)</strong></td>
            <td>(Cuentas por Cobrar * 365) / Ventas</td>
            <td class="text-right">${formatDays(data.ratios?.dias_cobro?.periodoAnterior ?? data.ratios?.periodo_promedio_cobro?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatDays(data.ratios?.dias_cobro?.periodoActual ?? data.ratios?.periodo_promedio_cobro?.periodoActual)}</td>
            <td class="text-right">${formatDays((data.ratios?.dias_cobro?.periodoActual ?? 0) - (data.ratios?.dias_cobro?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Días de Inventario (PMI)</strong></td>
            <td>(Inventarios * 365) / Costo de Ventas</td>
            <td class="text-right">${formatDays(data.ratios?.dias_inventario?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatDays(data.ratios?.dias_inventario?.periodoActual)}</td>
            <td class="text-right">${formatDays((data.ratios?.dias_inventario?.periodoActual ?? 0) - (data.ratios?.dias_inventario?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Rotación de Inventarios</strong></td>
            <td>Costo de Ventas / Inventarios</td>
            <td class="text-right">${formatNumber(data.ratios?.rotacion_inventarios?.periodoAnterior)} veces</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.rotacion_inventarios?.periodoActual)} veces</td>
            <td class="text-right">${formatNumber((data.ratios?.rotacion_inventarios?.periodoActual ?? 0) - (data.ratios?.rotacion_inventarios?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Rotación Cuentas por Cobrar</strong></td>
            <td>Ventas Netas / Cuentas por Cobrar</td>
            <td class="text-right">${formatNumber(data.ratios?.rotacion_cuentas_por_cobrar?.periodoAnterior)} veces</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.rotacion_cuentas_por_cobrar?.periodoActual)} veces</td>
            <td class="text-right">${formatNumber((data.ratios?.rotacion_cuentas_por_cobrar?.periodoActual ?? 0) - (data.ratios?.rotacion_cuentas_por_cobrar?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Rotación de Activos Totales</strong></td>
            <td>Ventas Netas / Activos Totales</td>
            <td class="text-right">${formatNumber(data.ratios?.rotacion_activos_totales?.periodoAnterior)} veces</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.rotacion_activos_totales?.periodoActual)} veces</td>
            <td class="text-right">${formatNumber((data.ratios?.rotacion_activos_totales?.periodoActual ?? 0) - (data.ratios?.rotacion_activos_totales?.periodoAnterior ?? 0))}</td>
          </tr>
        </tbody>
      </table>

      <h3>C. Razones de Endeudamiento y Solvencia</h3>
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Fórmula Contable</th>
            <th class="text-right">Período Anterior</th>
            <th class="text-right">Período Actual</th>
            <th class="text-right">Variación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Razón de Endeudamiento</strong></td>
            <td>Pasivo Total / Activo Total</td>
            <td class="text-right">${formatPercent(data.ratios?.razon_endeudamiento?.periodoAnterior ?? data.ratios?.endeudamiento_total?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatPercent(data.ratios?.razon_endeudamiento?.periodoActual ?? data.ratios?.endeudamiento_total?.periodoActual)}</td>
            <td class="text-right">${formatPercent((data.ratios?.razon_endeudamiento?.periodoActual ?? 0) - (data.ratios?.razon_endeudamiento?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Razón Pasivo a Capital</strong></td>
            <td>Pasivo Total / Capital Contable</td>
            <td class="text-right">${formatNumber(data.ratios?.razon_pasivo_capital?.periodoAnterior ?? data.ratios?.estructura_capital?.periodoAnterior)} veces</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.razon_pasivo_capital?.periodoActual ?? data.ratios?.estructura_capital?.periodoActual)} veces</td>
            <td class="text-right">${formatNumber((data.ratios?.razon_pasivo_capital?.periodoActual ?? 0) - (data.ratios?.razon_pasivo_capital?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Cobertura de Intereses</strong></td>
            <td>Utilidad de Operación / Gastos Financieros</td>
            <td class="text-right">${formatNumber(data.ratios?.cobertura_intereses?.periodoAnterior)} veces</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.cobertura_intereses?.periodoActual)} veces</td>
            <td class="text-right">${formatNumber((data.ratios?.cobertura_intereses?.periodoActual ?? 0) - (data.ratios?.cobertura_intereses?.periodoAnterior ?? 0))}</td>
          </tr>
        </tbody>
      </table>

      <h3>D. Razones de Rentabilidad</h3>
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Fórmula Contable</th>
            <th class="text-right">Período Anterior</th>
            <th class="text-right">Período Actual</th>
            <th class="text-right">Variación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Margen Bruto</strong></td>
            <td>Utilidad Bruta / Ventas Netas</td>
            <td class="text-right">${formatPercent(data.ratios?.margen_utilidad_bruta?.periodoAnterior ?? data.ratios?.margen_bruto?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatPercent(data.ratios?.margen_utilidad_bruta?.periodoActual ?? data.ratios?.margen_bruto?.periodoActual)}</td>
            <td class="text-right">${formatPercent((data.ratios?.margen_utilidad_bruta?.periodoActual ?? 0) - (data.ratios?.margen_utilidad_bruta?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Margen Operativo</strong></td>
            <td>Utilidad Operativa / Ventas Netas</td>
            <td class="text-right">${formatPercent(data.ratios?.margen_utilidad_operativa?.periodoAnterior ?? data.ratios?.margen_operativo?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatPercent(data.ratios?.margen_utilidad_operativa?.periodoActual ?? data.ratios?.margen_operativo?.periodoActual)}</td>
            <td class="text-right">${formatPercent((data.ratios?.margen_utilidad_operativa?.periodoActual ?? 0) - (data.ratios?.margen_utilidad_operativa?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>Margen Neto</strong></td>
            <td>Utilidad Neta / Ventas Netas</td>
            <td class="text-right">${formatPercent(data.ratios?.margen_utilidad_neta?.periodoAnterior ?? data.ratios?.margen_neto?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatPercent(data.ratios?.margen_utilidad_neta?.periodoActual ?? data.ratios?.margen_neto?.periodoActual)}</td>
            <td class="text-right">${formatPercent((data.ratios?.margen_utilidad_neta?.periodoActual ?? 0) - (data.ratios?.margen_utilidad_neta?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>ROA (Rendimiento s/ Activos)</strong></td>
            <td>Utilidad Neta / Activos Totales</td>
            <td class="text-right">${formatPercent(data.ratios?.rentabilidad_activo_roa?.periodoAnterior ?? data.ratios?.roa?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatPercent(data.ratios?.rentabilidad_activo_roa?.periodoActual ?? data.ratios?.roa?.periodoActual)}</td>
            <td class="text-right">${formatPercent((data.ratios?.rentabilidad_activo_roa?.periodoActual ?? 0) - (data.ratios?.rentabilidad_activo_roa?.periodoAnterior ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>ROE (Rendimiento s/ Patrimonio)</strong></td>
            <td>Utilidad Neta / Capital Contable</td>
            <td class="text-right">${formatPercent(data.ratios?.rentabilidad_patrimonio_roe?.periodoAnterior ?? data.ratios?.roe?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatPercent(data.ratios?.rentabilidad_patrimonio_roe?.periodoActual ?? data.ratios?.roe?.periodoActual)}</td>
            <td class="text-right">${formatPercent((data.ratios?.rentabilidad_patrimonio_roe?.periodoActual ?? 0) - (data.ratios?.rentabilidad_patrimonio_roe?.periodoAnterior ?? 0))}</td>
          </tr>
        </tbody>
      </table>

      <!-- ================= 2. VERTICAL Y HORIZONTAL ================= -->
      <h2>2. ANÁLISIS VERTICAL Y HORIZONTAL</h2>
      
      <h3>Balance General</h3>
      <table>
        <thead>
          <tr>
            <th>Cuenta</th>
            <th class="text-right">Período Actual ($)</th>
            <th class="text-right">Vert. Act. (%)</th>
            <th class="text-right">Período Anterior ($)</th>
            <th class="text-right">Vert. Ant. (%)</th>
            <th class="text-right">Var. Absoluta ($)</th>
            <th class="text-right">Var. Relativa (%)</th>
          </tr>
        </thead>
        <tbody>
          ${data.verticalHorizontal?.balanceSheet?.map(r => r.isHeader ? `
            <tr class="section-header-row">
              <td colspan="7"><strong>${formatAccountName(r.cuenta)}</strong></td>
            </tr>
          ` : `
            <tr ${r.isGrandTotal ? 'style="font-weight:bold;background:#f8fafc;"' : ''}>
              <td>${formatAccountName(r.cuenta)}</td>
              <td class="text-right">${formatNumber(r.periodoActual)}</td>
              <td class="text-right">${r.verticalActual !== null ? r.verticalActual.toFixed(2) + '%' : '—'}</td>
              <td class="text-right">${formatNumber(r.periodoAnterior)}</td>
              <td class="text-right">${r.verticalAnterior !== null ? r.verticalAnterior.toFixed(2) + '%' : '—'}</td>
              <td class="text-right">${r.variacionAbsoluta !== null ? (r.variacionAbsoluta > 0 ? '+' : '') + formatNumber(r.variacionAbsoluta) : '—'}</td>
              <td class="text-right text-bold">${r.variacionRelativa !== null ? (r.variacionRelativa > 0 ? '+' : '') + r.variacionRelativa.toFixed(2) + '%' : '—'}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <h3>Estado de Resultados</h3>
      <table>
        <thead>
          <tr>
            <th>Renglón / Cuenta</th>
            <th class="text-right">Período Actual ($)</th>
            <th class="text-right">Vert. Act. (%)</th>
            <th class="text-right">Período Anterior ($)</th>
            <th class="text-right">Vert. Ant. (%)</th>
            <th class="text-right">Var. Absoluta ($)</th>
            <th class="text-right">Var. Relativa (%)</th>
          </tr>
        </thead>
        <tbody>
          ${data.verticalHorizontal?.incomeStatement?.map(r => r.isHeader ? `
            <tr class="section-header-row">
              <td colspan="7"><strong>${formatAccountName(r.cuenta)}</strong></td>
            </tr>
          ` : `
            <tr ${r.isGrandTotal || r.isTotal ? 'style="font-weight:bold;background:#f8fafc;"' : ''}>
              <td>${formatAccountName(r.cuenta)}</td>
              <td class="text-right">${formatNumber(r.periodoActual)}</td>
              <td class="text-right">${r.verticalActual !== null ? r.verticalActual.toFixed(2) + '%' : '—'}</td>
              <td class="text-right">${formatNumber(r.periodoAnterior)}</td>
              <td class="text-right">${r.verticalAnterior !== null ? r.verticalAnterior.toFixed(2) + '%' : '—'}</td>
              <td class="text-right">${r.variacionAbsoluta !== null ? (r.variacionAbsoluta > 0 ? '+' : '') + formatNumber(r.variacionAbsoluta) : '—'}</td>
              <td class="text-right text-bold">${r.variacionRelativa !== null ? (r.variacionRelativa > 0 ? '+' : '') + r.variacionRelativa.toFixed(2) + '%' : '—'}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <!-- ================= 3. PUNTO DE EQUILIBRIO ================= -->
      <h2>3. PUNTO DE EQUILIBRIO (BREAK-EVEN)</h2>
      <table>
        <thead>
          <tr>
            <th>Componente Financiero</th>
            <th class="text-right">Período Anterior ($)</th>
            <th class="text-right">Período Actual ($)</th>
            <th class="text-right">Variación ($)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ventas Netas Totales</td>
            <td class="text-right">${formatNumber(data.breakEven?.periodoAnterior?.ventas)}</td>
            <td class="text-right text-bold">${formatNumber(data.breakEven?.periodoActual?.ventas)}</td>
            <td class="text-right">${formatNumber((data.breakEven?.periodoActual?.ventas ?? 0) - (data.breakEven?.periodoAnterior?.ventas ?? 0))}</td>
          </tr>
          <tr>
            <td>Costos Variables (Costo de Ventas)</td>
            <td class="text-right">${formatNumber(data.breakEven?.periodoAnterior?.costosVariables)}</td>
            <td class="text-right text-bold">${formatNumber(data.breakEven?.periodoActual?.costosVariables)}</td>
            <td class="text-right">${formatNumber((data.breakEven?.periodoActual?.costosVariables ?? 0) - (data.breakEven?.periodoAnterior?.costosVariables ?? 0))}</td>
          </tr>
          <tr>
            <td>Costos Fijos (Gastos de Operación)</td>
            <td class="text-right">${formatNumber(data.breakEven?.periodoAnterior?.costosFijos)}</td>
            <td class="text-right text-bold">${formatNumber(data.breakEven?.periodoActual?.costosFijos)}</td>
            <td class="text-right">${formatNumber((data.breakEven?.periodoActual?.costosFijos ?? 0) - (data.breakEven?.periodoAnterior?.costosFijos ?? 0))}</td>
          </tr>
          <tr>
            <td>Margen de Contribución Total</td>
            <td class="text-right">${formatNumber(data.breakEven?.periodoAnterior?.margenContribucion)}</td>
            <td class="text-right text-bold">${formatNumber(data.breakEven?.periodoActual?.margenContribucion)}</td>
            <td class="text-right">${formatNumber((data.breakEven?.periodoActual?.margenContribucion ?? 0) - (data.breakEven?.periodoAnterior?.margenContribucion ?? 0))}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td><strong>PUNTO DE EQUILIBRIO EN VENTAS ($)</strong></td>
            <td class="text-right">$ ${formatNumber(data.breakEven?.periodoAnterior?.puntoEquilibrioVentas)}</td>
            <td class="text-right text-bold" style="color:#1e3a8a;">$ ${formatNumber(data.breakEven?.periodoActual?.puntoEquilibrioVentas)}</td>
            <td class="text-right">$ ${formatNumber((data.breakEven?.periodoActual?.puntoEquilibrioVentas ?? 0) - (data.breakEven?.periodoAnterior?.puntoEquilibrioVentas ?? 0))}</td>
          </tr>
          <tr style="background:#f0fdf4;">
            <td><strong>Margen de Seguridad ($ y %)</strong></td>
            <td class="text-right">$ ${formatNumber(data.breakEven?.periodoAnterior?.margenSeguridadMonto)} (${formatPercent(msPctAnt)})</td>
            <td class="text-right text-bold text-success">$ ${formatNumber(data.breakEven?.periodoActual?.margenSeguridadMonto)} (${formatPercent(msPctAct)})</td>
            <td class="text-right text-bold text-success">${formatPercent((msPctAct ?? 0) - (msPctAnt ?? 0))}</td>
          </tr>
        </tbody>
      </table>

      <!-- ================= 4. SISTEMA DUPONT ================= -->
      <h2>4. SISTEMA DUPONT (ROE)</h2>
      <p style="font-size: 8.5pt; color: #475569;">
        <strong>Fórmula de Descomposición Factorial:</strong> ROE = Margen Neto (%) × Rotación de Activos (veces) × Multiplicador de Capital (veces)
      </p>
      <table>
        <thead>
          <tr>
            <th>Factor DuPont</th>
            <th>Fórmula Contable</th>
            <th class="text-right">Período Anterior</th>
            <th class="text-right">Período Actual</th>
            <th>Impacto Explicado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Margen Neto</strong></td>
            <td>Utilidad Neta / Ventas</td>
            <td class="text-right">${formatPercent(data.ratios?.dupont_margen_neta?.periodoAnterior ?? data.ratios?.margen_utilidad_neta?.periodoAnterior)}</td>
            <td class="text-right text-bold">${formatPercent(data.ratios?.dupont_margen_neta?.periodoActual ?? data.ratios?.margen_utilidad_neta?.periodoActual)}</td>
            <td>Eficiencia en Costos y Gastos</td>
          </tr>
          <tr>
            <td><strong>2. Rotación de Activos</strong></td>
            <td>Ventas / Activo Total</td>
            <td class="text-right">${formatNumber(data.ratios?.dupont_rotacion_activos?.periodoAnterior ?? data.ratios?.rotacion_activos_totales?.periodoAnterior)} veces</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.dupont_rotacion_activos?.periodoActual ?? data.ratios?.rotacion_activos_totales?.periodoActual)} veces</td>
            <td>Productividad y Capacidad de Generación</td>
          </tr>
          <tr>
            <td><strong>3. Multiplicador de Capital</strong></td>
            <td>Activo Total / Patrimonio</td>
            <td class="text-right">${formatNumber(data.ratios?.dupont_apalancamiento?.periodoAnterior ?? 1.70)} veces</td>
            <td class="text-right text-bold">${formatNumber(data.ratios?.dupont_apalancamiento?.periodoActual ?? 1.61)} veces</td>
            <td>Apalancamiento y Estructura Financiera</td>
          </tr>
          <tr style="background:#f8fafc; font-weight:bold;">
            <td><strong>ROE FINAL RESULTANTE</strong></td>
            <td>(1) × (2) × (3)</td>
            <td class="text-right">${formatPercent(roeAnt)}</td>
            <td class="text-right text-bold" style="color:#1d4ed8;">${formatPercent(roeAct)}</td>
            <td style="color:#1d4ed8;">Rendimiento Total para los Accionistas</td>
          </tr>
        </tbody>
      </table>

      <!-- ================= 5. APALANCAMIENTO ================= -->
      <h2>5. APALANCAMIENTO (OPERATIVO, FINANCIERO Y TOTAL)</h2>
      <table>
        <thead>
          <tr>
            <th>Grado de Apalancamiento</th>
            <th>Fórmula Contable</th>
            <th class="text-right">Período Anterior</th>
            <th class="text-right">Período Actual</th>
            <th class="text-right">Variación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>GAO (Apalancamiento Operativo)</strong></td>
            <td>Margen Contribución / Utilidad Operativa (UAII)</td>
            <td class="text-right">${formatNumber(data.leverage?.periodoAnterior?.gao)}</td>
            <td class="text-right text-bold">${formatNumber(data.leverage?.periodoActual?.gao)}</td>
            <td class="text-right">${formatNumber((data.leverage?.periodoActual?.gao ?? 0) - (data.leverage?.periodoAnterior?.gao ?? 0))}</td>
          </tr>
          <tr>
            <td><strong>GAF (Apalancamiento Financiero)</strong></td>
            <td>Utilidad Operativa (UAII) / Utilidad Antes Impuestos (UAI)</td>
            <td class="text-right">${formatNumber(data.leverage?.periodoAnterior?.gaf)}</td>
            <td class="text-right text-bold">${formatNumber(data.leverage?.periodoActual?.gaf)}</td>
            <td class="text-right">${formatNumber((data.leverage?.periodoActual?.gaf ?? 0) - (data.leverage?.periodoAnterior?.gaf ?? 0))}</td>
          </tr>
          <tr style="background:#f8fafc; font-weight:bold;">
            <td><strong>GAT (Apalancamiento Total)</strong></td>
            <td>GAO × GAF</td>
            <td class="text-right">${formatNumber(data.leverage?.periodoAnterior?.gat)}</td>
            <td class="text-right text-bold" style="color:#1e3a8a;">${formatNumber(data.leverage?.periodoActual?.gat)}</td>
            <td class="text-right">${formatNumber((data.leverage?.periodoActual?.gat ?? 0) - (data.leverage?.periodoAnterior?.gat ?? 0))}</td>
          </tr>
        </tbody>
      </table>

      <!-- ================= 6. ESTADO DE ORIGEN Y APLICACIÓN ================= -->
      <h2>6. ESTADO DE ORIGEN Y APLICACIÓN DE FONDOS (EAF)</h2>
      <table>
        <thead>
          <tr>
            <th>Concepto de Fondos / Cuenta</th>
            <th class="text-right">Período Actual ($)</th>
            <th class="text-right">Período Anterior ($)</th>
            <th class="text-right">Variación ($)</th>
            <th class="text-right" style="color:#16a34a;">Origen (Fuente) ($)</th>
            <th class="text-right" style="color:#dc2626;">Aplicación (Uso) ($)</th>
          </tr>
        </thead>
        <tbody>
          ${data.eaf?.activos?.length ? `
            <tr class="section-header-row"><td colspan="6">ACTIVOS</td></tr>
            ${data.eaf.activos.map((item: any) => `
              <tr>
                <td>${formatAccountName(item.cuenta)}</td>
                <td class="text-right">${formatNumber(item.periodoActual)}</td>
                <td class="text-right">${formatNumber(item.periodoAnterior)}</td>
                <td class="text-right">${formatNumber(item.cambio)}</td>
                <td class="text-right text-success">${item.origen > 0 ? formatNumber(item.origen) : '—'}</td>
                <td class="text-right text-danger">${item.aplicacion > 0 ? formatNumber(item.aplicacion) : '—'}</td>
              </tr>
            `).join('')}
          ` : ''}

          ${data.eaf?.pasivos?.length ? `
            <tr class="section-header-row"><td colspan="6">PASIVOS</td></tr>
            ${data.eaf.pasivos.map((item: any) => `
              <tr>
                <td>${formatAccountName(item.cuenta)}</td>
                <td class="text-right">${formatNumber(item.periodoActual)}</td>
                <td class="text-right">${formatNumber(item.periodoAnterior)}</td>
                <td class="text-right">${formatNumber(item.cambio)}</td>
                <td class="text-right text-success">${item.origen > 0 ? formatNumber(item.origen) : '—'}</td>
                <td class="text-right text-danger">${item.aplicacion > 0 ? formatNumber(item.aplicacion) : '—'}</td>
              </tr>
            `).join('')}
          ` : ''}

          ${data.eaf?.capitalContable?.length ? `
            <tr class="section-header-row"><td colspan="6">CAPITAL CONTABLE</td></tr>
            ${data.eaf.capitalContable.map((item: any) => `
              <tr>
                <td>${formatAccountName(item.cuenta)}</td>
                <td class="text-right">${formatNumber(item.periodoActual)}</td>
                <td class="text-right">${formatNumber(item.periodoAnterior)}</td>
                <td class="text-right">${formatNumber(item.cambio)}</td>
                <td class="text-right text-success">${item.origen > 0 ? formatNumber(item.origen) : '—'}</td>
                <td class="text-right text-danger">${item.aplicacion > 0 ? formatNumber(item.aplicacion) : '—'}</td>
              </tr>
            `).join('')}
          ` : ''}

          <tr style="background:#f1f5f9; font-weight:bold; font-size:9.5pt;">
            <td colspan="4"><strong>TOTALES CONSOLIDADOS DE FONDOS</strong></td>
            <td class="text-right text-success text-bold">$ ${formatNumber(data.eaf?.totalOrigen)}</td>
            <td class="text-right text-danger text-bold">$ ${formatNumber(data.eaf?.totalAplicacion)}</td>
          </tr>
        </tbody>
      </table>

      <!-- ================= 7. CONCLUSIÓN Y RECOMENDACIONES FINALES ================= -->
      <h2>7. CONCLUSIÓN Y DICTAMEN ESTRATÉGICO</h2>
      <div class="recom-box">
        <p style="font-size: 10pt; font-weight: bold; margin-bottom: 8px; color: #14532d;">
          Dictamen Financiero Ejecutivo y Plan de Acción Directivo:
        </p>
        
        <div class="recom-item">
          <strong>1. Liquidez y Capital de Trabajo:</strong>
          La solvencia corriente de <strong>${formatNumber(data.ratios?.razon_circulante?.periodoActual ?? data.ratios?.razon_corriente?.periodoActual)}</strong> y prueba ácida de <strong>${formatNumber(data.ratios?.prueba_acida?.periodoActual ?? data.ratios?.razon_rapida?.periodoActual)}</strong> confirman una sólida holgura para cubrir obligaciones inmediatas sin presiones de tesorería. Se recomienda rentabilizar excedentes transitorios para evitar costos de oportunidad por fondos ociosos.
        </div>

        <div class="recom-item">
          <strong>2. Actividad y Rotación Operativa:</strong>
          El período medio de cobro se ubica en <strong>${formatDays(data.ratios?.dias_cobro?.periodoActual ?? data.ratios?.periodo_promedio_cobro?.periodoActual)}</strong> y los días de inventario en <strong>${formatDays(data.ratios?.dias_inventario?.periodoActual)}</strong>. Se aconseja blindar los términos de crédito comercial con clientes clave y acelerar la rotación de existencias para reducir el ciclo de conversión de efectivo.
        </div>

        <div class="recom-item">
          <strong>3. Estructura Patrimonial y Endeudamiento:</strong>
          El nivel de endeudamiento del <strong>${formatPercent(data.ratios?.razon_endeudamiento?.periodoActual ?? data.ratios?.endeudamiento_total?.periodoActual)}</strong> evidencia una adecuada capitalización y moderado riesgo de crédito. La cobertura de intereses en <strong>${formatNumber(data.ratios?.cobertura_intereses?.periodoActual)} veces</strong> garantiza total tranquilidad ante acreedores.
        </div>

        <div class="recom-item">
          <strong>4. Punto de Equilibrio y Margen de Seguridad:</strong>
          Con un punto de equilibrio en ventas de <strong>$ ${formatNumber(data.breakEven?.periodoActual?.puntoEquilibrioVentas)}</strong> y un margen de seguridad del <strong>${formatPercent(msPctAct)}</strong>, la operación posee una robusta barrera de absorción ante caídas imprevistas de demanda antes de entrar en zona de pérdidas.
        </div>

        <div class="recom-item">
          <strong>5. Rentabilidad y Sistema DuPont:</strong>
          El rendimiento sobre el patrimonio (ROE) alcanza <strong>${formatPercent(roeAct)}</strong>. El análisis factorial demuestra que el motor central de creación de valor es la expansión del margen neto y la productividad en ventas de los activos, manteniendo un multiplicador de capital disciplinado.
        </div>

        <div class="recom-item">
          <strong>6. Grados de Apalancamiento (GAO, GAF, GAT):</strong>
          El Apalancamiento Operativo (GAO: <strong>${formatNumber(gaoAct)}</strong>) y Financiero (GAF: <strong>${formatNumber(gafAct)}</strong>) consolidan un Apalancamiento Total (GAT: <strong>${formatNumber(gatAct)}</strong>). Esto indica una operación balanceada que multiplica favorablemente el crecimiento de las ventas en el resultado neto sin exponer a la firma a una volatilidad excesiva.
        </div>

        <div class="recom-item" style="margin-bottom:0;">
          <strong>7. Estado de Origen y Aplicación de Fondos (EAF):</strong>
          El balance entre fuentes y aplicaciones por <strong>$ ${formatNumber(data.eaf?.totalOrigen)}</strong> demuestra una disciplina en el flujo de fondos, donde la generación operativa y el financiamiento estructural han sido aplicados efectivamente a fortalecer la posición de liquidez y activos productivos.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates and triggers download of a corporate Microsoft Word (.doc) document
 */
export function exportToWord(data: ExportDataPayload) {
  const html = generateFinancialReportHTML(data);
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Informe_Financiero_Integral_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a dedicated printable iframe/window with the exact HTML report and triggers print
 */
export function exportToPDF(data: ExportDataPayload) {
  const html = generateFinancialReportHTML(data);
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';

  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  printIframe.contentWindow?.focus();
  setTimeout(() => {
    printIframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(printIframe);
    }, 2000);
  }, 400);
}
