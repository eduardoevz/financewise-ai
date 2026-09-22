'use client';

import { useState } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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
import { ArrowLeft, Calculator, FileText, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/loading-spinner';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/finance-accounts';
import { useAuth } from '@/hooks/use-auth';
import { saveFinancialData } from '@/lib/firebase/firestore';


const accountSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  periodoActual: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(String(val).replace(/,/g, ''))),
    z.number({ invalid_type_error: 'Debe ser un número' }).optional().default(0)
  ),
  periodoAnterior: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(String(val).replace(/,/g, ''))),
    z.number({ invalid_type_error: 'Debe ser un número' }).optional().default(0)
  ),
});

const accountGroupSchema = z.array(accountSchema);

const formSchema = z.object({
  balanceSheet: z.object({
    activoCirculante: accountGroupSchema,
    activoNoCirculante: accountGroupSchema,
    pasivoCirculante: accountGroupSchema,
    pasivoNoCirculante: accountGroupSchema,
    patrimonio: accountGroupSchema,
  }),
  incomeStatement: z.object({
      ingresos: accountGroupSchema,
      costoDeVentas: accountGroupSchema,
      gastosOperativos: accountGroupSchema,
      otrosIngresosGastos: accountGroupSchema,
      impuestos: accountGroupSchema,
  })
});

type FormData = z.infer<typeof formSchema>;


const AccountSection = ({ name, title }: { name: `balanceSheet.${string}` | `incomeStatement.${string}`; title: string }) => {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-bold text-lg text-foreground">{title}</TableHead>
          <TableHead className="w-[150px] text-right">Periodo Actual</TableHead>
          <TableHead className="w-[150px] text-right">Periodo Anterior</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.map((field, index) => (
          <TableRow key={field.id}>
            <TableCell>
              <Controller
                name={`${name}.${index}.name`}
                control={control}
                render={({ field }) => <Input {...field} placeholder="Nombre de la cuenta" />}
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
                    step="0.01"
                    placeholder="0.00"
                    className="text-right"
                    onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)}
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
                    step="0.01"
                    placeholder="0.00"
                    className="text-right"
                    onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)}
                    value={field.value ?? ''}
                  />
                )}
              />
            </TableCell>
            <TableCell>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
            <TableCell colSpan={4}>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', periodoActual: 0, periodoAnterior: 0 })}>
                    <Plus className="mr-2 h-4 w-4" /> Añadir Cuenta
                </Button>
            </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

