import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, minDecimals = 2, maxDecimals = 6) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatCrypto(value: number, decimals = 6) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Determines the right decimal places based on price magnitude
export function getPriceDecimals(price: number) {
  if (price < 0.001) return 8;
  if (price < 1) return 4;
  if (price < 100) return 3;
  return 2;
}
