import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const vendorId = cookieStore.get('vendor_id')?.value;

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vendor's categories
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { categories: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Find matching RFQs
    const rfqs = await prisma.procurementRequest.findMany({
      where: {
        status: 'QUOTING',
        category: { in: vendor.categories },
        quotes: {
          none: { vendorId },
        },
      },
      select: {
        id: true,
        requestNumber: true,
        description: true,
        quantity: true,
        category: true,
        deliveryDate: true,
        status: true,
        createdAt: true,
        specifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rfqs);
  } catch (error) {
    console.error('Get vendor RFQs error:', error);
    return NextResponse.json({ error: 'Failed to get RFQs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const vendorId = cookieStore.get('vendor_id')?.value;

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, unitPrice, deliveryDays, warranty, paymentTerms, notes } = body;

    // Get request
    const request = await prisma.procurementRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        vendorId,
        requestId,
        unitPrice,
        totalPrice: unitPrice * (request.quantity || 1),
        quantity: request.quantity || 1,
        deliveryDays,
        warranty,
        paymentTerms,
        notes,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: { vendor: true },
    });

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'QUOTE_RECEIVED',
        title: 'New Quote Received',
        message: `${quote.vendor.name} submitted a quote for $${quote.totalPrice.toLocaleString()}`,
        link: `/requests/${requestId}`,
      },
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Submit quote error:', error);
    return NextResponse.json({ error: 'Failed to submit quote' }, { status: 500 });
  }
}