const TotalRow = ({ label, value1, value2 }: { label: string, value1: number, value2: number }) => (
    <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell className="font-bold text-primary">{label}</TableCell>
        <TableCell className="text-right font-bold text-primary pr-4">{value1.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
        <TableCell className="text-right font-bold text-primary pr-4">{value2.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
        <TableCell></TableCell>
    </TableRow>
);

const BalanceSheetForm = () => {
  const { control } = useFormContext();
  const formValues = useWatch({ control, name: 'balanceSheet' });

  const sumAmounts = (accounts: { name: string, periodoActual: number, periodoAnterior: number }[] | undefined, period: 'periodoActual' | 'periodoAnterior') => 
    accounts ? accounts.reduce((acc, curr) => acc + (Number(curr[period]) || 0), 0) : 0;

  const totalActivoCirculanteA = sumAmounts(formValues.activoCirculante, 'periodoActual');
  const totalActivoCirculanteB = sumAmounts(formValues.activoCirculante, 'periodoAnterior');
  const totalActivoNoCirculanteA = sumAmounts(formValues.activoNoCirculante, 'periodoActual');
  const totalActivoNoCirculanteB = sumAmounts(formValues.activoNoCirculante, 'periodoAnterior');
  const totalActivoA = totalActivoCirculanteA + totalActivoNoCirculanteA;
  const totalActivoB = totalActivoCirculanteB + totalActivoNoCirculanteB;

  const totalPasivoCirculanteA = sumAmounts(formValues.pasivoCirculante, 'periodoActual');
  const totalPasivoCirculanteB = sumAmounts(formValues.pasivoCirculante, 'periodoAnterior');
  const totalPasivoNoCirculanteA = sumAmounts(formValues.pasivoNoCirculante, 'periodoActual');
  const totalPasivoNoCirculanteB = sumAmounts(formValues.pasivoNoCirculante, 'periodoAnterior');
  const totalPasivoA = totalPasivoCirculanteA + totalPasivoNoCirculanteA;
  const totalPasivoB = totalPasivoCirculanteB + totalPasivoNoCirculanteB;
  
  const totalPatrimonioA = sumAmounts(formValues.patrimonio, 'periodoActual');
  const totalPatrimonioB = sumAmounts(formValues.patrimonio, 'periodoAnterior');
  const totalPasivoPatrimonioA = totalPasivoA + totalPatrimonioA;
  const totalPasivoPatrimonioB = totalPasivoB + totalPatrimonioB;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
      {/* Activos */}
      <div className="space-y-4">
        <AccountSection name="balanceSheet.activoCirculante" title="Activo Circulante" />
        <Table><TableBody><TotalRow label="Total Activo Circulante" value1={totalActivoCirculanteA} value2={totalActivoCirculanteB} /></TableBody></Table>
        <Separator />
        <AccountSection name="balanceSheet.activoNoCirculante" title="Activo No Circulante" />
        <Table><TableBody><TotalRow label="Total Activo No Circulante" value1={totalActivoNoCirculanteA} value2={totalActivoNoCirculanteB} /></TableBody></Table>
        <Separator />
        <Table><TableBody><TotalRow label="TOTAL ACTIVO" value1={totalActivoA} value2={totalActivoB} /></TableBody></Table>
      </div>

      {/* Pasivos y Patrimonio */}
      <div className="space-y-4">
        <AccountSection name="balanceSheet.pasivoCirculante" title="Pasivo Circulante" />
        <Table><TableBody><TotalRow label="Total Pasivo Circulante" value1={totalPasivoCirculanteA} value2={totalPasivoCirculanteB} /></TableBody></Table>
        <Separator />
        <AccountSection name="balanceSheet.pasivoNoCirculante" title="Pasivo No Circulante" />
        <Table><TableBody><TotalRow label="Total Pasivo No Circulante" value1={totalPasivoNoCirculanteA} value2={totalPasivoNoCirculanteB} /></TableBody></Table>
        <Separator />
        <Table><TableBody><TotalRow label="Total Pasivo" value1={totalPasivoA} value2={totalPasivoB} /></TableBody></Table>
        <Separator />
        <AccountSection name="balanceSheet.patrimonio" title="Patrimonio" />
        <Table><TableBody><TotalRow label="Total Patrimonio" value1={totalPatrimonioA} value2={totalPatrimonioB} /></TableBody></Table>
        <Separator />
        <Table><TableBody><TotalRow label="TOTAL PASIVO Y PATRIMONIO" value1={totalPasivoPatrimonioA} value2={totalPasivoPatrimonioB} /></TableBody></Table>
      </div>
    </div>
  );
};

const IncomeStatementForm = () => {
    const { control } = useFormContext();
    const formValues = useWatch({ control, name: 'incomeStatement' });

    const sumAmounts = (accounts: { name: string, periodoActual: number, periodoAnterior: number }[] | undefined, period: 'periodoActual' | 'periodoAnterior') => 
      accounts ? accounts.reduce((acc, curr) => acc + (Number(curr[period]) || 0), 0) : 0;

    const totalIngresosA = sumAmounts(formValues.ingresos, 'periodoActual');
    const totalIngresosB = sumAmounts(formValues.ingresos, 'periodoAnterior');
    const totalCostoDeVentasA = sumAmounts(formValues.costoDeVentas, 'periodoActual');
    const totalCostoDeVentasB = sumAmounts(formValues.costoDeVentas, 'periodoAnterior');
    const utilidadBrutaA = totalIngresosA - totalCostoDeVentasA;
    const utilidadBrutaB = totalIngresosB - totalCostoDeVentasB;

    const totalGastosOperativosA = sumAmounts(formValues.gastosOperativos, 'periodoActual');
    const totalGastosOperativosB = sumAmounts(formValues.gastosOperativos, 'periodoAnterior');
    const utilidadOperativaA = utilidadBrutaA - totalGastosOperativosA;
    const utilidadOperativaB = utilidadBrutaB - totalGastosOperativosB;
    
    const totalOtrosIngresosGastosA = sumAmounts(formValues.otrosIngresosGastos, 'periodoActual');
    const totalOtrosIngresosGastosB = sumAmounts(formValues.otrosIngresosGastos, 'periodoAnterior');
    const utilidadAntesImpuestosA = utilidadOperativaA + totalOtrosIngresosGastosA;
    const utilidadAntesImpuestosB = utilidadOperativaB + totalOtrosIngresosGastosB;

    const totalImpuestosA = sumAmounts(formValues.impuestos, 'periodoActual');
    const totalImpuestosB = sumAmounts(formValues.impuestos, 'periodoAnterior');
    const utilidadNetaA = utilidadAntesImpuestosA - totalImpuestosA;
    const utilidadNetaB = utilidadAntesImpuestosB - totalImpuestosB;
    
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <AccountSection name="incomeStatement.ingresos" title="Ingresos" />
        <Table><TableBody><TotalRow label="Total Ingresos" value1={totalIngresosA} value2={totalIngresosB} /></TableBody></Table>
        <Separator />
        <AccountSection name="incomeStatement.costoDeVentas" title="Costo de Ventas" />
        <Table><TableBody><TotalRow label="Utilidad Bruta" value1={utilidadBrutaA} value2={utilidadBrutaB} /></TableBody></Table>
        <Separator />
        <AccountSection name="incomeStatement.gastosOperativos" title="Gastos Operativos" />
        <Table><TableBody><TotalRow label="Utilidad Operativa" value1={utilidadOperativaA} value2={utilidadOperativaB} /></TableBody></Table>
        <Separator />
        <AccountSection name="incomeStatement.otrosIngresosGastos" title="Otros Ingresos y Gastos" />
        <Table><TableBody><TotalRow label="Utilidad Antes de Impuestos" value1={utilidadAntesImpuestosA} value2={utilidadAntesImpuestosB} /></TableBody></Table>
        <Separator />
        <AccountSection name="incomeStatement.impuestos" title="Impuestos" />
        <Table><TableBody><TotalRow label="Utilidad Neta" value1={utilidadNetaA} value2={utilidadNetaB} /></TableBody></Table>
      </div>
    );
}

