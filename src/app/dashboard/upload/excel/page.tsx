'use client';

import { useState, useCallback, useMemo } from 'react';
import { useForm, FormProvider, useFieldArray, Controller, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as XLSX from 'xlsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Calculator,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import { LoadingSpinner } from '@/components/loading-spinner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { slugify, isAccountMatch, FINANCIAL_ACCOUNT_PATTERNS } from '@/lib/finance-accounts';
import { sanitizeFinancialNumber } from '@/lib/financial-sanitizer';
import { standardizeFinancialStatements } from '@/lib/financial-standardizer';
import { auditFinancialModel, type FinancialAuditReport } from '@/lib/financial-audit';
import { useAuth } from '@/hooks/use-auth';
import { saveFinancialData } from '@/lib/firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const parseFinancialNumber = sanitizeFinancialNumber;

const accountSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  periodoActual: z.preprocess(
    (val) => {
      if (val === null || val === undefined || String(val).trim() === '') return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      return parseFinancialNumber(val);
    },
    z.number({ invalid_type_error: 'Debe ser un número' }).optional().default(0)
  ),
  periodoAnterior: z.preprocess(
    (val) => {
      if (val === null || val === undefined || String(val).trim() === '') return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      return parseFinancialNumber(val);
    },
    z.number({ invalid_type_error: 'Debe ser un número' }).optional().default(0)
  ),
});

const formSchema = z.object({
  balanceSheet: z.array(accountSchema),
  incomeStatement: z.array(accountSchema),
});

type FormData = z.infer<typeof formSchema>;

interface ExtractedRow {
  name: string;
  periodoActual: number;
  periodoAnterior: number;
}

/**
 * Dynamic mapping classifier using semantic vocabulary, fuzzy matching and accounting patterns
 */
function classifyFinancialAccount(name: string): 'income' | 'balance' {
  // 1. Explicit Taxes Payable / Liabilities with 'pagar' -> Balance Sheet
  if (isAccountMatch(name, [/pagar/i, /cxp/i, /por.*pagar/i, /impuesto.*pagar/i, /isr.*pagar/i, /iva.*pagar/i, /retencion/i])) {
    return 'balance';
  }

  // 2. Explicit Tax Expense (Nominal Income Statement Account) -> Income Statement
  if (isAccountMatch(name, [
    /^impuesto(s)?$/i,
    /impuesto.*renta/i,
    /impuestos.*renta/i,
    /impuesto.*ganancia/i,
    /^isr$/i,
    /gasto.*impuesto/i,
    /provision.*impuesto/i,
    ...FINANCIAL_ACCOUNT_PATTERNS.impuestos,
  ])) {
    return 'income';
  }

  // 3. Other Explicit Income Statement accounts
  const isIncome = isAccountMatch(name, [
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
    /venta/i, /costo/i, /gasto/i, /ebit/i, /ebt/i,
    /depreciaci/i, /amortizaci/i,
    /impuesto.*renta/i, /isr/i, /impuesto.*ganancia/i,
    /interes/i,
    /sueldo/i, /salario/i, /honorario/i, /alquiler/i, /publicidad/i, /comision/i, /mantenimiento/i,
    /servicio.*publico/i, /flete/i, /seguro/i, /perdida/i, /ganancia/i, /otros.*ingreso/i, /otros.*gasto/i
  ]);

  if (isIncome) {
    return 'income';
  }

  // 4. Default Balance accounts
  return 'balance';
}

/**
 * Extracts structured account rows from a 2D sheet array supporting:
 * - Side-by-side multiple tables (e.g. Balance on left columns, Estado de Resultados on right columns)
 * - Stacked tables in the same sheet
 * - Standard 3-column / 4-column formats (Code, Account Name, Actual, Anterior)
 * - Automatic year sorting (higher year = actual)
 */
