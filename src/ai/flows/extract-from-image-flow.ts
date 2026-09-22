'use server';
/**
 * @fileOverview A flow for extracting financial data from an image using a multimodal AI model.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AccountSchema = z.object({
  name: z.string().describe('El nombre de la cuenta financiera.'),
  periodoActual: z.number().describe('El monto numérico para el periodo o columna más reciente. Si solo hay un periodo, usa este campo.'),
  periodoAnterior: z.number().describe('El monto numérico para el periodo o columna anterior/antiguo. Si no existe, devuelve 0.'),
});

const ExtractedDataSchema = z.object({
  balanceSheet: z.array(AccountSchema).describe('Lista de cuentas extraídas del Balance General.'),
  incomeStatement: z.array(AccountSchema).describe('Lista de cuentas extraídas del Estado de Resultados.'),
});

const ExtractFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Una foto de un estado financiero, como un data URI que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ExtractFromImageInput = z.infer<typeof ExtractFromImageInputSchema>;

export type ExtractFromImageOutput = z.infer<typeof ExtractedDataSchema>;

export async function extractFinancialDataFromImage(input: ExtractFromImageInput): Promise<ExtractFromImageOutput> {
  return extractFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractFromImagePrompt',
  input: { schema: ExtractFromImageInputSchema },
  output: { schema: ExtractedDataSchema },
  prompt: `Eres un experto en Contabilidad y OCR. Tu tarea es analizar la siguiente imagen de un documento financiero. Extrae todas las cuentas y sus montos correspondientes, tanto del Balance General como del Estado de Resultados.

Debes identificar a qué sección pertenece cada cuenta. La imagen puede contener uno o dos periodos (columnas de montos).

- Si hay dos periodos, extrae ambos. El más reciente es 'periodoActual' y el más antiguo es 'periodoAnterior'.
- Si solo hay un periodo, extrae sus valores en el campo 'periodoActual' y asigna 0 al campo 'periodoAnterior'.
- Ignora los subtotales y totales, solo extrae las cuentas individuales.
- Si una cuenta no tiene un valor claro, puedes omitirla. Sé lo más preciso posible.

Imagen del documento: {{media url=photoDataUri}}`,
});

const extractFromImageFlow = ai.defineFlow(
  {
    name: 'extractFromImageFlow',
    inputSchema: ExtractFromImageInputSchema,
    outputSchema: ExtractedDataSchema,
  },
  async ({ photoDataUri }) => {
    const { output } = await prompt({ photoDataUri });
    if (!output) {
      throw new Error("La IA no pudo extraer datos de la imagen.");
    }
    return output;
  }
);
