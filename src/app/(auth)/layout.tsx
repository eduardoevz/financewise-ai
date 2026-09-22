import Image from 'next/image';
import { placeholderImages } from '@/lib/placeholder-images';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authImage = placeholderImages.find(p => p.id === 'auth-background');

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="flex flex-1 items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <div className="hidden lg:flex lg:w-1/2 relative">
        {authImage && (
            <Image
                src={authImage.imageUrl}
                alt={authImage.description}
                fill
                className="object-cover"
                data-ai-hint={authImage.imageHint}
                priority
            />
        )}
        <div className="absolute inset-0 bg-primary/80" />
        <div className="absolute z-10 inset-0 flex items-center justify-center p-12 text-primary-foreground">
          <div className="space-y-4 text-center">
            <h1 className="text-5xl font-bold tracking-tight">FinanceWise AI</h1>
            <p className="text-lg">
              Análisis Financiero Integral para decisiones inteligentes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
