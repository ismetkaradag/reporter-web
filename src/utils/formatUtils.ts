/**
 * Para formatı (TL)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Sayı formatı (binlik ayracı)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('tr-TR').format(num);
}

/**
 * Yüzde formatı
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `%${value.toFixed(decimals)}`;
}
