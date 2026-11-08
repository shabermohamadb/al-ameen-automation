import { formatINR } from './gst';

export interface WhatsAppMessageParams {
  phone: string;
  customerName: string;
  type: 'invoice' | 'quotation' | 'receipt';
  docNumber: string;
  grandTotal: number;
  balanceAmount?: number;
  itemsSummary?: string;
  date: string;
}

/**
 * Builds a direct WhatsApp click-to-chat URL with a clean, branded business message.
 */
export function generateWhatsAppLink(params: WhatsAppMessageParams): string {
  // Strip non-numeric characters from phone
  let cleanPhone = params.phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone; // Default to India prefix
  }

  let title = 'Tax Invoice';
  if (params.type === 'quotation') title = 'Quotation';
  if (params.type === 'receipt') title = 'Payment Receipt';

  const lines = [
    `*AL AMEEN AUTOMATION*`,
    `_Rolling Shutter Manufacturing & Automation_`,
    `Danishpet Main Road, Kadayapatti, Salem, Tamil Nadu`,
    `Contact: 96294 95874 / 63835 14898`,
    ``,
    `Dear *${params.customerName}*,`,
    `Thank you for your business! Here are the details of your *${title}*:`,
    ``,
    `📄 *Document:* ${title} #${params.docNumber}`,
    `📅 *Date:* ${params.date}`,
    `💰 *Grand Total:* ${formatINR(params.grandTotal, true)}`,
  ];

  if (params.balanceAmount !== undefined && params.balanceAmount > 0) {
    lines.push(`⏳ *Balance Due:* ${formatINR(params.balanceAmount, true)}`);
  } else if (params.balanceAmount === 0 && params.type === 'invoice') {
    lines.push(`✅ *Status:* Fully Paid`);
  }

  if (params.itemsSummary) {
    lines.push(``, `*Details:* ${params.itemsSummary}`);
  }

  lines.push(
    ``,
    `*Bank Details for UPI / NEFT Payment:*`,
    `Bank: State Bank of India (Kadayapatti)`,
    `A/c Name: Al Ameen Automation`,
    `A/c No: 38492019482 | IFSC: SBIN0004821`,
    `UPI ID: alameenauto@sbi`,
    ``,
    `For any support, please call 96294 95874. Have a great day!`
  );

  const message = lines.join('\n');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
