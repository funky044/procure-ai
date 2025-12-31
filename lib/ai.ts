import Anthropic from '@anthropic-ai/sdk';
import prisma from './prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the procurement AI
const SYSTEM_PROMPT = `You are ProcureAI, an intelligent procurement assistant. You help users purchase items through natural conversation.

Your capabilities:
1. Understand what users need to purchase
2. Extract key details: quantity, item type, budget, timeline, specifications
3. Recommend vendors based on requirements
4. Compare quotes and highlight best options
5. Negotiate with vendors for better prices
6. Generate contracts and purchase orders
7. Track deliveries

Conversation Guidelines:
- Be concise and professional
- Ask clarifying questions one at a time
- Provide specific recommendations with reasoning
- Always confirm important details before proceeding
- Use numbers and data to support decisions

Response Format:
Always respond with valid JSON in this structure:
{
  "message": "Your conversational response to the user",
  "action": "next_action_to_take", // One of: "clarify", "search_vendors", "send_rfq", "show_quotes", "start_negotiation", "generate_contract", "create_po", "none"
  "data": {}, // Any structured data extracted or to be displayed
  "stage": "current_stage", // One of: "initial", "clarify_requirements", "budget_timeline", "vendor_search", "rfq_sent", "quotes_received", "reviewing_quotes", "negotiating", "negotiation_complete", "contract_review", "pending_approval", "generating_po", "complete"
  "suggestions": [] // Array of suggested follow-up messages for the user
}

Data Extraction:
When users mention procurement needs, extract:
- quantity: number
- itemType: string (desks, chairs, laptops, etc.)
- budget: number (if mentioned)
- timeline: string (if mentioned)
- specifications: object (any specific requirements)`;

export interface AIResponse {
  message: string;
  action: string;
  data: Record<string, any>;
  stage: string;
  suggestions: string[];
}

export async function processWithAI(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: {
    currentStage: string;
    requestData: Record<string, any>;
    vendors?: any[];
    quotes?: any[];
  }
): Promise<AIResponse> {
  try {
    // Build context message
    const contextMessage = `
Current Stage: ${context.currentStage}
Request Data: ${JSON.stringify(context.requestData)}
${context.vendors ? `Available Vendors: ${JSON.stringify(context.vendors.slice(0, 5))}` : ''}
${context.quotes ? `Received Quotes: ${JSON.stringify(context.quotes)}` : ''}
`;

    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: `Context:\n${contextMessage}\n\nUser message: ${userMessage}`,
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    // Extract text from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If no JSON, wrap the response
      return {
        message: textContent.text,
        action: 'none',
        data: {},
        stage: context.currentStage,
        suggestions: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as AIResponse;
    return parsed;
  } catch (error) {
    console.error('AI processing error:', error);
    return {
      message: "I'm having trouble processing that. Could you rephrase?",
      action: 'none',
      data: {},
      stage: context.currentStage,
      suggestions: ['Start over', 'Help me with procurement'],
    };
  }
}

// Vendor search using AI
export async function searchVendorsWithAI(
  requirements: {
    category: string;
    quantity: number;
    budget?: number;
    specifications?: Record<string, any>;
  }
): Promise<any[]> {
  // In production, this would query a vendor database or API
  // For now, we search our database
  const vendors = await prisma.vendor.findMany({
    where: {
      categories: {
        has: requirements.category,
      },
      verified: true,
    },
    orderBy: {
      rating: 'desc',
    },
    take: 10,
  });

  return vendors;
}

// Generate negotiation strategy with AI
export async function generateNegotiationStrategy(
  quote: {
    vendorName: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  },
  marketData: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
  }
): Promise<{
  targetPrice: number;
  strategy: string;
  openingOffer: number;
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: 'You are a procurement negotiation expert. Respond only with valid JSON.',
    messages: [
      {
        role: 'user',
        content: `Generate a negotiation strategy for this quote:
Vendor: ${quote.vendorName}
Unit Price: $${quote.unitPrice}
Quantity: ${quote.quantity}
Total: $${quote.totalPrice}

Market Data:
- Average Price: $${marketData.avgPrice}
- Range: $${marketData.minPrice} - $${marketData.maxPrice}

Respond with JSON: { "targetPrice": number, "strategy": "string", "openingOffer": number }`,
      },
    ],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No response');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Default strategy
    const targetPrice = Math.round(quote.totalPrice * 0.85);
    return {
      targetPrice,
      strategy: 'Volume discount based on order size',
      openingOffer: Math.round(quote.totalPrice * 0.80),
    };
  }

  return JSON.parse(jsonMatch[0]);
}

// Generate contract terms with AI
export async function generateContractTerms(
  request: {
    description: string;
    quantity: number;
    totalPrice: number;
    vendorName: string;
    deliveryDate: Date;
  }
): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: 'You are a procurement contract specialist. Generate fair, balanced contract terms.',
    messages: [
      {
        role: 'user',
        content: `Generate 5 key contract terms for:
Item: ${request.description}
Quantity: ${request.quantity}
Total: $${request.totalPrice}
Vendor: ${request.vendorName}
Delivery: ${request.deliveryDate.toISOString()}

Respond with JSON array of strings: ["term1", "term2", ...]`,
      },
    ],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return [
      'Payment due within 30 days of invoice',
      'Free shipping for orders over $10,000',
      'Late delivery penalty: 1% per week',
      'Return window: 14 days from delivery',
      'Warranty as per manufacturer terms',
    ];
  }

  const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [
      'Payment due within 30 days of invoice',
      'Free shipping for orders over $10,000',
      'Late delivery penalty: 1% per week',
      'Return window: 14 days from delivery',
      'Warranty as per manufacturer terms',
    ];
  }

  return JSON.parse(jsonMatch[0]);
}
