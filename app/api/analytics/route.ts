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
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '90');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Base filter - admins see all, others see their own
    const userFilter = ['ADMIN', 'FINANCE'].includes(userRole) ? {} : { userId };

    // Get completed requests with POs
    const requests = await prisma.procurementRequest.findMany({
      where: {
        ...userFilter,
        createdAt: { gte: startDate },
        purchaseOrder: { isNot: null },
      },
      include: {
        purchaseOrder: { include: { vendor: true } },
        negotiation: true,
      },
    });

    // Spend by category
    const categoryMap = new Map<string, { amount: number; count: number }>();
    requests.forEach((r) => {
      const cat = r.category || 'other';
      const current = categoryMap.get(cat) || { amount: 0, count: 0 };
      categoryMap.set(cat, {
        amount: current.amount + (r.purchaseOrder?.total || 0),
        count: current.count + 1,
      });
    });
    const spendByCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // Spend by month
    const monthMap = new Map<string, number>();
    requests.forEach((r) => {
      const month = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthMap.set(month, (monthMap.get(month) || 0) + (r.purchaseOrder?.total || 0));
    });
    const spendByMonth = Array.from(monthMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .slice(-6);

    // Vendor performance
    const vendors = await prisma.vendor.findMany({
      where: {
        purchaseOrders: { some: { createdAt: { gte: startDate } } },
      },
      include: {
        purchaseOrders: {
          where: { createdAt: { gte: startDate } },
        },
      },
    });

    const vendorPerformance = vendors.map((v) => ({
      vendor: v.name,
      totalOrders: v.totalOrders,
      totalValue: v.totalValue,
      avgDeliveryDays: v.avgDeliveryDays || 7,
      onTimeRate: v.onTimeRate || 95,
    })).sort((a, b) => b.totalValue - a.totalValue);

    // Savings summary
    const negotiations = requests.filter((r) => r.negotiation?.status === 'ACCEPTED');
    const totalSavings = negotiations.reduce((sum, r) => {
      if (r.negotiation) {
        return sum + (r.negotiation.originalPrice - r.negotiation.currentPrice);
      }
      return sum;
    }, 0);
    const avgSavingsPercent = negotiations.length > 0
      ? negotiations.reduce((sum, r) => {
          if (r.negotiation) {
            const savings = (r.negotiation.originalPrice - r.negotiation.currentPrice) / r.negotiation.originalPrice * 100;
            return sum + savings;
          }
          return sum;
        }, 0) / negotiations.length
      : 0;

    // Top items
    const itemMap = new Map<string, { quantity: number; totalSpend: number }>();
    requests.forEach((r) => {
      const desc = r.description || 'Unknown';
      const current = itemMap.get(desc) || { quantity: 0, totalSpend: 0 };
      itemMap.set(desc, {
        quantity: current.quantity + (r.quantity || 0),
        totalSpend: current.totalSpend + (r.purchaseOrder?.total || 0),
      });
    });
    const topItems = Array.from(itemMap.entries())
      .map(([description, data]) => ({ description, ...data }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);

    return NextResponse.json({
      spendByCategory,
      spendByMonth,
      vendorPerformance,
      savingsSummary: {
        totalSavings,
        avgSavingsPercent,
        negotiationsCount: negotiations.length,
      },
      topItems,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}
