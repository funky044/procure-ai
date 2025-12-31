import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { processWithAI, searchVendorsWithAI, generateNegotiationStrategy, generateContractTerms } from '@/lib/ai';
import { sendPurchaseOrderEmail, sendApprovalRequestEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, requestId } = await req.json();
    const userId = (session.user as any).id;

    // Get or create procurement request
    let request = requestId
      ? await prisma.procurementRequest.findUnique({
          where: { id: requestId },
          include: {
            quotes: { include: { vendor: true } },
            negotiation: { include: { rounds: true } },
            contract: true,
            purchaseOrder: true,
            messages: { orderBy: { createdAt: 'asc' } },
          },
        })
      : null;

    if (!request) {
      request = await prisma.procurementRequest.create({
        data: {
          userId,
          status: 'DRAFT',
          stage: 'initial',
        },
        include: {
          quotes: { include: { vendor: true } },
          negotiation: { include: { rounds: true } },
          contract: true,
          purchaseOrder: true,
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        requestId: request.id,
        userId,
        type: 'text',
        content: message,
        isUser: true,
      },
    });

    // Build conversation history for AI
    const conversationHistory = request.messages.map((msg) => ({
      role: (msg.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content || '',
    }));

    // Get available vendors if needed
    let vendors: any[] = [];
    if (['vendor_search', 'rfq_sent', 'quotes_received'].includes(request.stage)) {
      vendors = await prisma.vendor.findMany({
        where: { verified: true },
        orderBy: { rating: 'desc' },
        take: 10,
      });
    }

    // Process with AI
    const aiResponse = await processWithAI(message, conversationHistory, {
      currentStage: request.stage,
      requestData: {
        category: request.category,
        description: request.description,
        quantity: request.quantity,
        budget: request.budget,
        urgency: request.urgency,
      },
      vendors: vendors.length > 0 ? vendors : undefined,
      quotes: request.quotes.length > 0 ? request.quotes : undefined,
    });

    // Handle actions based on AI response
    let responseData: any = { ...aiResponse.data };

    switch (aiResponse.action) {
      case 'search_vendors':
        if (aiResponse.data.category && aiResponse.data.quantity) {
          // Update request with extracted data
          await prisma.procurementRequest.update({
            where: { id: request.id },
            data: {
              category: aiResponse.data.category,
              description: aiResponse.data.itemType || aiResponse.data.description,
              quantity: aiResponse.data.quantity,
              budget: aiResponse.data.budget,
              stage: 'vendor_search',
              status: 'SOURCING',
            },
          });

          // Search vendors
          const matchedVendors = await searchVendorsWithAI({
            category: aiResponse.data.category,
            quantity: aiResponse.data.quantity,
            budget: aiResponse.data.budget,
          });

          responseData.vendors = matchedVendors;
        }
        break;

      case 'send_rfq':
        // Update stage
        await prisma.procurementRequest.update({
          where: { id: request.id },
          data: {
            stage: 'rfq_sent',
            status: 'QUOTING',
          },
        });

        // In production, this would send actual RFQ emails to vendors
        // For now, we simulate quote responses
        const quotingVendors = await prisma.vendor.findMany({
          where: { verified: true },
          take: 4,
        });

        const quotes = await Promise.all(
          quotingVendors.map(async (vendor, index) => {
            const basePrice = 250 + Math.random() * 200;
            const quantity = request!.quantity || 40;
            return prisma.quote.create({
              data: {
                vendorId: vendor.id,
                requestId: request!.id,
                unitPrice: Math.round(basePrice * 100) / 100,
                totalPrice: Math.round(basePrice * quantity * 100) / 100,
                quantity,
                deliveryDays: 7 + index * 5,
                warranty: `${3 + index * 2} years`,
                paymentTerms: 'Net 30',
                validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                isRecommended: index === 0,
              },
              include: { vendor: true },
            });
          })
        );

        // Update stage
        await prisma.procurementRequest.update({
          where: { id: request.id },
          data: {
            stage: 'quotes_received',
          },
        });

        responseData.quotes = quotes;
        break;

      case 'start_negotiation':
        if (aiResponse.data.selectedQuoteId || request.quotes.length > 0) {
          const selectedQuote = aiResponse.data.selectedQuoteId
            ? request.quotes.find((q) => q.id === aiResponse.data.selectedQuoteId)
            : request.quotes.find((q) => q.isRecommended) || request.quotes[0];

          if (selectedQuote) {
            // Generate negotiation strategy
            const strategy = await generateNegotiationStrategy(
              {
                vendorName: selectedQuote.vendor.name,
                unitPrice: selectedQuote.unitPrice,
                quantity: selectedQuote.quantity,
                totalPrice: selectedQuote.totalPrice,
              },
              {
                avgPrice: selectedQuote.unitPrice * 0.9,
                minPrice: selectedQuote.unitPrice * 0.75,
                maxPrice: selectedQuote.unitPrice * 1.1,
              }
            );

            // Create negotiation
            const negotiation = await prisma.negotiation.create({
              data: {
                requestId: request.id,
                vendorId: selectedQuote.vendorId,
                originalPrice: selectedQuote.totalPrice,
                currentPrice: selectedQuote.totalPrice,
                targetPrice: strategy.targetPrice,
                rounds: {
                  create: {
                    round: 1,
                    ourOffer: strategy.openingOffer,
                    message: strategy.strategy,
                    status: 'SENT',
                  },
                },
              },
              include: { rounds: true, vendor: true },
            });

            // Update request
            await prisma.procurementRequest.update({
              where: { id: request.id },
              data: {
                selectedQuoteId: selectedQuote.id,
                stage: 'negotiating',
                status: 'NEGOTIATING',
              },
            });

            // Simulate vendor counter-offer after delay
            setTimeout(async () => {
              const counterOffer = Math.round(
                (strategy.openingOffer + selectedQuote.totalPrice) / 2
              );
              await prisma.negotiationRound.create({
                data: {
                  negotiationId: negotiation.id,
                  round: 2,
                  ourOffer: strategy.targetPrice,
                  vendorResponse: counterOffer,
                  message: 'Vendor counter-offer received',
                  status: 'COUNTERED',
                },
              });

              await prisma.negotiation.update({
                where: { id: negotiation.id },
                data: { currentPrice: counterOffer },
              });
            }, 3000);

            responseData.negotiation = negotiation;
          }
        }
        break;

      case 'generate_contract':
        if (request.negotiation) {
          const neg = request.negotiation;
          const terms = await generateContractTerms({
            description: request.description || 'Office Equipment',
            quantity: request.quantity || 40,
            totalPrice: neg.currentPrice,
            vendorName: neg.vendor?.name || 'Vendor',
            deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          });

          const contract = await prisma.contract.create({
            data: {
              requestId: request.id,
              vendorId: neg.vendorId,
              items: [
                {
                  description: request.description,
                  quantity: request.quantity,
                  unitPrice: neg.currentPrice / (request.quantity || 1),
                  total: neg.currentPrice,
                },
              ],
              totalValue: neg.currentPrice,
              paymentTerms: 'Net 30',
              deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              warranty: '5 years',
              terms,
            },
            include: { vendor: true },
          });

          // Update negotiation and request
          await prisma.negotiation.update({
            where: { id: neg.id },
            data: { status: 'ACCEPTED', completedAt: new Date() },
          });

          await prisma.procurementRequest.update({
            where: { id: request.id },
            data: {
              stage: 'contract_review',
              status: 'REVIEWING',
            },
          });

          responseData.contract = contract;
        }
        break;

      case 'create_po':
        if (request.contract) {
          const contract = request.contract;
          const poNumber = `PO-${new Date().getFullYear()}-${String(
            Math.floor(Math.random() * 100000)
          ).padStart(5, '0')}`;

          const po = await prisma.purchaseOrder.create({
            data: {
              poNumber,
              requestId: request.id,
              contractId: contract.id,
              vendorId: contract.vendorId,
              shipToName: session.user.name || 'Procurement Team',
              shipToCompany: (session.user as any).department || 'Company',
              shipToStreet: '123 Main Street',
              shipToCity: 'San Francisco',
              shipToState: 'CA',
              shipToZip: '94105',
              items: contract.items,
              subtotal: contract.totalValue,
              tax: 0,
              total: contract.totalValue,
              paymentTerms: contract.paymentTerms,
              deliveryDate: contract.deliveryDate,
            },
            include: { vendor: true },
          });

          // Update request
          await prisma.procurementRequest.update({
            where: { id: request.id },
            data: {
              stage: 'complete',
              status: 'PO_GENERATED',
            },
          });

          // Send PO email to vendor
          const vendor = await prisma.vendor.findUnique({
            where: { id: contract.vendorId },
          });

          if (vendor?.email) {
            await sendPurchaseOrderEmail(vendor.email, {
              poNumber,
              vendorName: vendor.name,
              items: contract.items as any,
              total: contract.totalValue,
              deliveryDate: contract.deliveryDate.toLocaleDateString(),
              shipTo: {
                company: po.shipToCompany,
                street: po.shipToStreet,
                city: po.shipToCity,
                state: po.shipToState,
                zip: po.shipToZip,
              },
            });
          }

          responseData.purchaseOrder = po;
        }
        break;
    }

    // Update request stage if changed
    if (aiResponse.stage && aiResponse.stage !== request.stage) {
      await prisma.procurementRequest.update({
        where: { id: request.id },
        data: { stage: aiResponse.stage },
      });
    }

    // Save AI response message
    await prisma.message.create({
      data: {
        requestId: request.id,
        type: aiResponse.action !== 'none' ? aiResponse.action : 'text',
        content: aiResponse.message,
        isUser: false,
        data: responseData,
      },
    });

    return NextResponse.json({
      requestId: request.id,
      message: aiResponse.message,
      action: aiResponse.action,
      data: responseData,
      stage: aiResponse.stage,
      suggestions: aiResponse.suggestions,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    const request = await prisma.procurementRequest.findUnique({
      where: { id: requestId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        quotes: { include: { vendor: true } },
        negotiation: { include: { rounds: true, vendor: true } },
        contract: { include: { vendor: true } },
        purchaseOrder: { include: { vendor: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}
