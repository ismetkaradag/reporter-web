/**
 * Para birimi formatlayıcı
 */
export function formatCurrency(amount: number, options?: { compact?: boolean }): string {
  if (options?.compact) {
    // Kısa format: 1000 -> 1K, 1000000 -> 1M
    if (amount >= 1000000) {
      return `₺${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `₺${(amount / 1000).toFixed(1)}K`;
    }
    return `₺${amount.toFixed(0)}`;
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Sayı formatlayıcı (binlik ayraç)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('tr-TR').format(num);
}

/**
 * Tarih formatlayıcı
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Tarih formatlayıcı (sadece gün)
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
