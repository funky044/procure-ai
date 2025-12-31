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

    const orders = await prisma.purchaseOrder.findMany({
      where: { vendorId },
      select: {
        id: true,
        poNumber: true,
        total: true,
        status: true,
        deliveryDate: true,
        createdAt: true,
        items: true,
        shipToCompany: true,
        shipToCity: true,
        shipToState: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Get vendor orders error:', error);
    return NextResponse.json({ error: 'Failed to get orders' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const vendorId = cookieStore.get('vendor_id')?.value;

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { poId, action, trackingNumber, carrierName } = body;

    // Verify PO belongs to vendor
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, vendorId },
      include: { request: true },
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    let updateData: any = {};
    let notificationMessage = '';

    switch (action) {
      case 'acknowledge':
        updateData = {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
        };
        notificationMessage = `Vendor acknowledged PO ${po.poNumber}`;
        break;

      case 'ship':
        updateData = {
          status: 'SHIPPED',
          shippedAt: new Date(),
          trackingNumber,
          carrierName,
        };
        notificationMessage = `PO ${po.poNumber} has been shipped. Tracking: ${trackingNumber}`;
        
        // Create delivery record
        await prisma.delivery.create({
          data: {
            poId,
            items: po.items,
            trackingNumber,
            carrierName,
            status: 'SHIPPED',
            shippedDate: new Date(),
            expectedDate: po.deliveryDate,
          },
        });
        break;

      case 'deliver':
        updateData = {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        };
        notificationMessage = `PO ${po.poNumber} has been delivered`;

        // Update delivery
        await prisma.delivery.updateMany({
          where: { poId, status: 'SHIPPED' },
          data: {
            status: 'DELIVERED',
            deliveredDate: new Date(),
          },
        });
        break;
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: updateData,
    });

    // Notify requester
    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: po.request.userId,
          type: 'DELIVERY_UPDATE',
          title: 'Order Update',
          message: notificationMessage,
          link: `/requests/${po.requestId}`,
        },
      });
    }

    return NextResponse.json(updatedPO);
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
