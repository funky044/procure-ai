import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const request = await prisma.procurementRequest.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
        quotes: {
          include: {
            vendor: {
              select: { id: true, name: true, rating: true },
            },
          },
          orderBy: { totalPrice: 'asc' },
        },
        negotiation: {
          include: {
            vendor: { select: { name: true } },
            rounds: { orderBy: { round: 'asc' } },
          },
        },
        contract: {
          include: {
            vendor: { select: { name: true } },
          },
        },
        purchaseOrder: {
          include: {
            vendor: { select: { name: true } },
            deliveries: true,
          },
        },
        approvals: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { step: 'asc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        invoices: {
          include: {
            vendor: { select: { name: true } },
          },
        },
        budgetAllocation: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('Get request error:', error);
    return NextResponse.json({ error: 'Failed to get request' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userId = (session.user as any).id;

    // Get current request for audit
    const currentRequest = await prisma.procurementRequest.findUnique({
      where: { id: params.id },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Update request
    const updatedRequest = await prisma.procurementRequest.update({
      where: { id: params.id },
      data: {
        status: body.status,
        stage: body.stage,
        category: body.category,
        description: body.description,
        quantity: body.quantity,
        budget: body.budget,
        urgency: body.urgency,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
        deliveryLocation: body.deliveryLocation,
        budgetId: body.budgetId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        requestId: params.id,
        action: 'UPDATE',
        entity: 'ProcurementRequest',
        entityId: params.id,
        previousData: currentRequest as any,
        newData: body,
      },
    });

    // If budget allocation changed, update budget committed amount
    if (body.budgetId && body.budgetId !== currentRequest.budgetId) {
      // Remove from old budget
      if (currentRequest.budgetId) {
        await prisma.budget.update({
          where: { id: currentRequest.budgetId },
          data: { committedAmount: { decrement: currentRequest.budget || 0 } },
        });
      }

      // Add to new budget
      await prisma.budget.update({
        where: { id: body.budgetId },
        data: { committedAmount: { increment: body.budget || currentRequest.budget || 0 } },
      });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Update request error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get request
    const request = await prisma.procurementRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Only allow deletion of DRAFT requests
    if (request.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft requests can be deleted' },
        { status: 400 }
      );
    }

    // Delete related records first
    await prisma.message.deleteMany({ where: { requestId: params.id } });
    await prisma.attachment.deleteMany({ where: { requestId: params.id } });
    await prisma.approval.deleteMany({ where: { requestId: params.id } });
    await prisma.quote.deleteMany({ where: { requestId: params.id } });

    // Delete request
    await prisma.procurementRequest.delete({
      where: { id: params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'ProcurementRequest',
        entityId: params.id,
        previousData: request as any,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete request error:', error);
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}
