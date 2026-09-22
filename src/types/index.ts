import type { User as FirebaseUser } from 'firebase/auth';

export const userRoles = [
  'contabilidad',
  'gerencia',
  'ventas',
  'recursos humanos',
  'producción',
] as const;

export type UserRole = (typeof userRoles)[number];


export interface UserProfile {
  uid: string;
  nombre: string;
  correo: string;
  areaDeTrabajo: UserRole;
  fechaRegistro: number;
}

export interface AuthUser extends FirebaseUser {
  profile: UserProfile | null;
}
