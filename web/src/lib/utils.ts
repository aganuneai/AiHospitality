import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency: string = 'BRL', options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    ...options
  }).format(value);
}
