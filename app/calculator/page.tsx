'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ruler,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  Calculator,
  Layers,
  Zap,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  MeasurementUnit,
  LEAF_PROFILES,
  GAUGE_OPTIONS,
  MOTOR_OPTIONS,
  convertToFeet,
  calculateShutterPricing,
  ShutterDimensionResult,
} from '@/lib/measurement';
import { formatINR } from '@/lib/gst';

interface ShutterItem {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: MeasurementUnit;
  quantity: number;
  ratePerSqFt: number;
  leafProfile: string;
  gauge: string;
  motorCharges: number;
  springCharges: number;
  gearboxCharges: number;
  installationCharges: number;
  transportCharges: number;
  labourCharges: number;
  otherCharges: number;
  discount: number;
  gstRate: number;
  result: ShutterDimensionResult;
}

export default function ShutterCalculatorPage() {
  const router = useRouter();

  // Current active shutter draft in the calculator
  const [width, setWidth] = useState<number>(10);
  const [height, setHeight] = useState<number>(8);
  const [unit, setUnit] = useState<MeasurementUnit>('Feet');
  const [quantity, setQuantity] = useState<number>(1);
  const [ratePerSqFt, setRatePerSqFt] = useState<number>(250);
  const [leafProfile, setLeafProfile] = useState<string>(LEAF_PROFILES[0].name);
  const [gauge, setGauge] = useState<string>(GAUGE_OPTIONS[1]);
  
  // Add-on options
  const [motorCharges, setMotorCharges] = useState<number>(0);
  const [springCharges, setSpringCharges] = useState<number>(0);
  const [gearboxCharges, setGearboxCharges] = useState<number>(0);
  const [installationCharges, setInstallationCharges] = useState<number>(1500);
  const [transportCharges, setTransportCharges] = useState<number>(1000);
  const [labourCharges, setLabourCharges] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);

  // Multi-shutter batch list
  const [shutterList, setShutterList] = useState<ShutterItem[]>([]);

  // Calculate live preview
  const currentResult = calculateShutterPricing({
    width,
    height,
    unit,
    quantity,
    ratePerSqFt,
    motorCharges,
    springCharges,
    gearboxCharges,
    installationCharges,
    transportCharges,
    labourCharges,
    otherCharges,
    discount,
    gstRate,
  });

  const handleAddShutter = () => {
    const newItem: ShutterItem = {
      id: 'item_' + Date.now(),
      name: `Shutter #${shutterList.length + 1} (${leafProfile})`,
      width,
      height,
      unit,
      quantity,
      ratePerSqFt,
      leafProfile,
      gauge,
      motorCharges,
      springCharges,
      gearboxCharges,
      installationCharges,
      transportCharges,
      labourCharges,
      otherCharges,
      discount,
      gstRate,
      result: currentResult,
    };

    setShutterList([...shutterList, newItem]);
  };

  const handleRemoveShutter = (id: string) => {
    setShutterList(shutterList.filter((item) => item.id !== id));
  };

  const totalBatchArea = shutterList.reduce((acc, it) => acc + it.result.totalAreaSqFt, 0);
  const totalBatchGrand = shutterList.reduce((acc, it) => acc + it.result.totalAmount, 0);

  const handleProceedToInvoice = () => {
    const payload = shutterList.length > 0 ? shutterList : [{ ...currentResult, id: 'item_1', name: 'Shutter #1', quantity, ratePerSqFt, leafProfile, gauge }];
    sessionStorage.setItem('shutter_calculator_batch', JSON.stringify(payload));
    router.push('/sales?from_calculator=true');
  };

  const handleProceedToQuotation = () => {
    const payload = shutterList.length > 0 ? shutterList : [{ ...currentResult, id: 'item_1', name: 'Shutter #1', quantity, ratePerSqFt, leafProfile, gauge }];
    sessionStorage.setItem('shutter_calculator_batch', JSON.stringify(payload));
    router.push('/quotations?from_calculator=true');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <Ruler className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Rolling Shutter Measurement Calculator
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                High-precision multi-unit area & fabrication cost calculation studio
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setWidth(10);
              setHeight(8);
              setUnit('Feet');
              setRatePerSqFt(250);
              setQuantity(1);
              setMotorCharges(0);
              setInstallationCharges(1500);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dimensions & Unit Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#13A89E]"></span>
              1. Shutter Dimensions & Unit
            </h3>

            {/* Unit Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Measurement Unit:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Feet', 'Inches', 'Millimetres', 'Metres'] as MeasurementUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      unit === u
                        ? 'bg-[#13A89E] text-white border-[#13A89E] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Width, Height, Quantity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Width ({unit}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={width || ''}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] text-sm"
                />
                {unit !== 'Feet' && (
                  <span className="text-[11px] text-[#13A89E] font-medium mt-1 block">
                    ≈ {currentResult.widthFeet} ft
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Height ({unit}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={height || ''}
                  onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] text-sm"
                />
                {unit !== 'Feet' && (
                  <span className="text-[11px] text-[#13A89E] font-medium mt-1 block">
                    ≈ {currentResult.heightFeet} ft
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Quantity:
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] text-sm"
                />
              </div>
            </div>

            {/* Material & Rate Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Leaf Profile / Type:
                </label>
                <select
                  value={leafProfile}
                  onChange={(e) => {
                    setLeafProfile(e.target.value);
                    const found = LEAF_PROFILES.find((p) => p.name === e.target.value);
                    if (found) setRatePerSqFt(found.defaultRate);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:border-[#13A89E] focus:outline-none"
                >
                  {LEAF_PROFILES.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} (Base ₹{p.defaultRate}/sqft)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Rate Per Sq.Ft (₹):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={ratePerSqFt || ''}
                    onChange={(e) => setRatePerSqFt(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Add-on Components & Charges */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#172B4D]"></span>
              2. Automation, Add-ons & Service Charges
            </h3>

            {/* Motor Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Automation Motor:
              </label>
              <select
                onChange={(e) => {
                  const m = MOTOR_OPTIONS.find((opt) => opt.name === e.target.value);
                  if (m) setMotorCharges(m.price);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-[#13A89E] focus:outline-none"
              >
                {MOTOR_OPTIONS.map((m, idx) => (
                  <option key={idx} value={m.name}>
                    {m.name} {m.price > 0 ? `(+₹${m.price.toLocaleString('en-IN')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Other Add-ons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Spring Charges (₹):
                </label>
                <input
                  type="number"
                  value={springCharges || ''}
                  onChange={(e) => setSpringCharges(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Gear Box Charges (₹):
                </label>
                <input
                  type="number"
                  value={gearboxCharges || ''}
                  onChange={(e) => setGearboxCharges(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Installation / Fitting (₹):
                </label>
                <input
                  type="number"
                  value={installationCharges || ''}
                  onChange={(e) => setInstallationCharges(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Transportation (₹):
                </label>
                <input
                  type="number"
                  value={transportCharges || ''}
                  onChange={(e) => setTransportCharges(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Special Discount (₹):
                </label>
                <input
                  type="number"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  GST Rate (%):
                </label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value) || 18)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value={18}>18% (Standard HSN 7308)</option>
                  <option value={12}>12%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0% (Exempt)</option>
                </select>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleAddShutter}
                className="w-full py-3 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add This Shutter to Order List
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Column (5 Cols): Live Calculation & Multi-Shutter Cart */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Shutter Breakdown Card */}
          <div className="bg-gradient-to-br from-[#172B4D] to-[#0A1C36] text-white p-6 rounded-3xl shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-teal-200 font-bold">
                  Calculation Summary
                </span>
                <h4 className="text-lg font-bold text-white mt-0.5">{leafProfile}</h4>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-300">Shutter Area</span>
                <div className="text-xl font-black text-amber-300">
                  {currentResult.areaSqFt} <span className="text-xs font-normal">Sq.Ft</span>
                </div>
              </div>
            </div>

            {/* Dimension formula box */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Formula:</span>
                <span className="font-mono text-white">Width(ft) × Height(ft) = Area</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Converted Dimensions:</span>
                <span className="font-mono font-bold text-white">
                  {currentResult.widthFeet} ft × {currentResult.heightFeet} ft
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Fabrication Amount:</span>
                <span className="font-bold text-white">
                  {currentResult.areaSqFt} sqft × ₹{ratePerSqFt} = {formatINR(currentResult.baseAmount)}
                </span>
              </div>
            </div>

            {/* Financial Line Items */}
            <div className="space-y-2 text-xs text-slate-300 pt-1">
              <div className="flex justify-between">
                <span>Shutter Base Amount ({quantity} Qty):</span>
                <span className="font-semibold text-white">{formatINR(currentResult.baseAmount)}</span>
              </div>
              {currentResult.motorCharges > 0 && (
                <div className="flex justify-between">
                  <span>Automation Motor:</span>
                  <span className="font-semibold text-white">{formatINR(currentResult.motorCharges)}</span>
                </div>
              )}
              {currentResult.installationCharges > 0 && (
                <div className="flex justify-between">
                  <span>Installation Charges:</span>
                  <span className="font-semibold text-white">{formatINR(currentResult.installationCharges)}</span>
                </div>
              )}
              {currentResult.transportCharges > 0 && (
                <div className="flex justify-between">
                  <span>Transportation:</span>
                  <span className="font-semibold text-white">{formatINR(currentResult.transportCharges)}</span>
                </div>
              )}
              {currentResult.discount > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>Discount:</span>
                  <span>-{formatINR(currentResult.discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/10">
                <span>Taxable Amount:</span>
                <span className="font-bold text-white">{formatINR(currentResult.taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({currentResult.gstRate}%):</span>
                <span className="font-bold text-white">{formatINR(currentResult.gstAmount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/20 text-sm">
                <span className="font-black text-amber-300">FINAL AMOUNT:</span>
                <span className="text-xl font-black text-amber-300">
                  {formatINR(currentResult.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Shutter Batch List */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#13A89E]" />
                <h3 className="font-bold text-slate-900 text-base">
                  Order Shutters List ({shutterList.length})
                </h3>
              </div>
              {shutterList.length > 0 && (
                <span className="text-xs font-bold text-[#13A89E] bg-teal-50 px-2 py-0.5 rounded-lg">
                  {totalBatchArea.toFixed(2)} Total Sq.Ft
                </span>
              )}
            </div>

            {shutterList.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                No extra shutters added yet. Click &quot;Add This Shutter to Order List&quot; above to include multiple shutters in one quotation/invoice.
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {shutterList.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        {item.width} x {item.height} {item.unit} ({item.result.areaSqFt} sqft) • {formatINR(item.ratePerSqFt)}/sqft
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900">{formatINR(item.result.totalAmount)}</span>
                      <button
                        onClick={() => handleRemoveShutter(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Direct Workflow Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleProceedToQuotation}
                className="py-3 px-3 bg-teal-50 hover:bg-teal-100 text-[#13A89E] border border-teal-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Make Quotation
              </button>

              <button
                type="button"
                onClick={handleProceedToInvoice}
                className="py-3 px-3 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <FileText className="w-4 h-4" />
                Create Tax Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
