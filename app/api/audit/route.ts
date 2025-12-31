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
    const requestId = searchParams.get('requestId');
    const entity = searchParams.get('entity');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100');

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(requestId && { requestId }),
        ...(entity && { entity }),
        ...(action && { action }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        request: {
          select: { id: true, requestNumber: true, description: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { error: 'Failed to get audit logs' },
      { status: 500 }
    );
  }
}

// Helper function to create audit logs
export async function createAuditLog({
  userId,
  requestId,
  action,
  entity,
  entityId,
  previousData,
  newData,
  ipAddress,
  userAgent,
}: {
  userId: string;
  requestId?: string;
  action: string;
  entity: string;
  entityId: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  // Calculate changes if both previous and new data exist
  let changes = null;
  if (previousData && newData) {
    changes = Object.keys(newData).reduce((acc: any, key) => {
      if (JSON.stringify(previousData[key]) !== JSON.stringify(newData[key])) {
        acc[key] = {
          from: previousData[key],
          to: newData[key],
        };
      }
      return acc;
    }, {});
  }

  return prisma.auditLog.create({
    data: {
      userId,
      requestId,
      action,
      entity,
      entityId,
      previousData,
      newData,
      changes,
      ipAddress,
      userAgent,
    },
  });
}
