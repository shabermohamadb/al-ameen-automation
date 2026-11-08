import { NextRequest, NextResponse } from 'next/server';
import { getStockMovements, recordStockMovement, getProductById, getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || undefined;

    const movements = getStockMovements(productId);
    return NextResponse.json(movements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { product_id, type, quantity, reason, notes, new_price } = body;

    if (!product_id || !type || quantity === undefined) {
      return NextResponse.json(
        { error: 'product_id, type (in/out/adjustment), and quantity are required.' },
        { status: 400 }
      );
    }

    const prod = getProductById(product_id);
    if (!prod) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const previousStock = Number(prod.current_stock || 0);
    const qty = Number(quantity);
    let newStock = previousStock;

    if (type === 'in') {
      newStock = previousStock + qty;
    } else if (type === 'out') {
      newStock = Math.max(0, previousStock - qty);
    } else if (type === 'adjustment') {
      newStock = qty;
    }

    const db = getDb();
    const run = db.transaction(() => {
      // Update product current_stock
      db.prepare('UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, product_id);

      // Record audited stock movement
      recordStockMovement({
        product_id,
        type,
        quantity: qty,
        user_id: session.userId,
        user_name: session.fullName || session.username,
        user_role: session.role,
        previous_stock: previousStock,
        added_stock: type === 'in' ? qty : (type === 'out' ? -qty : (newStock - previousStock)),
        new_stock: newStock,
        previous_price: prod.selling_price || 0,
        new_price: new_price !== undefined ? Number(new_price) : (prod.selling_price || 0),
        reason: reason || 'Manual stock update',
        notes: notes || null,
        reference_type: 'manual_audit',
      });
    });

    run();

    return NextResponse.json({
      success: true,
      product_id,
      previous_stock: previousStock,
      new_stock: newStock,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
