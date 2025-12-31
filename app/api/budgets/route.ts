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
    const userRole = (session.user as any).role;
    const userDepartment = (session.user as any).department;

    // Get budgets - admins/finance see all, others see their department
    const where = ['ADMIN', 'FINANCE'].includes(userRole)
      ? {}
      : { department: userDepartment };

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        requests: {
          select: { id: true, status: true, budget: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate utilization for each budget
    const budgetsWithUtilization = budgets.map((budget) => {
      const utilization = ((budget.spentAmount + budget.committedAmount) / budget.totalAmount) * 100;
      const isOverThreshold = utilization >= budget.alertThreshold;
      
      return {
        ...budget,
        utilization: Math.round(utilization * 100) / 100,
        remaining: budget.totalAmount - budget.spentAmount - budget.committedAmount,
        isOverThreshold,
        requestCount: budget.requests.length,
      };
    });

    return NextResponse.json(budgetsWithUtilization);
  } catch (error) {
    console.error('Get budgets error:', error);
    return NextResponse.json(
      { error: 'Failed to get budgets' },
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

    const userRole = (session.user as any).role;
    
    // Only admins and finance can create budgets
    if (!['ADMIN', 'FINANCE'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const userId = (session.user as any).id;

    const budget = await prisma.budget.create({
      data: {
        name: body.name,
        department: body.department,
        fiscalYear: body.fiscalYear || new Date().getFullYear(),
        totalAmount: body.totalAmount,
        alertThreshold: body.alertThreshold || 80,
        managerId: body.managerId || userId,
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error('Create budget error:', error);
    return NextResponse.json(
      { error: 'Failed to create budget' },
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

    const userRole = (session.user as any).role;
    
    if (!['ADMIN', 'FINANCE'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        name: data.name,
        totalAmount: data.totalAmount,
        alertThreshold: data.alertThreshold,
        status: data.status,
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Check if we need to send budget alert
    const utilization = ((budget.spentAmount + budget.committedAmount) / budget.totalAmount) * 100;
    if (utilization >= budget.alertThreshold) {
      // Create notification for budget manager
      await prisma.notification.create({
        data: {
          userId: budget.managerId,
          type: 'BUDGET_ALERT',
          title: 'Budget Alert',
          message: `Budget "${budget.name}" has reached ${Math.round(utilization)}% utilization`,
          link: '/budgets',
        },
      });
    }

    return NextResponse.json(budget);
  } catch (error) {
    console.error('Update budget error:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}
