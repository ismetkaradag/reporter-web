import { format as dateFnsFormat, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Tarih formatla (Türkçe locale)
 */
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, formatStr, { locale: tr });
}

/**
 * Tarih ve saat formatla
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * UTC tarih aralıkları (STARTER_PROMPT'a göre)
 */

// Bugün (UTC)
export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfDay(now),
    end: now,
  };
}

// Dün (UTC)
export function getYesterdayRange(): { start: Date; end: Date } {
  const yesterday = subDays(new Date(), 1);
  return {
    start: startOfDay(yesterday),
    end: endOfDay(yesterday),
  };
}

// Bu hafta (Pazartesi başlangıçlı)
export function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }), // Pazartesi
    end: now,
  };
}

// Bu ay
export function getThisMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: now,
  };
}

// Tüm zamanlar (1 Ocak 2020'den itibaren)
export function getAllTimeRange(): { start: Date; end: Date } {
  return {
    start: new Date('2020-01-01'),
    end: new Date(),
  };
}

/**
 * ISO string olarak date range döndür (API için)
 */
export function getDateRangeISO(range: 'today' | 'yesterday' | 'week' | 'month' | 'all'): { start: string; end: string } {
  let dateRange: { start: Date; end: Date };

  switch (range) {
    case 'today':
      dateRange = getTodayRange();
      break;
    case 'yesterday':
      dateRange = getYesterdayRange();
      break;
    case 'week':
      dateRange = getThisWeekRange();
      break;
    case 'month':
      dateRange = getThisMonthRange();
      break;
    case 'all':
      dateRange = getAllTimeRange();
      break;
    default:
      dateRange = getTodayRange();
  }

  return {
    start: dateRange.start.toISOString(),
    end: dateRange.end.toISOString(),
  };
}
