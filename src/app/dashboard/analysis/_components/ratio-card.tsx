'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Activity } from "lucide-react";

interface RatioCardProps {
  title: string;
  valueActual: string;
  valueAnterior: string;
  description: string;
}

export function RatioCard({ title, valueActual, valueAnterior, description }: RatioCardProps) {
  return (
    <Card className="flex flex-col justify-between rounded-2xl border border-primary/15 bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-primary/35 transition-all duration-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary/70" />
          <CardTitle className="text-sm font-bold text-foreground leading-snug">{title}</CardTitle>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center p-0.5 rounded-md hover:bg-muted">
                <HelpCircle className="h-4 w-4 cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs rounded-xl shadow-lg border-primary/20">
              <p className="leading-relaxed">{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border/60">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">
              Actual
            </span>
            <span className="text-base sm:text-lg font-extrabold text-foreground whitespace-nowrap tabular-nums tracking-tight" title={valueActual}>
              {valueActual}
            </span>
          </div>
          <div className="flex flex-col min-w-0 border-l border-border/60 pl-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">
              Anterior
            </span>
            <span className="text-base sm:text-lg font-bold text-muted-foreground whitespace-nowrap tabular-nums tracking-tight" title={valueAnterior}>
              {valueAnterior}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
