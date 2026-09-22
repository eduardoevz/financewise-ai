'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';
import React from 'react';

/**
 * A component that safely renders an HTML string as content.
 * It uses React's dangerouslySetInnerHTML feature.
 * @param content The HTML string to render.
 */
const HtmlRenderer = ({ content }: { content: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

interface ReportDisplayProps {
  report: string;
}

export function ReportDisplay({ report }: ReportDisplayProps) {
  if (!report) return null;
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-primary" />
          <span className="text-2xl">Diagnóstico</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="prose prose-pink dark:prose-invert max-w-none text-base leading-relaxed">
        {/* The prose classes from tailwind typography will style the raw HTML from the AI */}
        <HtmlRenderer content={report} />
      </CardContent>
    </Card>
  );
}
