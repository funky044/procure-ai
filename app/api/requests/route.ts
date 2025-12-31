import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    const requests = await prisma.procurementRequest.findMany({
      where: {
        userId,
        ...(status && { status: status as any }),
      },
      include: {
        quotes: { include: { vendor: true } },
        negotiation: { include: { vendor: true } },
        contract: { include: { vendor: true } },
        purchaseOrder: { include: { vendor: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json(
      { error: 'Failed to get requests' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    const request = await prisma.procurementRequest.create({
      data: {
        userId,
        category: body.category,
        description: body.description,
        quantity: body.quantity,
        specifications: body.specifications,
        budget: body.budget,
        urgency: body.urgency || 'MEDIUM',
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
        deliveryLocation: body.deliveryLocation,
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}
