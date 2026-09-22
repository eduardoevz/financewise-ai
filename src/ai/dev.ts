'use server';

import { config } from 'dotenv';
config();

import '@/ai/flows/generate-financial-report.ts';
import '@/ai/flows/extract-from-image-flow.ts';
