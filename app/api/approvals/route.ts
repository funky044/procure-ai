import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendApprovalRequestEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';
    const type = searchParams.get('type'); // 'my-requests' or 'to-approve'

    let approvals;
    
    if (type === 'my-requests') {
      // Get approvals for user's own requests
      approvals = await prisma.approval.findMany({
        where: {
          request: { userId },
        },
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              description: true,
              budget: true,
              status: true,
            },
          },
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Get approvals assigned to this user
      approvals = await prisma.approval.findMany({
        where: {
          userId,
          status: status as any,
        },
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              description: true,
              budget: true,
              status: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(approvals);
  } catch (error) {
    console.error('Get approvals error:', error);
    return NextResponse.json(
      { error: 'Failed to get approvals' },
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
    const { requestId, approverIds, thresholds } = body;

    // Get request details
    const request = await prisma.procurementRequest.findUnique({
      where: { id: requestId },
      include: { user: true, contract: true },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Create approval chain
    const approvals = await Promise.all(
      approverIds.map(async (approverId: string, index: number) => {
        const approver = await prisma.user.findUnique({
          where: { id: approverId },
        });

        const approval = await prisma.approval.create({
          data: {
            requestId,
            userId: approverId,
            step: index + 1,
            role: approver?.role || 'MANAGER',
            threshold: thresholds?.[index],
            dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
          },
        });

        // Send email to first approver
        if (index === 0 && approver?.email) {
          await sendApprovalRequestEmail(approver.email, {
            approverName: approver.name || 'Approver',
            requesterName: request.user.name || 'User',
            requestId: request.requestNumber,
            description: request.description || 'Procurement Request',
            totalAmount: request.contract?.totalValue || request.budget || 0,
            approvalLink: `${process.env.NEXTAUTH_URL}/requests/${requestId}`,
          });

          // Create notification
          await prisma.notification.create({
            data: {
              userId: approverId,
              type: 'APPROVAL_REQUIRED',
              title: 'Approval Required',
              message: `${request.user.name} submitted a request for $${(request.contract?.totalValue || request.budget || 0).toLocaleString()}`,
              link: `/requests/${requestId}`,
            },
          });
        }

        return approval;
      })
    );

    // Update request status
    await prisma.procurementRequest.update({
      where: { id: requestId },
      data: { status: 'PENDING_APPROVAL' },
    });

    return NextResponse.json(approvals);
  } catch (error) {
    console.error('Create approvals error:', error);
    return NextResponse.json(
      { error: 'Failed to create approvals' },
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

    const userId = (session.user as any).id;
    const body = await req.json();
    const { approvalId, action, comments } = body;

    // Get the approval
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        request: {
          include: {
            user: true,
            approvals: { orderBy: { step: 'asc' } },
          },
        },
      },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    // Verify user is the approver
    if (approval.userId !== userId) {
      return NextResponse.json({ error: 'Not authorized to approve' }, { status: 403 });
    }

    // Update approval
    const updatedApproval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        comments,
        approvedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        requestId: approval.requestId,
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        entity: 'Approval',
        entityId: approvalId,
        newData: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', comments },
      },
    });

    if (action === 'approve') {
      // Check if there are more approvers
      const nextApproval = approval.request.approvals.find(
        (a) => a.step === approval.step + 1 && a.status === 'PENDING'
      );

      if (nextApproval) {
        // Notify next approver
        const nextApprover = await prisma.user.findUnique({
          where: { id: nextApproval.userId },
        });

        if (nextApprover?.email) {
          await sendApprovalRequestEmail(nextApprover.email, {
            approverName: nextApprover.name || 'Approver',
            requesterName: approval.request.user.name || 'User',
            requestId: approval.request.requestNumber,
            description: approval.request.description || 'Procurement Request',
            totalAmount: approval.request.budget || 0,
            approvalLink: `${process.env.NEXTAUTH_URL}/requests/${approval.requestId}`,
          });

          await prisma.notification.create({
            data: {
              userId: nextApproval.userId,
              type: 'APPROVAL_REQUIRED',
              title: 'Approval Required',
              message: `Request from ${approval.request.user.name} needs your approval`,
              link: `/requests/${approval.requestId}`,
            },
          });
        }
      } else {
        // All approved - update request status
        await prisma.procurementRequest.update({
          where: { id: approval.requestId },
          data: { status: 'APPROVED' },
        });

        // Notify requester
        await prisma.notification.create({
          data: {
            userId: approval.request.userId,
            type: 'APPROVAL_COMPLETED',
            title: 'Request Approved',
            message: 'Your procurement request has been fully approved',
            link: `/requests/${approval.requestId}`,
          },
        });
      }
    } else {
      // Rejected - update request status
      await prisma.procurementRequest.update({
        where: { id: approval.requestId },
        data: { status: 'REJECTED' },
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          userId: approval.request.userId,
          type: 'APPROVAL_COMPLETED',
          title: 'Request Rejected',
          message: `Your procurement request was rejected. Reason: ${comments || 'No reason provided'}`,
          link: `/requests/${approval.requestId}`,
        },
      });
    }

    return NextResponse.json(updatedApproval);
  } catch (error) {
    console.error('Update approval error:', error);
    return NextResponse.json(
      { error: 'Failed to update approval' },
      { status: 500 }
    );
  }
}
