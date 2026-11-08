import { NICEWayBillPayload, NICItemPayload, EWayBill } from './types';

// Official GST State Code Directory
export const GST_STATE_CODES: Record<string, string> = {
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
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

export const CANCELLATION_REASONS: Record<string, string> = {
  '1': 'Duplicate E-Way Bill',
  '2': 'Order Cancelled',
  '3': 'Data Entry Error',
  '4': 'Others',
};

export const VEHICLE_UPDATE_REASONS: Record<string, string> = {
  '1': 'Due to Breakdown',
  '2': 'Due to Transshipment',
  '3': 'Others (Driver/Route change)',
  '4': 'First Time (Part-A was generated earlier)',
};

/**
 * Validates standard Indian GSTIN (15 chars) or URP (Unregistered Person)
 */
export function validateGSTIN(gstin?: string): { valid: boolean; error?: string } {
  if (!gstin) return { valid: true };
  const trimmed = gstin.trim().toUpperCase();
  if (trimmed === 'URP') return { valid: true };
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid GSTIN format (15 characters: e.g. 33CRHPD7107H1Z3)' };
  }
  return { valid: true };
}

/**
 * Validates 6-digit Indian PIN code
 */
export function validatePincode(pincode?: string | number): { valid: boolean; error?: string } {
  if (!pincode) return { valid: false, error: 'PIN code is required' };
  const pinStr = String(pincode).trim();
  const pinRegex = /^[1-9][0-9]{5}$/;
  if (!pinRegex.test(pinStr)) {
    return { valid: false, error: 'PIN code must be exactly 6 digits (e.g. 636001)' };
  }
  return { valid: true };
}

/**
 * Normalizes and validates Indian Vehicle Registration Number (e.g. TN28AB1234)
 */
export function normalizeVehicleNumber(vehicleNo?: string): string {
  if (!vehicleNo) return '';
  return vehicleNo.toUpperCase().replace(/[\s\-_]/g, '');
}

export function validateVehicleNumber(vehicleNo?: string): { valid: boolean; normalized: string; error?: string } {
  const norm = normalizeVehicleNumber(vehicleNo);
  if (!norm) return { valid: true, normalized: '' };
  // Standard format: State code (2) + District code (1-2) + Optional Series (0-3) + 4-digit number
  const vehRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
  if (!vehRegex.test(norm)) {
    return {
      valid: false,
      normalized: norm,
      error: 'Invalid vehicle number format. Expected format like TN28AB1234 or TN30A1234',
    };
  }
  return { valid: true, normalized: norm };
}

/**
 * Validates 12-digit official E-Way Bill Number (EBN)
 */
export function validateEWayBillNumber(ewbNo?: string): { valid: boolean; error?: string } {
  if (!ewbNo) return { valid: false, error: 'E-Way Bill Number is required' };
  const clean = ewbNo.trim().replace(/\s/g, '');
  if (!/^\d{12}$/.test(clean)) {
    return { valid: false, error: 'Official E-Way Bill Number must be exactly 12 digits' };
  }
  return { valid: true };
}

/**
 * Format date to standard NIC DD/MM/YYYY
 */
export function formatToNICDate(dateStr?: string): string {
  if (!dateStr) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  }
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Estimates distance in KM between consignor and consignee based on state and pincodes
 */
export function estimateDistanceKm(
  fromState: string,
  toState: string,
  fromPin: string,
  toPin: string
): number {
  if (fromPin && toPin && fromPin === toPin) return 15;
  // If same state
  if (fromState === toState || fromPin.substring(0, 2) === toPin.substring(0, 2)) {
    // Check specific Tamil Nadu hubs (Salem 636xxx)
    if (fromPin.startsWith('636')) {
      if (toPin.startsWith('641')) return 165; // Coimbatore
      if (toPin.startsWith('625')) return 230; // Madurai
      if (toPin.startsWith('600')) return 340; // Chennai
      if (toPin.startsWith('620')) return 140; // Trichy
      if (toPin.startsWith('638')) return 55; // Erode
    }
    return 65; // Average intra-state regional trip
  }
  // Interstate defaults
  if (toState === '29' || toPin.startsWith('560')) return 205; // Salem to Bangalore
  if (toState === '32') return 240; // Kerala
  if (toState === '37') return 380; // Andhra Pradesh
  return 250;
}

/**
 * Formats 12-digit EBN with visual readability grouping: e.g. 1210 0012 3456
 */
