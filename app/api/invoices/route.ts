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
    const status = searchParams.get('status');
    const matchStatus = searchParams.get('matchStatus');

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(matchStatus && { matchStatus: matchStatus as any }),
      },
      include: {
        vendor: {
          select: { id: true, name: true, email: true },
        },
        purchaseOrder: {
          select: { id: true, poNumber: true, total: true, items: true },
        },
        request: {
          select: { id: true, requestNumber: true, description: true },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to get invoices' },
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

    const body = await req.json();
    const { poId, invoiceNumber, invoiceDate, dueDate, items, subtotal, tax, total } = body;

    // Get PO details
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { request: true },
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Calculate variance
    const variance = total - po.total;
    const variancePercent = Math.abs(variance / po.total) * 100;

    // Determine match status
    let matchStatus: 'MATCHED' | 'PARTIAL_MATCH' | 'MISMATCH' = 'MATCHED';
    let varianceReason = null;

    if (variancePercent > 5) {
      matchStatus = 'MISMATCH';
      varianceReason = `Invoice total differs from PO by ${variancePercent.toFixed(1)}%`;
    } else if (variancePercent > 0) {
      matchStatus = 'PARTIAL_MATCH';
      varianceReason = `Minor variance of ${variancePercent.toFixed(1)}%`;
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        vendorId: po.vendorId,
        poId,
        requestId: po.requestId,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        items,
        subtotal,
        tax,
        total,
        poTotal: po.total,
        variance,
        varianceReason,
        matchStatus,
        status: 'RECEIVED',
      },
      include: {
        vendor: true,
        purchaseOrder: true,
      },
    });

    // Create notification if mismatch
    if (matchStatus === 'MISMATCH') {
      await prisma.notification.create({
        data: {
          userId: po.request.userId,
          type: 'INVOICE_MISMATCH',
          title: 'Invoice Mismatch Detected',
          message: `Invoice ${invoiceNumber} has a ${variancePercent.toFixed(1)}% variance from PO ${po.poNumber}`,
          link: `/invoices/${invoice.id}`,
        },
      });
    }

    // Update PO status
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'INVOICED' },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, action, ...data } = body;

    let updateData: any = {};

    switch (action) {
      case 'approve':
        updateData = {
          status: 'APPROVED',
          matchStatus: 'MATCHED',
        };
        break;
      case 'dispute':
        updateData = {
          status: 'DISPUTED',
          varianceReason: data.reason,
        };
        break;
      case 'pay':
        updateData = {
          status: 'PAID',
          paidAmount: data.amount,
          paidDate: new Date(),
          paymentMethod: data.method,
          paymentReference: data.reference,
        };
        break;
      default:
        updateData = data;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        vendor: true,
        purchaseOrder: true,
      },
    });

    // If paid, update PO status
    if (action === 'pay') {
      await prisma.purchaseOrder.update({
        where: { id: invoice.poId },
        data: { status: 'PAID' },
      });

      // Update vendor metrics
      await prisma.vendor.update({
        where: { id: invoice.vendorId },
        data: {
          totalOrders: { increment: 1 },
          totalValue: { increment: invoice.total },
        },
      });

      // Update budget spent amount
      const request = await prisma.procurementRequest.findUnique({
        where: { id: invoice.requestId },
      });

      if (request?.budgetId) {
        await prisma.budget.update({
          where: { id: request.budgetId },
          data: {
            spentAmount: { increment: invoice.total },
            committedAmount: { decrement: invoice.total },
          },
        });
      }
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}
