import { NextResponse } from 'next/server';
import { getPartyPrice, getCustomerPartyPrices } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ success: false, error: 'customerId is required' }, { status: 400 });
    }

    if (productId) {
      const price = getPartyPrice(productId, customerId);
      return NextResponse.json({ success: true, price });
    }

    const list = getCustomerPartyPrices(customerId);
    const prices: Record<string, number> = {};
    list.forEach((item) => {
      prices[item.product_id] = item.price;
    });
    return NextResponse.json({ success: true, prices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
