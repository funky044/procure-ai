import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('demo1234', 12);
  const vendorPassword = await bcrypt.hash('vendor1234', 12);
  
  // Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@procure-ai.com' },
    update: {},
    create: {
      email: 'admin@procure-ai.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      department: 'Operations',
      approvalLimit: 1000000,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@procure-ai.com' },
    update: {},
    create: {
      email: 'demo@procure-ai.com',
      name: 'Demo User',
      password: hashedPassword,
      role: 'REQUESTER',
      department: 'Engineering',
      approvalLimit: 10000,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@procure-ai.com' },
    update: {},
    create: {
      email: 'manager@procure-ai.com',
      name: 'Sarah Manager',
      password: hashedPassword,
      role: 'MANAGER',
      department: 'Engineering',
      approvalLimit: 50000,
    },
  });

  await prisma.user.upsert({
    where: { email: 'finance@procure-ai.com' },
    update: {},
    create: {
      email: 'finance@procure-ai.com',
      name: 'Mike Finance',
      password: hashedPassword,
      role: 'FINANCE',
      department: 'Finance',
      approvalLimit: 100000,
    },
  });

  console.log('✅ Created users');

  // Vendors
  const vendors = [
    { name: 'Steelcase Direct', email: 'sales@steelcase.com', password: vendorPassword, logo: '🏢', rating: 4.7, responseTime: '4 hrs', specialty: 'Premium furniture', verified: true, portalEnabled: true, sustainabilityScore: 92, onTimeRate: 98, categories: ['furniture', 'desks', 'chairs'], totalOrders: 45, totalValue: 234500, avgDeliveryDays: 12 },
    { name: 'HON Office', email: 'business@hon.com', password: vendorPassword, logo: '🪑', rating: 4.3, responseTime: '2 hrs', specialty: 'Value furniture', verified: true, portalEnabled: true, sustainabilityScore: 78, onTimeRate: 94, categories: ['furniture', 'desks', 'chairs'], totalOrders: 67, totalValue: 189000, avgDeliveryDays: 8 },
    { name: 'Herman Miller', email: 'enterprise@hermanmiller.com', password: vendorPassword, logo: '💺', rating: 4.9, responseTime: '6 hrs', specialty: 'Ergonomic', verified: true, portalEnabled: true, sustainabilityScore: 96, onTimeRate: 99, categories: ['furniture', 'ergonomic', 'chairs'], totalOrders: 32, totalValue: 456000, avgDeliveryDays: 14 },
    { name: 'Dell Technologies', email: 'business@dell.com', password: vendorPassword, logo: '💻', rating: 4.5, responseTime: '1 hr', specialty: 'IT equipment', verified: true, portalEnabled: true, sustainabilityScore: 85, onTimeRate: 96, categories: ['it', 'laptops', 'monitors'], totalOrders: 89, totalValue: 567000, avgDeliveryDays: 5 },
    { name: 'Lenovo Enterprise', email: 'enterprise@lenovo.com', password: vendorPassword, logo: '🖥️', rating: 4.4, responseTime: '2 hrs', specialty: 'Business laptops', verified: true, portalEnabled: true, sustainabilityScore: 82, onTimeRate: 94, categories: ['it', 'laptops', 'workstations'], totalOrders: 56, totalValue: 345000, avgDeliveryDays: 7 },
  ];

  for (const v of vendors) {
    await prisma.vendor.upsert({ where: { email: v.email }, update: v, create: v });
  }
  console.log('✅ Created vendors');

  // Budgets
  const year = new Date().getFullYear();
  await prisma.budget.create({
    data: { name: 'Engineering Budget', department: 'Engineering', fiscalYear: year, totalAmount: 150000, spentAmount: 45000, committedAmount: 25000, alertThreshold: 80, managerId: managerUser.id },
  });
  await prisma.budget.create({
    data: { name: 'IT Budget', department: 'Engineering', fiscalYear: year, totalAmount: 200000, spentAmount: 78000, committedAmount: 42000, alertThreshold: 75, managerId: managerUser.id },
  });
  console.log('✅ Created budgets');

  // Approval Rules
  await prisma.approvalRule.create({ data: { name: 'Manager Approval >$5k', minAmount: 5000, maxAmount: 25000, approverRole: 'MANAGER', approverIds: [], categories: [], departments: [], escalationHours: 48 } });
  await prisma.approvalRule.create({ data: { name: 'Finance Approval >$25k', minAmount: 25000, approverRole: 'FINANCE', approverIds: [], categories: [], departments: [], escalationHours: 72 } });
  console.log('✅ Created approval rules');

  // Sample completed request
  const vendor = await prisma.vendor.findFirst({ where: { email: 'business@hon.com' } });
  if (vendor) {
    const req = await prisma.procurementRequest.create({
      data: { requestNumber: `PR-${year}-00001`, userId: demoUser.id, status: 'COMPLETED', stage: 'complete', category: 'furniture', description: '40 Standing Desks', quantity: 40, budget: 18000, urgency: 'MEDIUM' },
    });
    await prisma.quote.create({ data: { quoteNumber: `Q-${year}-00001`, vendorId: vendor.id, requestId: req.id, status: 'ACCEPTED', unitPrice: 385, totalPrice: 15400, quantity: 40, deliveryDays: 10, warranty: '5 years', validUntil: new Date(Date.now() + 14*24*60*60*1000), isRecommended: true } });
    await prisma.negotiation.create({ data: { requestId: req.id, vendorId: vendor.id, status: 'ACCEPTED', originalPrice: 16000, currentPrice: 15400, targetPrice: 15000, finalPrice: 15400, completedAt: new Date() } });
    const contract = await prisma.contract.create({ data: { contractNumber: `C-${year}-00001`, requestId: req.id, vendorId: vendor.id, status: 'SIGNED', items: [{ description: 'Standing Desk', quantity: 40, unitPrice: 385, total: 15400 }], totalValue: 15400, paymentTerms: 'Net 30', deliveryDate: new Date(), warranty: '5 years', terms: ['Net 30 payment', '5-year warranty'], signedAt: new Date() } });
    await prisma.purchaseOrder.create({ data: { poNumber: `PO-${year}-00001`, requestId: req.id, contractId: contract.id, vendorId: vendor.id, status: 'DELIVERED', shipToName: 'Demo User', shipToCompany: 'Acme Corp', shipToStreet: '123 Main St', shipToCity: 'San Francisco', shipToState: 'CA', shipToZip: '94105', items: contract.items, subtotal: 15400, total: 15400, paymentTerms: 'Net 30', deliveryDate: new Date(), deliveredAt: new Date() } });
    await prisma.approval.create({ data: { requestId: req.id, userId: managerUser.id, step: 1, role: 'MANAGER', status: 'APPROVED', approvedAt: new Date() } });
    console.log('✅ Created completed request');
  }

  // Sample active request
  const activeReq = await prisma.procurementRequest.create({
    data: { requestNumber: `PR-${year}-00002`, userId: demoUser.id, status: 'QUOTING', stage: 'reviewing_quotes', category: 'it', description: '25 MacBook Pro for Dev Team', quantity: 25, budget: 75000, urgency: 'HIGH' },
  });
  await prisma.message.createMany({ data: [
    { requestId: activeReq.id, userId: demoUser.id, type: 'text', content: 'I need 25 MacBook Pro M3 laptops', isUser: true },
    { requestId: activeReq.id, type: 'text', content: 'I\'ll search vendors and get quotes for you.', isUser: false },
  ]});
  console.log('✅ Created active request');

  // Notifications
  await prisma.notification.createMany({ data: [
    { userId: demoUser.id, type: 'QUOTE_RECEIVED', title: 'New Quote', message: 'Dell submitted a quote', link: `/requests/${activeReq.id}` },
    { userId: demoUser.id, type: 'BUDGET_ALERT', title: 'Budget Alert', message: 'IT Budget at 60%', link: '/budgets' },
  ]});
  console.log('✅ Created notifications');

  console.log('\n🎉 Seeding complete!\n');
  console.log('Demo: demo@procure-ai.com / demo1234');
  console.log('Manager: manager@procure-ai.com / demo1234');
  console.log('Admin: admin@procure-ai.com / demo1234');
  console.log('Vendor: sales@steelcase.com / vendor1234');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
