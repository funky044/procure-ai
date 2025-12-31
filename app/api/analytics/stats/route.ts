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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all user's requests
    const requests = await prisma.procurementRequest.findMany({
      where: { userId },
      include: {
        purchaseOrder: true,
        contract: true,
        negotiation: true,
      },
    });

    // Calculate stats
    const totalRequests = requests.length;
    
    const pendingApprovals = requests.filter(
      (r) => r.status === 'PENDING_APPROVAL'
    ).length;
    
    const activeOrders = requests.filter(
      (r) => ['PO_GENERATED', 'ORDERED', 'SHIPPED', 'PARTIALLY_DELIVERED'].includes(r.status)
    ).length;
    
    // Calculate total spend from completed POs
    const totalSpend = requests.reduce((sum, r) => {
      if (r.purchaseOrder && ['DELIVERED', 'INVOICED', 'PAID', 'CLOSED', 'COMPLETED'].includes(r.status)) {
        return sum + r.purchaseOrder.total;
      }
      return sum;
    }, 0);
    
    // Monthly spend
    const monthlyRequests = requests.filter(
      (r) => new Date(r.createdAt) >= startOfMonth
    );
    const monthlySpend = monthlyRequests.reduce((sum, r) => {
      if (r.purchaseOrder) {
        return sum + r.purchaseOrder.total;
      }
      return sum;
    }, 0);
    
    // Calculate savings from negotiations
    const savingsAmount = requests.reduce((sum, r) => {
      if (r.negotiation && r.negotiation.status === 'ACCEPTED') {
        return sum + (r.negotiation.originalPrice - r.negotiation.currentPrice);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      totalRequests,
      pendingApprovals,
      activeOrders,
      totalSpend,
      monthlySpend,
      savingsAmount,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
