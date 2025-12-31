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

    const recurringRequests = await prisma.procurementRequest.findMany({
      where: {
        userId,
        isRecurring: true,
      },
      include: {
        recurringSchedule: true,
        childRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(recurringRequests);
  } catch (error) {
    console.error('Get recurring orders error:', error);
    return NextResponse.json(
      { error: 'Failed to get recurring orders' },
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
    const { requestId, schedule } = body;

    // Get original request
    const originalRequest = await prisma.procurementRequest.findUnique({
      where: { id: requestId },
    });

    if (!originalRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Calculate next run date
    const startDate = new Date(schedule.startDate);
    let nextRunDate = new Date(startDate);

    // Update request to be recurring
    const updatedRequest = await prisma.procurementRequest.update({
      where: { id: requestId },
      data: { isRecurring: true },
    });

    // Create schedule
    const recurringSchedule = await prisma.recurringSchedule.create({
      data: {
        requestId,
        frequency: schedule.frequency,
        interval: schedule.interval || 1,
        dayOfWeek: schedule.dayOfWeek,
        dayOfMonth: schedule.dayOfMonth,
        startDate,
        endDate: schedule.endDate ? new Date(schedule.endDate) : null,
        nextRunDate,
      },
    });

    return NextResponse.json({
      request: updatedRequest,
      schedule: recurringSchedule,
    });
  } catch (error) {
    console.error('Create recurring order error:', error);
    return NextResponse.json(
      { error: 'Failed to create recurring order' },
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
    const { scheduleId, action, ...data } = body;

    let schedule;

    if (action === 'pause') {
      schedule = await prisma.recurringSchedule.update({
        where: { id: scheduleId },
        data: { isActive: false },
      });
    } else if (action === 'resume') {
      schedule = await prisma.recurringSchedule.update({
        where: { id: scheduleId },
        data: { isActive: true },
      });
    } else if (action === 'update') {
      schedule = await prisma.recurringSchedule.update({
        where: { id: scheduleId },
        data: {
          frequency: data.frequency,
          interval: data.interval,
          dayOfWeek: data.dayOfWeek,
          dayOfMonth: data.dayOfMonth,
          endDate: data.endDate ? new Date(data.endDate) : null,
        },
      });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Update recurring order error:', error);
    return NextResponse.json(
      { error: 'Failed to update recurring order' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    // Get schedule to find request
    const schedule = await prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (schedule) {
      // Update request to not be recurring
      await prisma.procurementRequest.update({
        where: { id: schedule.requestId },
        data: { isRecurring: false },
      });

      // Delete schedule
      await prisma.recurringSchedule.delete({
        where: { id: scheduleId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete recurring order error:', error);
    return NextResponse.json(
      { error: 'Failed to delete recurring order' },
      { status: 500 }
    );
  }
}

// Cron job handler - call this from a scheduled function
export async function processRecurringOrders() {
  const now = new Date();

  // Find all active schedules due to run
  const dueSchedules = await prisma.recurringSchedule.findMany({
    where: {
      isActive: true,
      nextRunDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
    },
    include: {
      request: {
        include: {
          user: true,
        },
      },
    },
  });

  for (const schedule of dueSchedules) {
    try {
      // Create new request based on original
      const newRequest = await prisma.procurementRequest.create({
        data: {
          userId: schedule.request.userId,
          category: schedule.request.category,
          description: schedule.request.description,
          quantity: schedule.request.quantity,
          specifications: schedule.request.specifications as any,
          budget: schedule.request.budget,
          urgency: schedule.request.urgency,
          deliveryLocation: schedule.request.deliveryLocation,
          parentRequestId: schedule.requestId,
          status: 'DRAFT',
          stage: 'initial',
        },
      });

      // Calculate next run date
      let nextRunDate = new Date(schedule.nextRunDate);
      switch (schedule.frequency) {
        case 'DAILY':
          nextRunDate.setDate(nextRunDate.getDate() + schedule.interval);
          break;
        case 'WEEKLY':
          nextRunDate.setDate(nextRunDate.getDate() + 7 * schedule.interval);
          break;
        case 'BIWEEKLY':
          nextRunDate.setDate(nextRunDate.getDate() + 14 * schedule.interval);
          break;
        case 'MONTHLY':
          nextRunDate.setMonth(nextRunDate.getMonth() + schedule.interval);
          break;
        case 'QUARTERLY':
          nextRunDate.setMonth(nextRunDate.getMonth() + 3 * schedule.interval);
          break;
      }

      // Update schedule
      await prisma.recurringSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunDate: now,
          nextRunDate,
        },
      });

      // Notify user
      await prisma.notification.create({
        data: {
          userId: schedule.request.userId,
          type: 'RECURRING_ORDER',
          title: 'Recurring Order Created',
          message: `A new order has been created from your recurring schedule: ${schedule.request.description}`,
          link: `/requests/${newRequest.id}`,
        },
      });
    } catch (error) {
      console.error(`Error processing recurring schedule ${schedule.id}:`, error);
    }
  }

  return { processed: dueSchedules.length };
}
