import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ReportGroup, ReportGroupInput } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET: Tüm rapor gruplarını listele
 */
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('report_groups')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Report groups fetch error:', error);
      return NextResponse.json(
        { error: 'Gruplar yüklenemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Report groups GET error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Yeni rapor grubu oluştur
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: ReportGroupInput = await request.json();

    // Validasyon
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Grup adı zorunludur' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.product_skus)) {
      return NextResponse.json(
        { error: 'product_skus bir array olmalıdır' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('report_groups')
      .insert({
        name: body.name.trim(),
        description: body.description || null,
        product_skus: body.product_skus,
        color: body.color || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Report group insert error:', error);

      // Unique constraint hatası
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Bu isimde bir grup zaten mevcut' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Grup oluşturulamadı' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Report groups POST error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
