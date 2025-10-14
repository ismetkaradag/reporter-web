import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ReportGroupInput } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET: Tek bir rapor grubu getir
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { id } = await params;
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json(
        { error: 'Geçersiz grup ID' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('report_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Grup bulunamadı' },
          { status: 404 }
        );
      }

      console.error('Report group fetch error:', error);
      return NextResponse.json(
        { error: 'Grup yüklenemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Report group GET error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT: Rapor grubunu güncelle
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { id } = await params;
    const groupId = parseInt(id, 10);
    const body: ReportGroupInput = await request.json();

    if (isNaN(groupId)) {
      return NextResponse.json(
        { error: 'Geçersiz grup ID' },
        { status: 400 }
      );
    }

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
      .update({
        name: body.name.trim(),
        description: body.description || null,
        product_skus: body.product_skus,
        color: body.color || null,
      })
      .eq('id', groupId)
      .select()
      .single();

    if (error) {
      console.error('Report group update error:', error);

      // Unique constraint hatası
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Bu isimde bir grup zaten mevcut' },
          { status: 409 }
        );
      }

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Grup bulunamadı' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Grup güncellenemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Report group PUT error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Rapor grubunu sil
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { id } = await params;
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json(
        { error: 'Geçersiz grup ID' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('report_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Report group delete error:', error);
      return NextResponse.json(
        { error: 'Grup silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Report group DELETE error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
