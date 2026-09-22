'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
        <main className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                 <div className="mb-8">
                    <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4">
                        <ArrowLeft size={16} />
                        Volver al Panel
                    </Link>
                    <div className="flex items-center gap-4">
                        <Building2 className="w-10 h-10 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Acerca de FinanceWise AI
                            </h1>
                            <p className="text-muted-foreground">
                                Nuestra misión y visión para el futuro del análisis financiero.
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Nuestra Misión</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-base">
                        <p>
                            En FinanceWise AI, nuestra misión es democratizar el acceso a herramientas de análisis financiero de alta calidad. Creemos que todas las empresas, sin importar su tamaño, merecen tener a su alcance la inteligencia de negocios necesaria para tomar decisiones estratégicas, optimizar su rendimiento y alcanzar un crecimiento sostenible.
                        </p>
                        <p>
                            Nos esforzamos por combinar la última tecnología en inteligencia artificial con una interfaz intuitiva y accesible, permitiendo a los líderes empresariales, contadores y gerentes financieros transformar datos complejos en conocimientos claros y accionables.
                        </p>
                    </CardContent>
                </Card>

                 <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Nuestra Visión</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-base">
                        <p>
                            Nuestra visión es convertirnos en el copiloto financiero indispensable para las empresas de todo el mundo. Aspiramos a ser una plataforma que no solo analiza el pasado, sino que también ayuda a prever el futuro, identificando oportunidades y riesgos antes de que se materialicen.
                        </p>
                        <p>
                           Queremos construir un ecosistema donde la inteligencia artificial y la experiencia humana colaboren para crear un futuro financiero más próspero y seguro para todos.
                        </p>
                    </CardContent>
                </Card>

            </div>
        </main>
    </div>
  );
}
