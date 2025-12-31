import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'ProcureAI <noreply@procure-ai.com>';

export async function sendPurchaseOrderEmail(
  to: string,
  poData: {
    poNumber: string;
    vendorName: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    total: number;
    deliveryDate: string;
    shipTo: {
      company: string;
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  }
) {
  const itemsHtml = poData.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; padding: 12px; text-align: left; }
        .total { font-size: 24px; font-weight: bold; color: #6366f1; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Purchase Order</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">${poData.poNumber}</p>
        </div>
        <div class="content">
          <p>Dear ${poData.vendorName},</p>
          <p>Please find below the purchase order details:</p>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 12px; text-align: right;" class="total">$${poData.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <h3>Ship To:</h3>
          <p>
            ${poData.shipTo.company}<br>
            ${poData.shipTo.street}<br>
            ${poData.shipTo.city}, ${poData.shipTo.state} ${poData.shipTo.zip}
          </p>
          
          <h3>Expected Delivery:</h3>
          <p>${poData.deliveryDate}</p>
          
          <p style="margin-top: 30px;">Please confirm receipt of this order and provide estimated shipping date.</p>
          
          <p>Best regards,<br>ProcureAI Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ProcureAI</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Purchase Order ${poData.poNumber} from ProcureAI`,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendApprovalRequestEmail(
  to: string,
  data: {
    approverName: string;
    requesterName: string;
    requestId: string;
    description: string;
    totalAmount: number;
    approvalLink: string;
  }
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
        .btn { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
        .btn-secondary { background: #6b7280; }
        .amount { font-size: 32px; font-weight: bold; color: #6366f1; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⏳ Approval Required</h1>
        </div>
        <div class="content">
          <p>Hi ${data.approverName},</p>
          <p>${data.requesterName} has submitted a procurement request that requires your approval:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Request:</strong> ${data.description}</p>
            <p style="margin: 0;"><strong>Amount:</strong> <span class="amount">$${data.totalAmount.toLocaleString()}</span></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.approvalLink}" class="btn">Review & Approve</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Request ID: ${data.requestId}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Approval Required: $${data.totalAmount.toLocaleString()} - ${data.description}`,
      html,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendStatusUpdateEmail(
  to: string,
  data: {
    userName: string;
    requestId: string;
    description: string;
    status: string;
    message: string;
  }
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
        .status { display: inline-block; background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📦 Order Update</h1>
        </div>
        <div class="content">
          <p>Hi ${data.userName},</p>
          <p>Your procurement request has been updated:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Request:</strong> ${data.description}</p>
            <p style="margin: 0;"><strong>Status:</strong> <span class="status">${data.status}</span></p>
          </div>
          
          <p>${data.message}</p>
          
          <p style="color: #6b7280; font-size: 14px;">Request ID: ${data.requestId}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Order Update: ${data.status} - ${data.description}`,
      html,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