export default function ManualUploadPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      balanceSheet: {
        activoCirculante: [],
        activoNoCirculante: [],
        pasivoCirculante: [],
        pasivoNoCirculante: [],
        patrimonio: [],
      },
      incomeStatement: {
        ingresos: [],
        costoDeVentas: [],
        gastosOperativos: [],
        otrosIngresosGastos: [],
        impuestos: [],
      }
    }
  });

  const getFinancialData = (data: FormData) => {
    const flattenAccounts = (accountGroups: { [key: string]: { name: string, periodoActual: number, periodoAnterior: number }[] }) => {
        let periodos: { periodoActual: Record<string, number>, periodoAnterior: Record<string, number> } = {
            periodoActual: {},
            periodoAnterior: {}
        };
        Object.values(accountGroups).forEach(group => {
            group.forEach(item => {
                if (item.name) {
                    const slug = slugify(item.name);
                    periodos.periodoActual[slug] = item.periodoActual || 0;
                    periodos.periodoAnterior[slug] = item.periodoAnterior || 0;
                }
            });
        });
        return periodos;
    };

    return {
        balanceSheet: flattenAccounts(data.balanceSheet),
        incomeStatement: flattenAccounts(data.incomeStatement),
    };
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Error de autenticación",
            description: "Debes iniciar sesión para guardar los datos."
        });
        return;
    }

    setLoading(true);
    try {
        const financialData = getFinancialData(data);
        
        const reportId = await saveFinancialData(user.uid, financialData);
        
        toast({
            title: "Datos guardados",
            description: "Tus datos financieros se han guardado correctamente. Iniciando análisis..."
        });
        router.push(`/dashboard/analysis?reportId=${reportId}`);
    } catch(e) {
        console.error("Error processing or saving data: ", e);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "No se pudieron guardar los datos. Revisa la consola para más detalles."
        })
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
             <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4">
                <ArrowLeft size={16} />
                Volver al Panel
            </Link>
            <div className="flex items-center gap-4">
                <FileText className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Carga Manual de Datos
                    </h1>
                    <p className="text-muted-foreground">
                        Añade tus cuentas e ingresa los montos de tus estados financieros para ambos periodos.
                    </p>
                </div>
            </div>
          </div>

          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <Card>
                <CardContent className="pt-6">
                  <Tabs defaultValue="balance">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="balance">Balance General</TabsTrigger>
                      <TabsTrigger value="income">Estado de Resultados</TabsTrigger>
                    </TabsList>
                    <TabsContent value="balance" className="pt-6">
                      <BalanceSheetForm />
                    </TabsContent>
                    <TabsContent value="income" className="pt-6">
                      <IncomeStatementForm />
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading && <LoadingSpinner className="mr-2" />}
                    Guardar y Analizar
                    <Calculator size={16} className="ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </FormProvider>
        </div>
      </main>
    </div>
  );
}
