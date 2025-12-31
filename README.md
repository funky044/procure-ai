# ProcureAI - Full-Featured Conversational Procurement Platform

> The conversation IS the application. No forms. No dashboards. Just talk.

A production-ready AI-powered procurement platform with complete end-to-end workflow management.

## 🚀 Features

### Core Features
- 🤖 **AI-Powered Conversations** - Claude AI understands procurement needs
- 🔍 **Smart Vendor Search** - Finds best vendors for requirements
- 📊 **Automated Quote Comparison** - Normalizes and compares quotes
- 🤝 **AI Negotiation** - Negotiates discounts automatically
- 📄 **Contract Generation** - AI-generated contract terms
- 📦 **PO Generation** - Creates and sends purchase orders

### High Priority Features ✅
- 📋 **Dashboard & History** - View all requests, filter by status, track spending
- 🏢 **Vendor Portal** - Vendors log in to see RFQs, submit quotes, confirm POs
- 📎 **File Attachments** - Upload specs, images, quotes - AI analyzes them
- 💰 **Budget Management** - Set department budgets, track spend, threshold alerts
- ✅ **Multi-user Approvals** - Approval chains with email notifications, escalation

### Medium Priority Features ✅
- 🧾 **Invoice Matching** - Match invoices to POs, flag discrepancies
- 🔄 **Recurring Orders** - Schedule automated reorders
- 📊 **Analytics Dashboard** - Spend by category, vendor performance, savings
- 📝 **Audit Trail** - Complete history of all actions for compliance

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | NextAuth.js |
| AI | Anthropic Claude |
| Email | Resend |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| State | Zustand |

## 📁 Project Structure

```
procure-ai/
├── app/
│   ├── api/
│   │   ├── auth/           # NextAuth endpoints
│   │   ├── chat/           # Main AI chat API
│   │   ├── requests/       # Procurement requests CRUD
│   │   ├── vendors/        # Vendor management
│   │   ├── budgets/        # Budget management
│   │   ├── approvals/      # Approval workflow
│   │   ├── invoices/       # Invoice matching
│   │   ├── recurring/      # Recurring orders
│   │   ├── analytics/      # Analytics & reports
│   │   ├── audit/          # Audit trail
│   │   ├── notifications/  # User notifications
│   │   ├── upload/         # File uploads with AI
│   │   └── vendor-portal/  # Vendor portal APIs
│   ├── dashboard/          # Dashboard page
│   ├── requests/[id]/      # Request detail page
│   ├── budgets/            # Budget management
│   ├── analytics/          # Analytics dashboard
│   ├── vendor-portal/      # Vendor portal pages
│   └── auth/               # Auth pages
├── components/
│   ├── chat/               # Chat components
│   ├── FileUpload.tsx      # File upload with AI
│   └── Providers.tsx       # NextAuth provider
├── lib/
│   ├── ai.ts               # Claude AI integration
│   ├── auth.ts             # NextAuth config
│   ├── email.ts            # Email service
│   ├── prisma.ts           # Database client
│   └── store.ts            # Zustand store
└── prisma/
    ├── schema.prisma       # Full database schema
    └── seed.ts             # Demo data
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/procure-ai.git
cd procure-ai
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database (Required)
DATABASE_URL="postgresql://..."

# Auth (Required)
NEXTAUTH_SECRET="openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# AI (Required)
ANTHROPIC_API_KEY="sk-ant-..."

# Email (Optional)
RESEND_API_KEY="re_..."
```

### 3. Setup Database

```bash
npm run db:push    # Create tables
npm run db:seed    # Add demo data
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| User | demo@procure-ai.com | demo1234 |
| Manager | manager@procure-ai.com | demo1234 |
| Finance | finance@procure-ai.com | demo1234 |
| Admin | admin@procure-ai.com | demo1234 |

### Vendor Portal
| Vendor | Email | Password |
|--------|-------|----------|
| Steelcase | sales@steelcase.com | vendor1234 |
| Dell | business@dell.com | vendor1234 |

## 📊 Database Schema

### Core Models
- **User** - Authentication & roles
- **ProcurementRequest** - Main request entity
- **Vendor** - Supplier information
- **Quote** - Vendor quotes
- **Negotiation** - Price negotiations
- **Contract** - Purchase agreements
- **PurchaseOrder** - Final POs

### Supporting Models
- **Budget** - Department budgets
- **Approval** - Approval workflow
- **ApprovalRule** - Approval routing rules
- **Invoice** - Invoice matching
- **Delivery** - Shipment tracking
- **Attachment** - File uploads
- **AuditLog** - Compliance trail
- **Notification** - User alerts
- **RecurringSchedule** - Automated reorders
- **SpendAnalytics** - Reporting data

## 🔄 Workflow

```
1. User: "I need 40 office desks"
   → AI extracts requirements

2. AI searches vendors, sends RFQs
   → Vendors submit quotes via portal

3. AI compares quotes, recommends best
   → User selects vendor

4. AI negotiates for better price
   → Shows savings achieved

5. AI generates contract
   → Routes for approval

6. Approvers approve/reject
   → Email notifications sent

7. AI generates PO
   → Sends to vendor

8. Vendor confirms, ships
   → Delivery tracking

9. Invoice received
   → Auto-matched to PO

10. Complete!
    → Analytics updated
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Vercel

```
DATABASE_URL        → Vercel Postgres / Supabase / Neon
NEXTAUTH_SECRET     → Generate secure key
NEXTAUTH_URL        → https://your-app.vercel.app
ANTHROPIC_API_KEY   → From Anthropic Console
RESEND_API_KEY      → From Resend (optional)
```

### Database Options

| Provider | Pros | Setup |
|----------|------|-------|
| Vercel Postgres | Easy integration | Dashboard → Storage |
| Supabase | Free tier, GUI | supabase.com |
| Neon | Serverless | neon.tech |
| PlanetScale | MySQL-compatible | planetscale.com |

## 📝 API Reference

### Chat
- `POST /api/chat` - Send message, get AI response
- `GET /api/chat?requestId=xxx` - Get conversation history

### Requests
- `GET /api/requests` - List user's requests
- `POST /api/requests` - Create request
- `GET /api/requests/[id]` - Get request detail
- `PUT /api/requests/[id]` - Update request
- `DELETE /api/requests/[id]` - Delete draft request

### Approvals
- `GET /api/approvals` - Get pending approvals
- `POST /api/approvals` - Create approval chain
- `PUT /api/approvals` - Approve/reject

### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets` - Update budget

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices` - Approve/dispute/pay

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/analytics/stats` - Get summary stats

### Vendor Portal
- `POST /api/vendor-portal/auth` - Vendor login
- `GET /api/vendor-portal/rfqs` - Get open RFQs
- `POST /api/vendor-portal/rfqs` - Submit quote
- `GET /api/vendor-portal/orders` - Get POs
- `PUT /api/vendor-portal/orders` - Update order status

## 🔒 Security

- Password hashing with bcrypt
- JWT session tokens
- Role-based access control
- Audit logging
- Input validation with Zod

## 📈 Scaling

- Standalone Next.js output for containers
- Prisma connection pooling
- Serverless-ready architecture
- Edge-compatible auth

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open PR

## 📄 License

MIT

---

Built with ❤️ using Next.js, Claude AI, and Prisma
