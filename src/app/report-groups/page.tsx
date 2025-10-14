import { Metadata } from 'next';
import ReportGroupsClient from './ReportGroupsClient';
import MainLayout from '@/components/MainLayout';

export const metadata: Metadata = {
  title: 'Rapor Gruplandırma | Yönder Rapor',
  description: 'Ürünleri gruplara ayırın ve raporlarınızı organize edin',
};

export default function ReportGroupsPage() {
  return (
      <MainLayout>
         <ReportGroupsClient />;
      </MainLayout>
  );
}