function extractAllTablesFromSheet(rows: any[][]): ExtractedRow[] {
  if (!rows || rows.length === 0) return [];

  const nonEmptyRows = rows.filter(r => Array.isArray(r) && r.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''));
  if (nonEmptyRows.length === 0) return [];

  const maxCols = Math.max(...nonEmptyRows.map(r => r.length));
  if (maxCols === 0) return [];

  const columnBlocks: { nameCol: number; actualCol: number; anteriorCol: number; startRow: number }[] = [];
  const candidateHeaders: { rowIdx: number; nameCol: number; actualCol: number; anteriorCol: number }[] = [];

  // Strategy 1: Look for explicit header rows across all columns in top 30 rows
  for (let r = 0; r < Math.min(30, nonEmptyRows.length); r++) {
    const row = nonEmptyRows[r];
    const yearCols: { col: number; year: number }[] = [];
    const nameCols: number[] = [];
    const actualCols: number[] = [];
    const anteriorCols: number[] = [];

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toLowerCase();
      if (!cell) continue;

      if (/^(cuenta|concepto|descripci|partida|rubro|nombre|detalle|item|rubros|código y cuenta|cuentas)/i.test(cell)) {
        nameCols.push(c);
      } else if (/\b(actual|presente|corriente|cierre|año actual)\b/i.test(cell) || (cell.includes('periodo') && cell.includes('actual'))) {
        actualCols.push(c);
      } else if (/\b(anterior|previo|pasado|año anterior)\b/i.test(cell) || (cell.includes('periodo') && cell.includes('anterior'))) {
        anteriorCols.push(c);
      }

      const yearMatch = cell.match(/\b(19\d\d|20\d\d)\b/);
      if (yearMatch) {
        yearCols.push({ col: c, year: parseInt(yearMatch[1], 10) });
      }
    }

    if (nameCols.length > 0) {
      for (const nCol of nameCols) {
        const nextNCol = nameCols.find(x => x > nCol) ?? maxCols;
        const localYears = yearCols.filter(y => y.col > nCol && y.col < nextNCol).sort((a, b) => b.year - a.year);
        const localActual = actualCols.find(a => a > nCol && a < nextNCol);
        const localAnterior = anteriorCols.find(a => a > nCol && a < nextNCol);

        let act = -1;
        let ant = -1;

        if (localYears.length >= 2) {
          act = localYears[0].col;
          ant = localYears[1].col;
        } else if (localActual !== undefined && localAnterior !== undefined) {
          act = localActual;
          ant = localAnterior;
        } else if (localYears.length === 1) {
          act = localYears[0].col;
          ant = act + 1 < nextNCol ? act + 1 : act - 1;
        } else {
          act = nCol + 1;
          ant = nCol + 2;
        }

        if (act !== -1 && ant !== -1 && act !== nCol && ant !== nCol && act !== ant && act < maxCols && ant < maxCols) {
          candidateHeaders.push({ rowIdx: r, nameCol: nCol, actualCol: act, anteriorCol: ant });
        }
      }
    } else if (yearCols.length >= 2) {
      yearCols.sort((a, b) => a.col - b.col);
      for (let i = 0; i < yearCols.length; i += 2) {
        const y1 = yearCols[i];
        const y2 = yearCols[i + 1];
        if (!y2) continue;

        const leftCol = Math.max(0, Math.min(y1.col, y2.col) - 1);
        const actCol = y1.year >= y2.year ? y1.col : y2.col;
        const antCol = y1.year < y2.year ? y1.col : y2.col;

        candidateHeaders.push({ rowIdx: r, nameCol: leftCol, actualCol: actCol, anteriorCol: antCol });
      }
    }
  }

  // De-duplicate candidate headers by column groups
  const seenColPairs = new Set<string>();
  for (const h of candidateHeaders) {
    const key = `${h.nameCol}-${h.actualCol}-${h.anteriorCol}`;
    if (!seenColPairs.has(key)) {
      seenColPairs.add(key);
      columnBlocks.push({ nameCol: h.nameCol, actualCol: h.actualCol, anteriorCol: h.anteriorCol, startRow: h.rowIdx + 1 });
    }
  }

  // Strategy 2: If no candidate headers found, detect column structure heuristically
  if (columnBlocks.length === 0) {
    let bestNameCol = 0;
    let bestActCol = 1;
    let bestAntCol = 2;

    let col0IsCode = 0;
    let col1IsText = 0;
    for (let r = 0; r < Math.min(15, nonEmptyRows.length); r++) {
      const c0 = String(nonEmptyRows[r][0] || '').trim();
      const c1 = String(nonEmptyRows[r][1] || '').trim();
      if (/^\d+(\.\d+)*$/.test(c0)) col0IsCode++;
      if (c1.length > 3 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(c1)) col1IsText++;
    }

    if (col0IsCode >= 2 && col1IsText >= 2) {
      bestNameCol = 1;
      bestActCol = 2;
      bestAntCol = 3;
    }

    columnBlocks.push({ nameCol: bestNameCol, actualCol: bestActCol, anteriorCol: bestAntCol, startRow: 0 });
  }

  const allExtracted: ExtractedRow[] = [];
  const titleBlacklistRegex = /^(comercial|empresa|balance general|estado de resultado|al \d|por el periodo|por los a|expresado en|cifras en|\(expresado|auditor|informe|moneda|periodo fiscal)/i;

  for (const block of columnBlocks) {
    const { nameCol, actualCol, anteriorCol, startRow } = block;

    for (let r = startRow; r < nonEmptyRows.length; r++) {
      const row = nonEmptyRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      let rawName = String(row[nameCol] ?? '').trim();
      if (!rawName) continue;

      // If name is purely code (e.g. "1101"), check if next column has description
      if (/^\d+(\.\d+)*$/.test(rawName) && row[nameCol + 1] && typeof row[nameCol + 1] === 'string' && /[a-zA-Z]/.test(String(row[nameCol + 1]))) {
        rawName = String(row[nameCol + 1]).trim();
      }

      // Skip metadata / titles
      if (titleBlacklistRegex.test(rawName)) continue;
      // Skip repeated header words
      if (/^(cuenta|descripci|concepto|nombre|partida|rubro|código|codigo)$/i.test(rawName)) continue;

      const actVal = parseFinancialNumber(row[actualCol]);
      const antVal = parseFinancialNumber(row[anteriorCol]);

      // Filter out pure section titles that have no numbers
      const isPureCategoryHeader = (actVal === 0 && antVal === 0) &&
        /^(activo|activos|activo circulante|activo corriente|activo no circulante|activo fijo|pasivo|pasivos|pasivo circulante|pasivo corriente|pasivo no circulante|capital|patrimonio|capital contable|gastos de operaci|gastos operativos|otros ingresos y gastos)$/i.test(rawName);

      if (!isPureCategoryHeader) {
        allExtracted.push({
          name: rawName,
          periodoActual: actVal,
          periodoAnterior: antVal,
        });
      }
    }
  }

  return allExtracted;
}

