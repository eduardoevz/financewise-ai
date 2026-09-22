import { RegisterForm } from './register-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  return (
    <Card className="w-full">
    <CardHeader className="space-y-2 text-center">
        <div className='flex justify-center'>
            <UserPlus className="w-8 h-8 mb-2 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Crea una cuenta</CardTitle>
        <CardDescription>
        Completa el formulario para empezar a analizar tus finanzas.
        </CardDescription>
    </CardHeader>
    <CardContent>
        <RegisterForm />
    </CardContent>
    <CardFooter className="flex justify-center text-sm">
        <p className="text-muted-foreground">
        ¿Ya tienes una cuenta?{' '}
        <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
        >
            Inicia Sesión
        </Link>
        </p>
    </CardFooter>
    </Card>
  );
}
