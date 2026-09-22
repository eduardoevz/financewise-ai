'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, FormProvider, useFieldArray, Controller, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Camera, Calculator, FileImage, RefreshCw, Trash2, Upload, VideoOff } from 'lucide-react';
import { LoadingSpinner } from '@/components/loading-spinner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/finance-accounts';
import { useAuth } from '@/hooks/use-auth';
import { saveFinancialData } from '@/lib/firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { extractFinancialDataFromImage, type ExtractFromImageOutput } from '@/ai/flows/extract-from-image-flow';

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


const formSchema = z.object({
  balanceSheet: z.array(accountSchema),
  incomeStatement: z.array(accountSchema),
});

type FormData = z.infer<typeof formSchema>;

const DataTable = ({ name, title }: { name: 'balanceSheet' | 'incomeStatement', title: string }) => {
  const { control } = useFormContext<FormData>();
  const { fields, remove } = useFieldArray({ control, name });

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className='font-bold text-lg text-foreground'>{title}</TableHead>
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
                 {fields.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                            No se extrajeron datos para esta sección.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );
};


export default function PhotoUploadPage() {
  const [image, setImage] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractFromImageOutput | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { balanceSheet: [], incomeStatement: [] },
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (extractedData) {
      reset({
        balanceSheet: extractedData.balanceSheet,
        incomeStatement: extractedData.incomeStatement
      });
    }
  }, [extractedData, reset]);

  const getCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Cámara no soportada' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acceso a cámara denegado',
        description: 'Por favor, activa los permisos de cámara en tu navegador.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    getCameraPermission();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUri = canvas.toDataURL('image/jpeg');
      setImage(dataUri);
      stopCamera();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleExtract = async () => {
    if (!image) return;
    setIsExtracting(true);
    try {
      const result = await extractFinancialDataFromImage({ photoDataUri: image });
      setExtractedData(result);
      toast({ title: 'Datos Extraídos', description: 'Revisa y ajusta los datos a continuación.' });
    } catch (error: any) {
      console.error("Error extracting data:", error);
      toast({ variant: 'destructive', title: 'Error de Extracción', description: error.message || 'No se pudo procesar la imagen.' });
    } finally {
      setIsExtracting(false);
    }
  };

  const getFinancialDataFromForm = (data: FormData) => {
    const flattenAccounts = (accounts: { name: string; periodoActual: number, periodoAnterior: number }[]) => {
      let periodos: { periodoActual: Record<string, number>, periodoAnterior: Record<string, number> } = {
          periodoActual: {},
          periodoAnterior: {}
      };
      accounts.forEach(item => {
          if (item.name) {
              const slug = slugify(item.name);
              periodos.periodoActual[slug] = item.periodoActual || 0;
              periodos.periodoAnterior[slug] = item.periodoAnterior || 0;
          }
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
      toast({ variant: "destructive", title: "Error de autenticación" });
      return;
    }
    setIsSubmitting(true);
    try {
      const financialData = getFinancialDataFromForm(data);
      
      const hasBalanceData = Object.keys(financialData.balanceSheet.periodoActual).length > 0 || Object.keys(financialData.balanceSheet.periodoAnterior).length > 0;
      const hasIncomeData = Object.keys(financialData.incomeStatement.periodoActual).length > 0 || Object.keys(financialData.incomeStatement.periodoAnterior).length > 0;

      if (!hasBalanceData && !hasIncomeData) {
        toast({ variant: "destructive", title: "Datos Vacíos", description: "No se encontraron datos para analizar." });
        setIsSubmitting(false);
        return;
      }
      
      const reportId = await saveFinancialData(user.uid, financialData);
      toast({ title: "Datos guardados", description: "Iniciando análisis de IA." });
      router.push(`/dashboard/analysis?reportId=${reportId}`);
    } catch (e) {
      console.error("Error saving data: ", e);
      toast({ variant: "destructive", title: "Error al guardar", description: "No se pudieron guardar los datos." });
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setImage(null);
    setExtractedData(null);
    reset({ balanceSheet: [], incomeStatement: [] });
    getCameraPermission();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4">
              <ArrowLeft size={16} /> Volver al Panel
            </Link>
            <div className="flex items-center gap-4">
              <Camera className="w-10 h-10 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Carga con Foto</h1>
                <p className="text-muted-foreground">Captura o sube una imagen de tus estados financieros.</p>
              </div>
            </div>
          </div>
          
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>Paso 1: Captura o Sube una Imagen</CardTitle>
                  <CardDescription>Usa tu cámara para tomar una foto o selecciona un archivo de tu dispositivo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="relative aspect-video border rounded-lg bg-muted flex items-center justify-center">
                        {!image ? (
                            <>
                                <video ref={videoRef} className="w-full h-full object-cover rounded-md" autoPlay muted playsInline />
                                <canvas ref={canvasRef} className="hidden" />
                                {hasCameraPermission === false && (
                                    <div className="absolute text-center p-4">
                                        <VideoOff className="w-12 h-12 text-destructive mx-auto mb-2"/>
                                        <p className="font-semibold text-destructive">Cámara no disponible</p>
                                        <p className="text-sm text-muted-foreground">Revisa los permisos de tu navegador.</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <img src={image} alt="Documento capturado" className="w-full h-full object-contain rounded-md" />
                        )}
                    </div>
                    <div className="flex flex-col justify-center gap-4">
                       {!image ? (
                        <>
                            <Button type="button" onClick={handleCapture} disabled={hasCameraPermission === false}>
                                <Camera className="mr-2"/> Capturar Foto
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                <FileImage className="mr-2"/> Subir desde Archivo
                            </Button>
                            <Input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        </>
                       ) : (
                        <>
                            <Button type="button" onClick={handleRetake}>
                                <RefreshCw className="mr-2"/> Tomar de Nuevo / Subir Otra
                            </Button>
                            <Button type="button" onClick={handleExtract} disabled={isExtracting}>
                                {isExtracting ? <LoadingSpinner className="mr-2" /> : <div className="mr-2 w-4 h-4"/>}
                                Extraer Datos con IA
                            </Button>
                        </>
                       )}
                    </div>
                  </div>
                </CardContent>

                {extractedData && (
                  <CardContent>
                    <CardTitle className="mb-2">Paso 2: Verifica los Datos Extraídos</CardTitle>
                    <CardDescription className="mb-4">
                      La IA ha procesado la imagen. Revisa y ajusta las cuentas y montos si es necesario antes de analizar.
                    </CardDescription>
                     <Tabs defaultValue="balance">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="balance">Balance General</TabsTrigger>
                          <TabsTrigger value="income">Estado de Resultados</TabsTrigger>
                        </TabsList>
                        <TabsContent value="balance" className="pt-6">
                          <DataTable name="balanceSheet" title="Balance General Extraído" />
                        </TabsContent>
                        <TabsContent value="income" className="pt-6">
                          <DataTable name="incomeStatement" title="Estado de Resultados Extraído" />
                        </TabsContent>
                      </Tabs>
                  </CardContent>
                )}
                 <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={!extractedData || isSubmitting}>
                        {isSubmitting ? <LoadingSpinner className="mr-2" /> : <div className="w-4 h-4 mr-2" />}
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
