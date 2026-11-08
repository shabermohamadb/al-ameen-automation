import { NextResponse } from 'next/server';
import { getProducts, getCategories, createProduct } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category') || undefined;
    const type = searchParams.get('type') || undefined;
    const activeParam = searchParams.get('active');
    const activeOnly = activeParam === 'true';
    const search = searchParams.get('search') || undefined;

    const products = getProducts({ categoryId, type, activeOnly, search });
    const categories = getCategories();
    return NextResponse.json({ success: true, data: products, categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }
    const product = createProduct(body);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
