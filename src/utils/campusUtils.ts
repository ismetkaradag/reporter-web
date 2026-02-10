/**
 * Tüm kampüs listesi
 */
export function getAllCampuses(): string[] {
  return (process.env.NEXT_PUBLIC_KAMPUSLER || '')
    .split(',')
    .filter(Boolean)
    .map(k => k.trim());
}

/**
 * Birden fazla kampüs var mı?
 */
export function hasMultipleCampuses(): boolean {
  return getAllCampuses().length > 1;
}

/**
 * Kampüs listesinde var mı kontrol et
 */
export function isValidCampus(campus: string): boolean {
  const campuses = getAllCampuses();
  return campuses.includes(campus);
}
