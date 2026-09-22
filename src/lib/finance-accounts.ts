/**
 * Flexible Account Normalization and Semantic Matcher
 * Handles diacritics removal, casing, singular/plural variations,
 * code prefixes, typos, and financial synonym resolution.
 */

export function normalizeAccountText(text: string): string {
  if (!text) return '';
  let str = String(text);

  // 1. Lowercase and trim
  str = str.toLowerCase().trim();

  // 2. Remove diacritics / accents (e.g. á -> a, é -> e, í -> i, ó -> o, ú -> u, ü -> u, ñ -> n)
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 3. Remove accounting code prefixes (e.g., "1.1.01", "101-01", "01.", "1. ", "( - )")
  str = str.replace(/^[\s\(\)\-\*\+\#\d\.\:\;\,\_\/]+/g, '');

  // 4. Replace punctuation, underscores, dashes, slashes with single spaces
  str = str.replace(/[\_\-\/\:\;\,\.\(\)\[\]\{\}\\\*\+\=\?\!\<\>\#\$\%\&\@\"]+/g, ' ');

  // 5. Replace multiple spaces with single space and trim
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Strips common Spanish plural suffixes for root-level comparison
 * (e.g. 'inventarios' -> 'inventario', 'mercancias' -> 'mercancia', 'clientes' -> 'cliente')
 */
export function getWordRoot(word: string): string {
  let w = normalizeAccountText(word);
  if (w.endsWith('es') && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith('s') && w.length > 3 && !w.endsWith('is') && !w.endsWith('as')) {
    w = w.slice(0, -1);
  } else if (w.endsWith('as') && w.length > 4) {
    w = w.slice(0, -1);
  }
  return w;
}

/**
 * Levenshtein distance for fuzzy matching typos (e.g. "invntario" vs "inventario")
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a candidate account name matches any target keyword or regex
 */
export function isAccountMatch(rawCandidate: string, patterns: (string | RegExp)[]): boolean {
  if (!rawCandidate) return false;
  const normalizedCandidate = normalizeAccountText(rawCandidate);
  if (!normalizedCandidate) return false;

  const candidateRoot = getWordRoot(normalizedCandidate);
  const candidateTokens = normalizedCandidate.split(' ').filter(Boolean);

  for (const pattern of patterns) {
    if (pattern instanceof RegExp) {
      if (pattern.test(rawCandidate) || pattern.test(normalizedCandidate)) {
        return true;
      }
      continue;
    }

    if (typeof pattern === 'string') {
      const normalizedTarget = normalizeAccountText(pattern);
      if (!normalizedTarget) continue;

      // 1. Exact match
      if (normalizedCandidate === normalizedTarget) return true;

      // 2. Root match (handles plural/singular for single words)
      const targetRoot = getWordRoot(normalizedTarget);
      if (candidateRoot === targetRoot) return true;

      // 3. Substring inclusion: candidate includes target phrase
      if (normalizedCandidate.includes(normalizedTarget)) {
        return true;
      }

      // 4. Token-level matching (all target tokens present in candidate)
      const targetTokens = normalizedTarget.split(' ').filter(Boolean);
      if (targetTokens.length > 1) {
        const allTokensPresent = targetTokens.every(tToken => {
          const tRoot = getWordRoot(tToken);
          return candidateTokens.some(cToken => cToken === tToken || getWordRoot(cToken) === tRoot);
        });
        if (allTokensPresent) return true;
      }

      // 5. Fuzzy match for single words with length >= 5 allowing 1 edit
      if (targetTokens.length === 1 && candidateTokens.length === 1) {
        const t = targetTokens[0];
        const c = candidateTokens[0];
        if (Math.abs(t.length - c.length) <= 1 && t.length >= 5) {
          if (levenshteinDistance(t, c) <= 1) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Standard Semantic Groups and Synonyms for Financial Analysis
 */
export const FINANCIAL_ACCOUNT_PATTERNS = {
  efectivo: [
    'efectivo', 'caja', 'banco', 'bancos', 'disponible', 'tesoreria',
    'equivalentes de efectivo', 'caja y bancos', 'caja chica', 'fondos disponibles',
    /efectivo/i, /caja/i, /banco/i, /disponible/i, /tesoreria/i
  ],
  cuentasPorCobrar: [
    'clientes', 'cliente', 'cuentas por cobrar', 'cuenta por cobrar', 'cuentas x cobrar',
    'cxc', 'deudores', 'deudor', 'deudores comerciales', 'deudores diversos',
    'documentos por cobrar', 'doctos por cobrar', 'efectos por cobrar', 'cartera',
    'cartera de creditos', 'facturas por cobrar', 'clientes nacionales', 'clientes extranjeros',
    /cuenta.*cobrar/i, /cxc/i, /cliente/i, /deudor/i, /docto.*cobrar/i, /documento.*cobrar/i, /cartera/i
  ],
  inventario: [
    'inventario', 'inventarios', 'mercancias', 'mercancia', 'mercaderias', 'mercaderia',
    'existencias', 'existencia', 'almacen', 'almacenes', 'stock', 'materias primas',
    'materia prima', 'productos terminados', 'producto terminado', 'produccion en proceso',
    'inventario de mercancias', 'inventario final', 'inventario inicial', 'inventarios netos',
    /inventar/i, /mercanc/i, /mercader/i, /almacen/i, /existenc/i, /stock/i, /materia.*prima/i, /producto.*terminado/i
  ],
  activoCirculante: [
    'total activo circulante', 'total activos circulantes', 'total activo corriente', 'total activos corrientes',
    'activo circulante', 'activos circulantes', 'activo corriente', 'activos corrientes',
    'total de activos circulantes', 'total de activos corrientes', 'suma activo circulante',
    /total.*activo.*(circulante|corriente)/i, /^activo.*(circulante|corriente)/i, /suma.*activo.*(circulante|corriente)/i
  ],
  activoCirculanteSubaccounts: [
    'caja', 'banco', 'bancos', 'efectivo', 'efectivo y equivalentes', 'clientes', 'cliente', 'cuentas por cobrar', 'cuentas por cobrar comerciales',
    'estimacion cuentas incobrables', 'estimacion para cuentas incobrables', 'estimacion de cuentas incobrables', 'cuentas incobrables',
    'inventarios', 'inventario', 'mercancias', 'mercancia', 'almacen', 'deudores', 'deudores diversos', 'anticipos', 'pagos anticipados',
    'gastos pagados por anticipado', 'seguros pagados por anticipado', 'inversiones temporales', 'valores negociables',
    /caja/i, /banco/i, /efectivo/i, /cliente/i, /cobrar/i, /inventar/i, /mercanc/i, /anticip/i, /deudor/i, /almacen/i, /existenc/i, /incobrable/i, /estimaci.*(cuenta|cobrar|incobrable)/i
  ],
  activoNoCirculante: [
    'total activo no circulante', 'total activos no circulantes', 'total activo no corriente', 'total activos no corrientes',
    'total activo fijo', 'total activos fijos', 'activo no circulante', 'activos no circulantes',
    'activo no corriente', 'activos no corrientes', 'activo fijo', 'activos fijos',
    'total de activos no circulantes', 'total de activos fijos',
    /total.*activo.*(no_corriente|no_circulante|fijo)/i, /^activo.*(no_corriente|no_circulante|fijo)/i
  ],
  activoNoCirculanteSubaccounts: [
    'propiedad planta y equipo', 'maquinaria y equipo', 'inmuebles maquinaria y equipo', 'terrenos', 'terreno', 'edificios', 'edificio', 'edificios y equipos', 'edificios y equipos neto', 'equipo de transporte', 'equipo de computo', 'depreciacion acumulada', 'activos intangibles',
    /propiedad/i, /planta/i, /equipo/i, /maquinaria/i, /vehiculo/i, /terreno/i, /edificio/i, /inmueble/i, /intangible/i, /depreciaci/i, /amortizaci/i
  ],
  activoTotal: [
    'total activo', 'total de activos', 'total activos', 'suma del activo', 'suma activo',
    'activo total', 'activos totales', 'total del activo',
    /total.*activo/i, /suma.*activo/i, /activo.*total/i
  ],
  pasivoCirculante: [
    'total pasivo circulante', 'total pasivos circulantes', 'total pasivo corriente', 'total pasivos corrientes',
    'pasivo circulante', 'pasivos circulantes', 'pasivo corriente', 'pasivos corrientes',
    'total de pasivos circulantes', 'total de pasivos corrientes', 'pasivo a corto plazo',
    'total pasivo a corto plazo', 'suma pasivo circulante',
    /total.*pasivo.*(circulante|corriente|corto)/i, /^pasivo.*(circulante|corriente|corto)/i, /suma.*pasivo.*(circulante|corriente)/i
  ],
  pasivoCirculanteSubaccounts: [
    'proveedores', 'proveedor', 'cuentas por pagar', 'cuentas por pagar comerciales', 'cuenta por pagar', 'cxp',
    'documentos por pagar', 'documentos por pagar a corto plazo', 'doctos por pagar', 'acreedores', 'acreedores diversos', 'impuestos por pagar', 'impuesto por pagar', 'sueldos por pagar', 'gastos acumulados por pagar',
    /proveedor/i, /cuenta.*pagar/i, /cxp/i, /documento.*pagar/i, /docto.*pagar/i, /acreedor/i, /impuesto.*pagar/i, /sueldo.*pagar/i, /gasto.*acumulado/i
  ],
  pasivoNoCirculante: [
    'total pasivo no circulante', 'total pasivos no circulantes', 'total pasivo no corriente', 'total pasivos no corrientes',
    'total pasivo fijo', 'total pasivo a largo plazo', 'total pasivos a largo plazo',
    'pasivo no circulante', 'pasivos no circulantes', 'pasivo no corriente', 'pasivos no corrientes',
    'pasivo a largo plazo', 'pasivos a largo plazo', 'deuda a largo plazo',
    /total.*pasivo.*(no_corriente|largo_plazo|fijo|no_circulante)/i, /^pasivo.*(no_corriente|largo_plazo|no_circulante)/i
  ],
  pasivoNoCirculanteSubaccounts: [
    'prestamos bancarios lp', 'prestamos bancarios a largo plazo', 'prestamos bancarios', 'hipotecas por pagar', 'bonos por pagar', 'deuda lp', 'documentos por pagar lp', 'documentos por pagar a largo plazo',
    /largo.*plazo/i, /hipoteca/i, /bonos/i, /deuda.*lp/i, /prestamo/i
  ],
  pasivoTotal: [
    'total pasivo', 'total de pasivos', 'total pasivos', 'suma del pasivo', 'suma pasivo',
    'pasivo total', 'pasivos totales', 'total del pasivo',
    /total.*pasivo/i, /suma.*pasivo/i, /pasivo.*total/i
  ],
  capitalContable: [
    'total capital contable', 'total patrimonio', 'total patrimonio neto', 'capital contable',
    'patrimonio neto', 'total capital y reservas', 'patrimonio total',
    /total.*(capital|patrimonio)/i, /^capital.*contable/i, /^patrimonio.*neto/i
  ],
  capitalContableSubaccounts: [
    'capital social', 'patrimonio', 'capital y reservas', 'utilidades retenidas', 'utilidades acumuladas', 'resultado del ejercicio', 'superavit', 'reserva legal', 'acciones preferentes', 'acciones comunes',
    /capital.*social/i, /accion/i, /reserva/i, /utilidad.*retenida/i, /utilidad.*acumulada/i, /resultado.*ejercicio/i
  ],
  ventas: [
    'ventas netas', 'ventas', 'ventas totales', 'ventas brutas', 'ingresos operacionales',
    'ingresos operativos', 'ingresos por actividades ordinarias', 'ingresos totales',
    'ingresos por ventas', 'ingresos netos', 'ingresos', 'facturacion', 'total ingresos',
    'ingreso por ventas', 'ingresos de operacion',
    /ventas.*neta/i, /ventas/i, /ingreso.*oper/i, /ingreso.*ordina/i, /ingreso.*tot/i, /ingreso.*vent/i, /ingreso.*neto/i, /ingreso/i, /facturaci/i
  ],
  costoVentas: [
    'costo de ventas', 'costo ventas', 'costo de lo vendido', 'costo de mercancia vendida',
    'costo de mercancias vendidas', 'costos de ventas', 'costo de venta', 'costo mercaderias',
    'costo de servicios',
    /costo.*venta/i, /costo.*vendid/i, /costo.*mercanc/i, /costo.*producci/i, /costo.*servicio/i
  ],
  utilidadBruta: [
    'utilidad bruta', 'margen bruto', 'ganancia bruta', 'resultado bruto', 'beneficio bruto',
    /utilidad.*bruta/i, /ganancia.*bruta/i, /margen.*bruto/i
  ],
  gastosOperativos: [
    'total gastos de operacion', 'total gastos de administracion y ventas', 'total gastos operativos',
    'total gastos operacionales', 'gastos de operacion', 'gastos operativos', 'gastos operacionales',
    'gastos generales y administrativos', 'gastos de administracion y ventas',
    /total.*gasto.*operaci/i, /total.*gasto.*(admin|venta)/i, /^gastos.*operaci/i, /^gastos.*operat/i
  ],
  gastosOperativosSubaccounts: [
    'gastos de administracion', 'gastos de venta', 'gastos administrativos', 'gastos de comercializacion',
    'gastos de mercadeo', 'depreciacion', 'depreciacion y amortizacion', 'sueldos y salarios',
    /gasto.*admin/i, /gasto.*vent/i, /gasto.*comercia/i, /depreciaci/i, /amortizaci/i
  ],
  utilidadOperativa: [
    'utilidad de operacion', 'utilidad operativa', 'resultado operativo', 'ebit',
    'ganancia operativa', 'resultado de explotacion', 'beneficio operativo',
    /utilidad.*operaci/i, /resultado.*operat/i, /^ebit$/i
  ],
  gastosFinancieros: [
    'gastos financieros intereses', 'gastos financieros (intereses)', 'gastos financieros', 'costos financieros',
    'intereses', 'gastos por intereses', 'intereses pagados', 'resultado financiero',
    /gasto.*financier/i, /costo.*financier/i, /gasto.*interes/i, /interes.*pagad/i, /^interes/i
  ],
  utilidadAntesImpuestos: [
    'utilidad antes de impuestos', 'utilidad antes impuestos', 'resultado antes de impuestos',
    'ebt', 'ganancia antes de impuestos',
    /utilidad.*antes.*impuesto/i, /resultado.*antes/i, /^ebt$/i
  ],
  impuestos: [
    'impuestos', 'impuesto', 'impuesto sobre la renta', 'impuestos sobre la renta', 'isr', 'impuesto a las ganancias',
    'impuestos a las ganancias', 'provision para impuestos', 'gasto por impuesto a la renta', 'gasto por impuestos',
    /^impuesto(s)?$/i, /impuesto.*renta/i, /impuesto.*ganancia/i, /^isr$/i, /gasto.*impuesto/i, /provision.*impuesto/i
  ],
  utilidadNeta: [
    'utilidad neta', 'utilidad del ejercicio', 'resultado del ejercicio', 'ganancia neta',
    'resultado neto', 'beneficio neto', 'ganancia del periodo', 'utilidad neta del ejercicio',
    /utilidad.*neta/i, /resultado.*ejercicio/i, /ganancia.*neta/i, /resultado.*neto/i
  ]
};

export const slugify = (text: string) => {
  if (!text) return '';
  const normalized = normalizeAccountText(text);
  return normalized.replace(/\s+/g, '_').replace(/^_|_$/g, '');
};