const DataTable = ({
  name,
  title,
  onMoveToOther
}: {
  name: 'balanceSheet' | 'incomeStatement',
  title: string,
  onMoveToOther?: (index: number) => void
}) => {
  const { control } = useFormContext<FormData>();
  const { fields, remove, append } = useFieldArray({ control, name });
  const otherStatementName = name === 'balanceSheet' ? 'Estado de Resultados' : 'Balance General';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          <Badge variant="outline">{fields.length} {fields.length === 1 ? 'cuenta' : 'cuentas'}</Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: '', periodoActual: 0, periodoAnterior: 0 })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar Cuenta
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-bold text-foreground">Cuenta</TableHead>
              <TableHead className="w-[180px] text-right font-bold text-foreground">Periodo Actual</TableHead>
              <TableHead className="w-[180px] text-right font-bold text-foreground">Periodo Anterior</TableHead>
              <TableHead className="w-[100px] text-center font-bold text-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id} className="hover:bg-muted/20">
                <TableCell>
                  <Controller
                    name={`${name}.${index}.name`}
                    control={control}
                    render={({ field }) => (
                      <Input {...field} placeholder="Nombre de la cuenta" className="font-medium" />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Controller
                    name={`${name}.${index}.periodoActual`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        className="text-right"
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Controller
                    name={`${name}.${index}.periodoAnterior`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        className="text-right"
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {onMoveToOther && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title={`Mover a ${otherStatementName}`}
                        onClick={() => onMoveToOther(index)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => remove(index)}
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay datos en esta hoja o no se pudieron leer. Puedes agregar cuentas manualmente con el botón superior.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};


export default function ExcelUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [showData, setShowData] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      balanceSheet: [],
      incomeStatement: [],
    },
  });

  const { handleSubmit, reset, watch, getValues, setValue } = methods;

  const watchedBalance = watch('balanceSheet');
  const watchedIncome = watch('incomeStatement');

  // Move account row between Balance Sheet and Income Statement
  const handleMoveRow = (from: 'balanceSheet' | 'incomeStatement', index: number) => {
    const currentFrom = getValues(from) || [];
    const currentTo = getValues(from === 'balanceSheet' ? 'incomeStatement' : 'balanceSheet') || [];
    const itemToMove = currentFrom[index];
    if (!itemToMove) return;

    const newFrom = currentFrom.filter((_, idx) => idx !== index);
    const newTo = [...currentTo, itemToMove];

    setValue(from, newFrom);
    setValue(from === 'balanceSheet' ? 'incomeStatement' : 'balanceSheet', newTo);

    toast({
      title: 'Cuenta reclasificada',
      description: `"${itemToMove.name}" se movió a ${from === 'balanceSheet' ? 'Estado de Resultados' : 'Balance General'}.`,
    });
  };

  // Compute Standardized Model and Audit Diagnostic in real-time
  const { standardizedModel, auditReport } = useMemo(() => {
    if (!watchedBalance && !watchedIncome) {
      return { standardizedModel: null, auditReport: null };
    }

    const bsActual: Record<string, number> = {};
    const bsAnterior: Record<string, number> = {};
    const isActual: Record<string, number> = {};
    const isAnterior: Record<string, number> = {};

    (watchedBalance || []).forEach((item) => {
      if (!item.name || !item.name.trim()) return;
      const slug = slugify(item.name);
      if (!slug) return;
      bsActual[slug] = (bsActual[slug] || 0) + parseFinancialNumber(item.periodoActual);
      bsAnterior[slug] = (bsAnterior[slug] || 0) + parseFinancialNumber(item.periodoAnterior);
    });

    (watchedIncome || []).forEach((item) => {
      if (!item.name || !item.name.trim()) return;
      const slug = slugify(item.name);
      if (!slug) return;
      isActual[slug] = (isActual[slug] || 0) + parseFinancialNumber(item.periodoActual);
      isAnterior[slug] = (isAnterior[slug] || 0) + parseFinancialNumber(item.periodoAnterior);
    });

    const model = standardizeFinancialStatements({
      balanceSheet: { periodoActual: bsActual, periodoAnterior: bsAnterior },
      incomeStatement: { periodoActual: isActual, periodoAnterior: isAnterior }
    });

    const audit = auditFinancialModel(model);

    return { standardizedModel: model, auditReport: audit };
  }, [watchedBalance, watchedIncome]);

  const parseWorkbook = (workbook: XLSX.WorkBook) => {
    let balanceRows: ExtractedRow[] = [];
    let incomeRows: ExtractedRow[] = [];

    const sheetNames = workbook.SheetNames;

    // Scan ALL sheets in the workbook to capture multi-sheet, side-by-side, or single-sheet workbooks
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const raw2D: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const extracted = extractAllTablesFromSheet(raw2D);
      if (extracted.length === 0) continue;

      const isSheetExplicitIncome = /resultado|er|pyg|p&g|ganancia|perdid|ingreso|rendimiento|income/i.test(sheetName);
      const isSheetExplicitBalance = /balance|bg|situaci|posici/i.test(sheetName);

      for (const item of extracted) {
        const category = classifyFinancialAccount(item.name);

        if (category === 'income') {
          incomeRows.push(item);
        } else if (category === 'balance') {
          balanceRows.push(item);
        } else if (isSheetExplicitIncome) {
          incomeRows.push(item);
        } else if (isSheetExplicitBalance) {
          balanceRows.push(item);
        } else {
          balanceRows.push(item);
        }
      }
    }

    // Deduplicate exact rows (same name and values)
    const deduplicateRows = (list: ExtractedRow[]) => {
      const seen = new Set<string>();
      const result: ExtractedRow[] = [];
      for (const r of list) {
        const key = `${r.name.trim().toLowerCase()}_${r.periodoActual}_${r.periodoAnterior}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(r);
        }
      }
      return result;
    };

    balanceRows = deduplicateRows(balanceRows);
    incomeRows = deduplicateRows(incomeRows);

    return { balanceRows, incomeRows };
  };

  const parseFile = (fileToParse: File) => {
    setParsing(true);
    setShowData(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        const { balanceRows, incomeRows } = parseWorkbook(workbook);

        reset({
          balanceSheet: balanceRows,
          incomeStatement: incomeRows,
        });

        if (balanceRows.length > 0 || incomeRows.length > 0) {
          toast({
            title: 'Archivo leído exitosamente',
            description: `Se detectaron ${balanceRows.length} cuentas en Balance General y ${incomeRows.length} en Estado de Resultados.`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'No se detectaron datos',
            description: 'No pudimos extraer cuentas del archivo. Verifica que las columnas contengan cuentas y periodos.',
          });
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          variant: 'destructive',
          title: 'Error al leer el archivo',
          description: 'El formato del archivo podría ser incorrecto o estar protegido.',
        });
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setParsing(false);
      toast({
        variant: 'destructive',
        title: 'Error de Lectura',
        description: 'No se pudo leer el archivo.',
      });
    };

    reader.readAsArrayBuffer(fileToParse);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const isValid = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
      if (isValid) {
        setFile(selectedFile);
        parseFile(selectedFile);
      } else {
        toast({
          variant: 'destructive',
          title: 'Archivo no válido',
          description: 'Por favor, sube un archivo .xlsx, .xls o .csv.',
        });
      }
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const isValid = validExtensions.some(ext => droppedFile.name.toLowerCase().endsWith(ext));
      if (isValid) {
        setFile(droppedFile);
        parseFile(droppedFile);
      } else {
        toast({
          variant: 'destructive',
          title: 'Archivo no válido',
          description: 'Por favor, sube un archivo .xlsx, .xls o .csv.',
        });
      }
    }
  }, []);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const getFinancialData = (data: FormData) => {
    const bsActual: Record<string, number> = {};
    const bsAnterior: Record<string, number> = {};
    const isActual: Record<string, number> = {};
    const isAnterior: Record<string, number> = {};

    // Process Balance Sheet inputs
    data.balanceSheet.forEach((item) => {
      if (!item.name || !item.name.trim()) return;
      const slug = slugify(item.name);
      if (!slug) return;
      const act = parseFinancialNumber(item.periodoActual);
      const ant = parseFinancialNumber(item.periodoAnterior);

      if (classifyFinancialAccount(item.name) === 'income') {
        isActual[slug] = (isActual[slug] || 0) + act;
        isAnterior[slug] = (isAnterior[slug] || 0) + ant;
      } else {
        bsActual[slug] = (bsActual[slug] || 0) + act;
        bsAnterior[slug] = (bsAnterior[slug] || 0) + ant;
      }
    });

    // Process Income Statement inputs
    data.incomeStatement.forEach((item) => {
      if (!item.name || !item.name.trim()) return;
      const slug = slugify(item.name);
      if (!slug) return;
      const act = parseFinancialNumber(item.periodoActual);
      const ant = parseFinancialNumber(item.periodoAnterior);

      if (classifyFinancialAccount(item.name) === 'balance') {
        bsActual[slug] = (bsActual[slug] || 0) + act;
        bsAnterior[slug] = (bsAnterior[slug] || 0) + ant;
      } else {
        isActual[slug] = (isActual[slug] || 0) + act;
        isAnterior[slug] = (isAnterior[slug] || 0) + ant;
      }
    });

    return {
      balanceSheet: {
        periodoActual: bsActual,
        periodoAnterior: bsAnterior,
      },
      incomeStatement: {
        periodoActual: isActual,
        periodoAnterior: isAnterior,
      },
    };
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error de autenticación' });
      return;
    }
    setLoading(true);
    try {
      const financialData = getFinancialData(data);

      const hasBalanceData =
        Object.keys(financialData.balanceSheet.periodoActual).length > 0 ||
        Object.keys(financialData.balanceSheet.periodoAnterior).length > 0;
      const hasIncomeData =
        Object.keys(financialData.incomeStatement.periodoActual).length > 0 ||
        Object.keys(financialData.incomeStatement.periodoAnterior).length > 0;

      if (!hasBalanceData && !hasIncomeData) {
        toast({
          variant: 'destructive',
          title: 'Datos Vacíos',
          description: 'No se encontraron datos para analizar. Revisa tu archivo Excel.',
        });
        setLoading(false);
        return;
      }

      const reportId = await saveFinancialData(user.uid, financialData);
      toast({ title: 'Datos guardados', description: 'Iniciando análisis financiero con IA.' });
      router.push(`/dashboard/analysis?reportId=${reportId}`);
    } catch (e) {
      console.error('Error saving data: ', e);
      toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudieron guardar los datos.' });
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setShowData(false);
    reset({ balanceSheet: [], incomeStatement: [] });
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background text-foreground">
        <main className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
              >
                <ArrowLeft size={16} />
                Volver al Panel
              </Link>
              <div className="flex items-center gap-4">
                <FileSpreadsheet className="w-10 h-10 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Carga con Excel</h1>
                  <p className="text-muted-foreground">
                    Sube tu Balance General y Estado de Resultados en formato .xlsx, .xls o .csv con mapeo semántico y diagnóstico automático.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <form onSubmit={handleSubmit(onSubmit)}>
                <CardHeader>
                  <CardTitle>Paso 1: Sube tu archivo</CardTitle>
                  <CardDescription>
                    Arrastra o selecciona tu archivo de Excel. Nuestro motor de ingestión detecta automáticamente formatos de columnas, nombres alternativos, códigos y signos contables.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!file ? (
                    <div
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold">Arrastra y suelta tu archivo aquí</p>
                      <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar (.xlsx, .xls, .csv)</p>
                      <Input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={handleClear}>
                        <XCircle className="w-5 h-5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </CardContent>

                {showData && (
                  <CardContent className="space-y-6">
                    <div>
                      <CardTitle className="mb-2">Paso 2: Diagnóstico y Verificación de Cuentas</CardTitle>
                      <CardDescription>
                        Revisa la asignación automática. Si una cuenta pertenece al otro estado, usa el botón de reclasificación <ArrowRightLeft className="inline h-3.5 w-3.5 text-primary" /> para moverla al instante.
                      </CardDescription>
                    </div>

                    {/* Financial Audit Diagnostic Summary Banner */}
                    {auditReport && (
                      <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {auditReport.isValid ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                            <div>
                              <h4 className="text-sm font-bold text-foreground">
                                {auditReport.isValid
                                  ? 'Estructura Financiera Completa para Análisis'
                                  : 'Diagnóstico de Integridad Financiera'}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {auditReport.summary.totalWarnings === 0
                                  ? 'Todas las partidas clave para DuPont, Punto de Equilibrio y Apalancamiento están disponibles.'
                                  : `Se identificaron ${auditReport.summary.totalWarnings} observaciones sobre la completitud de las cuentas.`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={auditReport.balanceBalanceSquare.periodoActual.isCuadrado ? 'outline' : 'destructive'} className="text-xs">
                              {auditReport.balanceBalanceSquare.periodoActual.isCuadrado
                                ? '✓ Balance Cuadrado'
                                : `⚠️ Dif. Balance: $${auditReport.balanceBalanceSquare.periodoActual.diferencia.toLocaleString('es-ES')}`}
                            </Badge>
                          </div>
                        </div>

                        {/* Warnings List */}
                        {auditReport.warnings.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border/60">
                            {auditReport.warnings.map((w) => (
                              <div key={w.id} className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-background border">
                                {w.severity === 'error' ? (
                                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                ) : w.severity === 'warning' ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                )}
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-foreground">[{w.moduleTitle}] {w.message}</span>
                                  <p className="text-muted-foreground text-[11px]">{w.remedy}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {parsing ? (
                      <div className="flex items-center justify-center gap-3 p-12 border rounded-lg">
                        <LoadingSpinner />
                        <p className="text-muted-foreground">Leyendo y estandarizando cuentas de tu archivo Excel...</p>
                      </div>
                    ) : (
                      <Tabs defaultValue="balance">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="balance" className="flex items-center gap-2">
                            Balance General
                            <Badge variant="secondary" className="text-xs">
                              {watchedBalance?.length ?? 0}
                            </Badge>
                          </TabsTrigger>
                          <TabsTrigger value="income" className="flex items-center gap-2">
                            Estado de Resultados
                            <Badge variant="secondary" className="text-xs">
                              {watchedIncome?.length ?? 0}
                            </Badge>
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="balance" className="pt-6">
                          <DataTable
                            name="balanceSheet"
                            title="Balance General Extraído"
                            onMoveToOther={(index) => handleMoveRow('balanceSheet', index)}
                          />
                        </TabsContent>
                        <TabsContent value="income" className="pt-6">
                          <DataTable
                            name="incomeStatement"
                            title="Estado de Resultados Extraído"
                            onMoveToOther={(index) => handleMoveRow('incomeStatement', index)}
                          />
                        </TabsContent>
                      </Tabs>
                    )}
                  </CardContent>
                )}

                <CardFooter className="flex justify-end pt-4">
                  <Button type="submit" disabled={loading || parsing || !file}>
                    {loading ? <LoadingSpinner className="mr-2" /> : null}
                    Guardar y Analizar
                    <Calculator size={16} className="ml-2" />
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </main>
      </div>
    </FormProvider>
  );
}
