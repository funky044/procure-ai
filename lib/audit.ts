import prisma from '@/lib/prisma';

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