export function formatEBN(ebn?: string | null): string {
  if (!ebn) return '—';
  const clean = ebn.replace(/\s/g, '');
  if (clean.length === 12) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)}`;
  }
  return ebn;
}

/**
 * Converts internal E-Way Bill object into official NIC JSON payload format
 */
export function buildNICPayload(ewb: any): NICEWayBillPayload {
  const transactionTypeMap: Record<string, number> = {
    regular: 1,
    bill_to_ship_to: 2,
    bill_from_dispatch_from: 3,
    combination: 4,
  };

  const itemList: NICItemPayload[] = (ewb.items || []).map((item: any, idx: number) => {
    const gstRate = Number(item.gst_rate || item.gstRate || 18);
    const isInterstate = Number(ewb.from_state_code) !== Number(ewb.to_state_code);
    const taxable = Number(item.taxable_amount || item.taxableAmount || 0);

    return {
      itemNo: idx + 1,
      productName: item.product_name || item.description || 'Rolling Shutter Component',
      productDesc: item.product_desc || item.description || '',
      hsnCode: parseInt(String(item.hsn_code || '7308').replace(/\D/g, ''), 10) || 7308,
      quantity: Number(item.quantity || 1),
      qtyUnit: (item.unit || item.qtyUnit || 'NOS').toUpperCase().substring(0, 5),
      cgstRate: isInterstate ? 0 : gstRate / 2,
      sgstRate: isInterstate ? 0 : gstRate / 2,
      igstRate: isInterstate ? gstRate : 0,
      cessRate: Number(item.cess_rate || 0),
      taxableAmount: Math.round(taxable * 100) / 100,
    };
  });

  return {
    supplyType: ewb.supply_type || 'O',
    subSupplyType: ewb.sub_supply_type || '1',
    subSupplyDesc: ewb.sub_supply_type === '1' ? 'Supply' : 'Others',
    docType: ewb.doc_type || 'INV',
    docNo: String(ewb.doc_number || ewb.invoice_number || '').trim(),
    docDate: formatToNICDate(ewb.doc_date),
    fromGstin: (ewb.from_gstin || '33CRHPD7107H1Z3').toUpperCase(),
    fromTrdName: ewb.from_name || 'AL AMEEN WELDING WORKS',
    fromAddr1: ewb.from_address || '13-A, Omalur Main Road',
    fromPlace: ewb.from_place || 'Salem',
    fromPincode: parseInt(String(ewb.from_pincode || '636001').replace(/\D/g, ''), 10) || 636001,
    actFromStateCode: parseInt(String(ewb.from_state_code || '33'), 10),
    fromStateCode: parseInt(String(ewb.from_state_code || '33'), 10),
    toGstin: (ewb.to_gstin || 'URP').toUpperCase(),
    toTrdName: ewb.to_name || 'Customer',
    toAddr1: ewb.to_address || 'Delivery Address',
    toPlace: ewb.to_place || 'Salem',
    toPincode: parseInt(String(ewb.to_pincode || '636001').replace(/\D/g, ''), 10) || 636001,
    actToStateCode: parseInt(String(ewb.to_state_code || '33'), 10),
    toStateCode: parseInt(String(ewb.to_state_code || '33'), 10),
    transactionType: transactionTypeMap[ewb.transaction_type] || 1,
    otherValue: Number(ewb.other_charges || 0),
    totalValue: Math.round(Number(ewb.total_taxable_amount || 0) * 100) / 100,
    cgstValue: Math.round(Number(ewb.cgst_amount || 0) * 100) / 100,
    sgstValue: Math.round(Number(ewb.sgst_amount || 0) * 100) / 100,
    igstValue: Math.round(Number(ewb.igst_amount || 0) * 100) / 100,
    cessValue: Math.round(Number(ewb.cess_amount || 0) * 100) / 100,
    totInvValue: Math.round(Number(ewb.total_invoice_value || 0) * 100) / 100,
    transMode: String(ewb.transport_mode || '1'),
    transDistance: String(ewb.distance_km || 20),
    transporterName: ewb.transporter_name || undefined,
    transporterId: ewb.transporter_id || undefined,
    transDocNo: ewb.transporter_doc_no || undefined,
    transDocDate: ewb.transporter_doc_date ? formatToNICDate(ewb.transporter_doc_date) : undefined,
    vehicleNo: ewb.vehicle_number ? normalizeVehicleNumber(ewb.vehicle_number) : undefined,
    vehicleType: ewb.vehicle_type || 'R',
    itemList,
  };
}
