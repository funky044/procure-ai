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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const verified = searchParams.get('verified');
    const limit = parseInt(searchParams.get('limit') || '20');

    const vendors = await prisma.vendor.findMany({
      where: {
        ...(category && { categories: { has: category } }),
        ...(verified === 'true' && { verified: true }),
      },
      orderBy: { rating: 'desc' },
      take: limit,
    });

    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    return NextResponse.json(
      { error: 'Failed to get vendors' },
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

    // Only admins can create vendors
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const vendor = await prisma.vendor.create({
      data: {
        name: body.name,
        email: body.email,
        logo: body.logo,
        specialty: body.specialty,
        categories: body.categories || [],
        address: body.address,
        paymentTerms: body.paymentTerms || 'Net 30',
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Create vendor error:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
