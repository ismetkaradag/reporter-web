import Link from 'next/link';
import { formatCurrency, formatNumber } from '@/utils/formatUtils';

interface StatCardProps {
  title: string;
  value: number;
  format?: 'currency' | 'number';
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  colorClass?: string;
  href?: string;
}

export default function StatCard({
  title,
  value,
  format = 'number',
  icon,
  subtitle,
  colorClass = 'bg-blue-500',
  href,
}: StatCardProps) {
  const formattedValue = format === 'currency' ? formatCurrency(value) : formatNumber(value);

  const content = (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div className={`${colorClass} text-white p-2 rounded-lg text-xl`}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{formattedValue}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-white rounded-lg shadow p-6 border border-gray-200 block hover:shadow-lg transition-shadow cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      {content}
    </div>
  );
}
