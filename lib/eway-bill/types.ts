export type SupplyType = 'O' | 'I'; // Outward | Inward

export type SubSupplyType =
  | '1' // Supply
  | '2' // Import
  | '3' // Export
  | '4' // Job Work
  | '5' // For Own Use
  | '6' // Job work Returns
  | '7' // Sales Return
  | '8' // Others
  | '9' // SKD/CKD/Lots
  | '10' // Line Sales
  | '11' // Recipient Not Known
  | '12'; // Exhibition or Notice

export type DocumentType = 'INV' | 'BIL' | 'BOE' | 'CHL' | 'OTH';
export type TransactionType = 'regular' | 'bill_to_ship_to' | 'bill_from_dispatch_from' | 'combination';
export type TransportMode = '1' | '2' | '3' | '4'; // 1 = Road, 2 = Rail, 3 = Air, 4 = Ship
export type VehicleType = 'R' | 'O'; // Regular | Over Dimensional Cargo
export type EWayBillStatus = 'active' | 'cancelled' | 'expired';
export type GenerationMethod = 'manual' | 'api';

export interface EWayBillItem {
  id?: string;
  eway_bill_id?: string;
  product_name: string;
  product_desc?: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  taxable_amount: number;
  gst_rate: number;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  cess_rate?: number;
  cess_amount?: number;
  total_amount: number;
}

export interface EWayBill {
  id: string;
  business_id: string;
  invoice_id?: string | null;
  invoice_number?: string;
  customer_name?: string;
  customer_phone?: string;
  eway_bill_number?: string | null;
  eway_bill_date: string;
  valid_until: string;
  status: EWayBillStatus;
  generation_method: GenerationMethod;
  supply_type: SupplyType;
  sub_supply_type: SubSupplyType;
  doc_type: DocumentType;
  doc_number: string;
  doc_date: string;
  transaction_type: TransactionType;
  from_name: string;
  from_gstin: string;
  from_address: string;
  from_place: string;
  from_pincode: string;
  from_state_code: string;
  to_name: string;
  to_gstin?: string | null;
  to_address: string;
  to_place: string;
  to_pincode: string;
  to_state_code: string;
  dispatch_from_address?: string | null;
  dispatch_from_place?: string | null;
  dispatch_from_pincode?: string | null;
  dispatch_from_state_code?: string | null;
  ship_to_address?: string | null;
  ship_to_place?: string | null;
  ship_to_pincode?: string | null;
  ship_to_state_code?: string | null;
  transport_mode: TransportMode;
  distance_km: number;
  transporter_name?: string | null;
  transporter_id?: string | null;
  transporter_doc_no?: string | null;
  transporter_doc_date?: string | null;
  vehicle_number?: string | null;
  vehicle_type: VehicleType;
  total_taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  other_charges: number;
  total_invoice_value: number;
  cancel_reason_code?: string | null;
  cancel_remarks?: string | null;
  cancelled_at?: string | null;
  qr_code_data?: string | null;
  nic_payload?: any;
  items?: EWayBillItem[];
  logs?: any[];
  created_at: string;
  updated_at: string;
}

export interface EWayBillSettings {
  id: string;
  business_id: string;
  environment: 'sandbox' | 'production';
  gsp_provider: 'manual' | 'nic_direct' | 'cleartax' | 'mastersindia' | 'sandbox';
  api_username?: string;
  api_password?: string;
  client_id?: string;
  client_secret?: string;
  gstin?: string;
  auth_token?: string | null;
  token_expiry?: string | null;
  default_transporter_id?: string;
  default_transporter_name?: string;
  default_vehicle_number?: string;
  default_from_address?: string;
  default_from_place?: string;
  default_from_pincode?: string;
  default_from_state_code?: string;
  auto_calculate_distance: boolean | number;
}

export interface NICItemPayload {
  itemNo: number;
  productName: string;
  productDesc: string;
  hsnCode: number;
  quantity: number;
  qtyUnit: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  cessNonAdvol?: number;
  taxableAmount: number;
}

export interface NICEWayBillPayload {
  supplyType: string;
  subSupplyType: string;
  subSupplyDesc?: string;
  docType: string;
  docNo: string;
  docDate: string; // DD/MM/YYYY
  fromGstin: string;
  fromTrdName: string;
  fromAddr1: string;
  fromAddr2?: string;
  fromPlace: string;
  fromPincode: number;
  actFromStateCode: number;
  fromStateCode: number;
  toGstin: string;
  toTrdName: string;
  toAddr1: string;
  toAddr2?: string;
  toPlace: string;
  toPincode: number;
  actToStateCode: number;
  toStateCode: number;
  transactionType: number; // 1=Regular, 2=Bill To-Ship To, 3=Bill From-Dispatch From, 4=Combination
  otherValue?: number;
  totalValue: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  cessValue: number;
  totInvValue: number;
  transMode: string;
  transDistance: string;
  transporterName?: string;
  transporterId?: string;
  transDocNo?: string;
  transDocDate?: string;
  vehicleNo?: string;
  vehicleType?: string;
  itemList: NICItemPayload[];
}
