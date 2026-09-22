'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LegalPage() {
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
                        <ShieldCheck className="w-10 h-10 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Procesos Legales y Protección de Datos
                            </h1>
                            <p className="text-muted-foreground">
                                Tu confianza y seguridad son nuestra máxima prioridad.
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Compromiso con la Privacidad</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-base">
                        <p>
                           Entendemos la naturaleza sensible de los datos financieros. En FinanceWise AI, hemos implementado medidas de seguridad de vanguardia para garantizar que tu información esté siempre protegida.
                        </p>
                         <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Encriptación de Datos:</strong> Toda la información, tanto en tránsito como en reposo, se encuentra encriptada utilizando los protocolos de seguridad más robustos del mercado.</li>
                            <li><strong>Acceso Restringido:</strong> Solo tú tienes acceso a tus datos. Nuestro personal no puede ver, acceder ni compartir tu información financiera bajo ninguna circunstancia. El acceso se gestiona a través de una autenticación segura.</li>
                            <li><strong>No Compartimos tus Datos:</strong> Nunca venderemos, alquilaremos ni compartiremos tus datos financieros con terceros para fines de marketing o cualquier otro propósito no relacionado con la prestación de nuestros servicios.</li>
                        </ul>
                    </CardContent>
                </Card>

                 <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Uso de la Inteligencia Artificial</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-base">
                        <p>
                           Nuestros modelos de inteligencia artificial se utilizan exclusivamente para procesar los datos que tú nos proporcionas y generar los análisis financieros solicitados.
                        </p>
                         <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Datos Anónimos para Entrenamiento:</strong> Los datos utilizados por los modelos de IA no se utilizan para re-entrenar modelos públicos. Tu información financiera no contribuye a los conocimientos de modelos de IA de terceros.</li>
                             <li><strong>Confidencialidad del Proceso:</strong> La interacción entre tus datos y nuestros modelos de IA ocurre en un entorno seguro y aislado. Los resultados se generan y se te entregan directamente a ti, sin intermediarios.</li>
                        </ul>
                         <p>
                            Tu confianza es la base de nuestro servicio. Estamos comprometidos a mantener los más altos estándares de privacidad y seguridad para que puedas utilizar nuestra plataforma con total tranquilidad. Si tienes alguna pregunta sobre nuestras políticas, no dudes en contactarnos.
                        </p>
                    </CardContent>
                </Card>

            </div>
        </main>
    </div>
  );
}
