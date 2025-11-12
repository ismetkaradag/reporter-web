import { getServiceRoleClient } from '@/lib/supabase';
import type { Return } from '@/types';
import MainLayout from '@/components/MainLayout';
import IadelerClient from './IadelerClient';

export const revalidate = 300; // 5 dakika cache

async function fetchReturns(): Promise<Return[]> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('returns')
    .select('*')
    .order('created_on', { ascending: false });

  if (error) {
    console.error('Error fetching returns:', error);
    return [];
  }

  return data as Return[];
}

export default async function IadelerPage() {
  const returns = await fetchReturns();

  return (
    <MainLayout>
      <IadelerClient returns={returns} />
    </MainLayout>
  );
}
