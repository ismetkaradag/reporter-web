import ProductLineSalesClient from './ProductLineSalesClient';
import MainLayout from '@/components/MainLayout';

export default async function ProductLineSalesReportPage() {
  return (
    <MainLayout>
      <ProductLineSalesClient />
    </MainLayout>
  );
}
