/**
 * Indian GST Engine for Al Ameen Automation
 * Specialised for Rolling Shutter Manufacturing, Components, Motors and Services.
 */

export interface GSTCalculationResult {
  taxableAmount: number;
  rate: number;
  isInterState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
}

export interface GSTInput {
  amount: number; // Unit price or total price
  quantity?: number;
  rate: number; // e.g. 18 for 18%
  discount?: number;
  isInterState?: boolean;
  isInclusive?: boolean;
}

export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
};

export const COMMON_HSN_CODES = [
  { code: '7308', description: 'Rolling Shutters, leaf profiles, guides & steel structures', gstRate: 18 },
  { code: '8501', description: 'Electric motors for rolling shutters & sliding gates', gstRate: 18 },
  { code: '7326', description: 'Springs, brackets, pulleys & shutter accessories', gstRate: 18 },
  { code: '8479', description: 'Boom barrier & gate automation mechanisms', gstRate: 18 },
  { code: '8526', description: 'Remote controls, receivers & electronic control units', gstRate: 18 },
  { code: '9954', description: 'Installation, erection, fabrication and fitting services', gstRate: 18 },
  { code: '9987', description: 'Maintenance, repair and servicing of rolling shutters', gstRate: 18 },
];

/**
 * Validates 15-character Indian GSTIN format
 * Format: 2 digits (state code) + 5 letters (PAN) + 4 digits + 1 letter + 1 digit/letter + Z + 1 check digit
 */
export function validateGSTIN(gstin?: string): { valid: boolean; stateCode?: string; stateName?: string; error?: string } {
  if (!gstin || gstin.trim() === '') {
    return { valid: true }; // GSTIN is optional for unregistered customers
  }
  const clean = gstin.trim().toUpperCase();
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstRegex.test(clean)) {
    return { valid: false, error: 'Invalid GSTIN format (Expected 15 characters, e.g. 33AAAAA0000A1Z5)' };
  }

  const stateCode = clean.substring(0, 2);
  const stateName = STATE_CODES[stateCode];

  if (!stateName) {
    return { valid: false, error: `Invalid GSTIN state code: ${stateCode}` };
  }

  return { valid: true, stateCode, stateName };
}

/**
 * Calculates GST with decimal precision
 */
export function calculateGST(input: GSTInput): GSTCalculationResult {
  const quantity = input.quantity ?? 1;
  const baseGross = input.amount * quantity;
  const discount = input.discount ?? 0;
  const netGross = Math.max(0, baseGross - discount);
  const rate = input.rate;
  const isInterState = !!input.isInterState;

  let taxableAmount = 0;
  let totalTax = 0;

  if (input.isInclusive) {
    // Gross includes tax: Taxable = Gross / (1 + rate / 100)
    taxableAmount = Number((netGross / (1 + rate / 100)).toFixed(2));
    totalTax = Number((netGross - taxableAmount).toFixed(2));
  } else {
    // Gross is exclusive of tax
    taxableAmount = Number(netGross.toFixed(2));
    totalTax = Number(((taxableAmount * rate) / 100).toFixed(2));
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = rate;
    igstAmount = totalTax;
  } else {
    cgstRate = rate / 2;
    sgstRate = rate / 2;
    cgstAmount = Number((totalTax / 2).toFixed(2));
    sgstAmount = Number((totalTax - cgstAmount).toFixed(2)); // Ensures rounding balance
  }

  const grandTotal = Number((taxableAmount + totalTax).toFixed(2));

  return {
    taxableAmount,
    rate,
    isInterState,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax,
    grandTotal,
  };
}

/**
 * Formats a currency value to Indian Rupee format (e.g. ₹ 1,45,000.00)
 */
export function formatINR(amount: number, showDecimals = false): string {
  if (isNaN(amount)) return '₹ 0';
  const rounded = showDecimals ? amount.toFixed(2) : Math.round(amount).toString();
  const parts = rounded.split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return '₹ ' + (parts.length > 1 ? `${formattedInt}.${parts[1]}` : formattedInt);
}
