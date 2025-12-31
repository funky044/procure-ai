import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const vendorId = cookieStore.get('vendor_id')?.value;

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        name: true,
        email: true,
        rating: true,
        totalOrders: true,
        totalValue: true,
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error('Vendor auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const vendor = await prisma.vendor.findUnique({
      where: { email },
    });

    if (!vendor || !vendor.password || !vendor.portalEnabled) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, vendor.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
      },
    });

    response.cookies.set('vendor_id', vendor.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Vendor login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
