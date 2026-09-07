import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKES(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount).replace('KES', 'KSh');
}

export function validateKenyanPhone(phone: string) {
  const re = /^\+254\d{9}$/;
  return re.test(phone);
}

export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}
