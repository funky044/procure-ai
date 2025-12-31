import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const requestId = formData.get('requestId') as string;
    const analyzeWithAI = formData.get('analyze') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // For demo: store as data URL (in production, use S3/R2/Vercel Blob)
    const mimeType = file.type;
    const url = `data:${mimeType};base64,${base64}`;

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        requestId: requestId || null,
        filename: `${Date.now()}-${file.name}`,
        originalName: file.name,
        mimeType,
        size: file.size,
        url,
        uploadedBy: userId,
      },
    });

    // AI Analysis for supported file types
    let aiAnalysis = null;
    let extractedText = null;

    if (analyzeWithAI && process.env.ANTHROPIC_API_KEY) {
      try {
        if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
          // Analyze document with Claude
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: mimeType as any,
                      data: base64,
                    },
                  },
                  {
                    type: 'text',
                    text: `Analyze this document for procurement purposes. Extract and return JSON with:
{
  "documentType": "quote|invoice|spec_sheet|contract|other",
  "vendor": "vendor name if visible",
  "items": [{ "description": "", "quantity": 0, "unitPrice": 0, "total": 0 }],
  "totalAmount": 0,
  "currency": "USD",
  "dates": { "issued": "", "due": "", "valid_until": "" },
  "keyTerms": [],
  "extractedText": "full text content"
}

If any field is not applicable, use null.`,
                  },
                ],
              },
            ],
          });

          const textContent = response.content.find((c) => c.type === 'text');
          if (textContent && textContent.type === 'text') {
            const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiAnalysis = JSON.parse(jsonMatch[0]);
              extractedText = aiAnalysis.extractedText;
            }
          }
        }

        // Update attachment with AI analysis
        if (aiAnalysis) {
          await prisma.attachment.update({
            where: { id: attachment.id },
            data: {
              aiAnalysis,
              extractedText,
            },
          });
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        // Continue without AI analysis
      }
    }

    return NextResponse.json({
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      aiAnalysis,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
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

    const attachments = await prisma.attachment.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    return NextResponse.json(
      { error: 'Failed to get attachments' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
    }

    await prisma.attachment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
