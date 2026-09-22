'use client';

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, updateDoc, getDocs, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';
import type { UserProfile, UserRole } from '@/types';
import type { User } from 'firebase/auth';

type FinancialPeriod = Record<string, number>;

export async function saveFinancialData(
    userId: string, 
    financialData: { 
        balanceSheet: {
            periodoActual: FinancialPeriod,
            periodoAnterior: FinancialPeriod,
        }, 
        incomeStatement: {
            periodoActual: FinancialPeriod,
            periodoAnterior: FinancialPeriod,
        },
    }
): Promise<string> {
    const reportRef = await addDoc(collection(db, 'usuarios', userId, 'reportes'), {
        ...financialData,
        fechaCreacion: serverTimestamp(),
        userId: userId,
    });
    return reportRef.id;
}

export async function updateReportWithAnalysis(userId: string, reportId: string, analysisData: any): Promise<void> {
    const reportRef = doc(db, 'usuarios', userId, 'reportes', reportId);
    await updateDoc(reportRef, {
        ...analysisData,
        fechaAnalisis: serverTimestamp()
    });
}

export async function getFinancialData(userId: string, reportId: string): Promise<any | null> {
    const reportRef = doc(db, 'usuarios', userId, 'reportes', reportId);
    const reportSnap = await getDoc(reportRef);

    if (reportSnap.exists()) {
        const data = reportSnap.data();
        return {
            id: reportSnap.id,
            ...data
        };
    }
    return null;
}

export async function getReportsForUser(userId: string): Promise<any[]> {
    const reportsQuery = query(collection(db, 'usuarios', userId, 'reportes'), orderBy('fechaCreacion', 'desc'));
    const querySnapshot = await getDocs(reportsQuery);
    
    const reports: any[] = [];
    querySnapshot.forEach((docSnap) => {
        reports.push({ id: docSnap.id, ...docSnap.data() });
    });

    return reports;
}

export async function deleteReport(userId: string, reportId: string): Promise<void> {
    const reportRef = doc(db, 'usuarios', userId, 'reportes', reportId);
    await deleteDoc(reportRef);
}

export async function deleteAllReportsForUser(userId: string): Promise<void> {
    const reportsQuery = query(collection(db, 'usuarios', userId, 'reportes'));
    const querySnapshot = await getDocs(reportsQuery);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
    });
    
    await batch.commit();
}

export async function createUserProfile(
  user: User,
  nombre: string,
  areaDeTrabajo: UserRole
): Promise<void> {
  const userRef = doc(db, 'usuarios', user.uid);
  await setDoc(userRef, {
    nombre,
    correo: user.email!,
    areaDeTrabajo,
    fechaRegistro: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'usuarios', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    const fechaRegistro = data.fechaRegistro as Timestamp;
    return {
      uid,
      nombre: data.nombre,
      correo: data.correo,
      areaDeTrabajo: data.areaDeTrabajo,
      fechaRegistro: fechaRegistro.toMillis(),
    } as UserProfile;
  }
  return null;
}
