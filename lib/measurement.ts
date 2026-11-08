/**
 * Special Rolling Shutter Measurement & Dimension Calculator Engine
 * For Al Ameen Automation / Al Ameen Rolling Shutter Manufacturing
 */

export type MeasurementUnit = 'Feet' | 'Inches' | 'Millimetres' | 'Metres';

export interface ShutterDimensionInput {
  width: number;
  height: number;
  unit: MeasurementUnit;
  quantity?: number;
  ratePerSqFt: number;
  
  // Custom specifications
  leafProfile?: string;
  gauge?: string;
  colorFinish?: string;

  // Add-on charges
  motorCharges?: number;
  springCharges?: number;
  gearboxCharges?: number;
  installationCharges?: number;
  transportCharges?: number;
  labourCharges?: number;
  otherCharges?: number;
  discount?: number;
  gstRate?: number;
}

export interface ShutterDimensionResult {
  widthInput: number;
  heightInput: number;
  unit: MeasurementUnit;
  widthFeet: number;
  heightFeet: number;
  areaSqFt: number;
  totalAreaSqFt: number; // areaSqFt * quantity
  baseAmount: number;    // areaSqFt * ratePerSqFt * quantity
  motorCharges: number;
  springCharges: number;
  gearboxCharges: number;
  installationCharges: number;
  transportCharges: number;
  labourCharges: number;
  otherCharges: number;
  totalAddOns: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export const LEAF_PROFILES = [
  { id: 'plain-leaf', name: 'Plain Leaf', standardGauge: '20 Gauge', defaultRate: 230 },
  { id: 'coated-leaf', name: 'Coated Leaf (Galvanized/CR)', standardGauge: '20 Gauge', defaultRate: 260 },
  { id: 'wooden-alu', name: 'Wooden Type Aluminium Leaf', standardGauge: 'Extruded Aluminium', defaultRate: 450 },
  { id: 'round-profile', name: 'Round Profile (Curved Slat)', standardGauge: '18/20 Gauge', defaultRate: 280 },
  { id: 'box-profile', name: 'Box Profile (Commercial Heavy)', standardGauge: '18 Gauge', defaultRate: 310 },
  { id: 'line-profile', name: 'Line Profile (Architectural Ribbed)', standardGauge: '20 Gauge', defaultRate: 290 },
  { id: 'perforated-leaf', name: 'Perforated See-Through Leaf', standardGauge: '20 Gauge', defaultRate: 320 },
  { id: 'polycarbonate', name: 'Transparent Polycarbonate Slat', standardGauge: '3mm / 4mm', defaultRate: 600 },
];

export const GAUGE_OPTIONS = [
  '18 Gauge (Heavy Industrial 1.2mm)',
  '20 Gauge (Standard Commercial 0.9mm)',
  '22 Gauge (Light Commercial 0.7mm)',
  '24 Gauge (Economical 0.55mm)',
  'Extruded Heavy Aluminium',
];

export const MOTOR_OPTIONS = [
  { name: 'None (Manual Gear / Spring Operation)', price: 0 },
  { name: 'Center Motor (Single Phase 600kg)', price: 14500 },
  { name: 'Side Motor Heavy Duty (Three Phase 800kg)', price: 21500 },
  { name: 'Tubular In-Shaft Motor (Compact 120Nm)', price: 16500 },
  { name: 'Industrial High-Torque Motor (1000kg)', price: 28500 },
  { name: 'Sliding Gate Automation Motor Kit', price: 22000 },
  { name: 'Automatic Boom Barrier Mechanism', price: 38000 },
];

/**
 * Converts any measurement unit to Feet with high floating-point precision.
 * Avoids premature rounding.
 */
export function convertToFeet(value: number, unit: MeasurementUnit): number {
  if (!value || isNaN(value)) return 0;
  switch (unit) {
    case 'Feet':
      return value;
    case 'Inches':
      return value / 12;
    case 'Millimetres':
      return value / 304.8;
    case 'Metres':
      return value * 3.280839895;
    default:
      return value;
  }
}

/**
 * Calculates area in Square Feet from dimensions
 */
export function calculateArea(width: number, height: number, unit: MeasurementUnit): number {
  const wFt = convertToFeet(width, unit);
  const hFt = convertToFeet(height, unit);
  return Number((wFt * hFt).toFixed(3));
}

/**
 * Calculates comprehensive shutter pricing breakdown
 */
export function calculateShutterPricing(input: ShutterDimensionInput): ShutterDimensionResult {
  const qty = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const widthFeet = convertToFeet(input.width, input.unit);
  const heightFeet = convertToFeet(input.height, input.unit);
  
  // Single shutter area in sq ft
  const areaSqFt = Number((widthFeet * heightFeet).toFixed(3));
  const totalAreaSqFt = Number((areaSqFt * qty).toFixed(3));

  // Base shutter fabrication amount (Area * Rate * Qty)
  const baseAmount = Number((totalAreaSqFt * input.ratePerSqFt).toFixed(2));

  // Add-ons
  const motorCharges = Number((input.motorCharges ?? 0).toFixed(2));
  const springCharges = Number((input.springCharges ?? 0).toFixed(2));
  const gearboxCharges = Number((input.gearboxCharges ?? 0).toFixed(2));
  const installationCharges = Number((input.installationCharges ?? 0).toFixed(2));
  const transportCharges = Number((input.transportCharges ?? 0).toFixed(2));
  const labourCharges = Number((input.labourCharges ?? 0).toFixed(2));
  const otherCharges = Number((input.otherCharges ?? 0).toFixed(2));
  const discount = Number((input.discount ?? 0).toFixed(2));

  const totalAddOns = Number(
    (motorCharges + springCharges + gearboxCharges + installationCharges + transportCharges + labourCharges + otherCharges).toFixed(2)
  );

  const taxableAmount = Math.max(0, Number((baseAmount + totalAddOns - discount).toFixed(2)));
  const gstRate = input.gstRate ?? 18;
  const gstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
  const totalAmount = Number((taxableAmount + gstAmount).toFixed(2));

  return {
    widthInput: input.width,
    heightInput: input.height,
    unit: input.unit,
    widthFeet: Number(widthFeet.toFixed(3)),
    heightFeet: Number(heightFeet.toFixed(3)),
    areaSqFt,
    totalAreaSqFt,
    baseAmount,
    motorCharges,
    springCharges,
    gearboxCharges,
    installationCharges,
    transportCharges,
    labourCharges,
    otherCharges,
    totalAddOns,
    discount,
    taxableAmount,
    gstRate,
    gstAmount,
    totalAmount,
  };
}
