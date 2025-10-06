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
 * Kampüs listesinde var mı kontrol et
 */
export function isValidCampus(campus: string): boolean {
  const campuses = getAllCampuses();
  return campuses.includes(campus);
}
