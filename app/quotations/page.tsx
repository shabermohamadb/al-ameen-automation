'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Trash2,
  X,
  Ruler,
  Layers,
  Package,
  Wrench,
} from 'lucide-react';
import { formatINR, calculateGST } from '@/lib/gst';
import { generateDocumentPDF } from '@/lib/pdf/invoice-pdf';
import { generateWhatsAppLink } from '@/lib/whatsapp';
import { convertToFeet } from '@/lib/measurement';

interface AdditionalProductItem {
  product_id: string;
  item_type?: 'product' | 'service';
  description: string;
  sku: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  rate: number;
  original_rate?: number;
  discount: number;
  gst_rate: number;
  current_stock: number;
  is_party_price?: boolean;
  tax_type?: 'with_tax' | 'without_tax';
}

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [partyPrices, setPartyPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Quotation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [validityDate, setValidityDate] = useState('2026-12-07');
  const [items, setItems] = useState<any[]>([
    {
      description: 'Heavy Duty Box Profile Shutter (14ft x 12ft)',
      width: 14,
      height: 12,
      measurementUnit: 'Feet',
      quantity: 1,
      ratePerSqFt: 310,
      motorCharges: 14500,
      installationCharges: 3500,
      discount: 0,
      gstRate: 18,
    },
  ]);
  const [additionalProducts, setAdditionalProducts] = useState<AdditionalProductItem[]>([]);
  const [transportCharges, setTransportCharges] = useState(2000);
  const [terms, setTerms] = useState(
    '1. 50% advance along with confirmed order.\n2. Balance on delivery.\n3. Validity: 30 days.'
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qRes, cRes, pRes] = await Promise.all([
        fetch('/api/quotations'),
        fetch('/api/customers'),
        fetch('/api/products'),
      ]);
      const [qData, cData, pData] = await Promise.all([qRes.json(), cRes.json(), pRes.json()]);

      if (qData.success) setQuotations(qData.data);
      if (cData.success) {
        setCustomers(cData.data);
        if (cData.data.length > 0) setCustomerId(cData.data[0].id);
      }
      if (pData.success) setProducts(pData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetch(`/api/party-prices?customerId=${customerId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.prices) {
            setPartyPrices(data.prices);
          } else {
            setPartyPrices({});
          }
        })
        .catch(() => setPartyPrices({}));
    } else {
      setPartyPrices({});
    }
  }, [customerId]);

  useEffect(() => {
    // Check if coming from calculator
    const batchStr = sessionStorage.getItem('shutter_calculator_batch');
    if (batchStr) {
      try {
        const batch = JSON.parse(batchStr);
        if (Array.isArray(batch) && batch.length > 0) {
          const mappedItems = batch.map((it: any) => ({
            description: it.name || it.leafProfile || 'Custom Rolling Shutter',
            width: it.widthInput || it.width || 10,
            height: it.heightInput || it.height || 8,
            measurementUnit: it.unit || 'Feet',
            quantity: it.quantity || 1,
            ratePerSqFt: it.ratePerSqFt || 250,
            motorCharges: it.motorCharges || 0,
            installationCharges: it.installationCharges || 1500,
            discount: it.discount || 0,
            gstRate: it.gstRate || 18,
          }));
          setItems(mappedItems);
          setShowCreateModal(true);
        }
        sessionStorage.removeItem('shutter_calculator_batch');
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Compute live totals for shutters
  const calculatedShutters = items.map((it) => {
    const wFt = convertToFeet(it.width || 0, it.measurementUnit || 'Feet');
    const hFt = convertToFeet(it.height || 0, it.measurementUnit || 'Feet');
    const areaSqFt = Number((wFt * hFt).toFixed(3));
    const qty = it.quantity || 1;
    const baseFabrication = Number((areaSqFt * (it.ratePerSqFt || 0) * qty).toFixed(2));
    const addOns = Number(((it.motorCharges || 0) + (it.installationCharges || 0)).toFixed(2));
    const discount = Number(it.discount || 0);
    const taxable = Math.max(0, baseFabrication + addOns - discount);
    const gstRate = it.gstRate || 18;
    const gstRes = calculateGST({ amount: taxable, rate: gstRate, isInterState: false });

    return {
      ...it,
      item_type: 'shutter',
      hsn_code: it.hsnCode || '7308',
      width_ft: wFt,
      height_ft: hFt,
      area_sqft: areaSqFt,
      unit_price: baseFabrication,
      taxable_amount: gstRes.taxableAmount,
      cgst: gstRes.cgstAmount,
      sgst: gstRes.sgstAmount,
      total_amount: gstRes.grandTotal,
    };
  });

  // Compute live totals for products & services
  const calculatedProducts = additionalProducts.map((prod) => {
    const qty = Number(prod.quantity) || 1;
    const rate = Number(prod.rate) || 0;
    const discount = Number(prod.discount) || 0;
    const baseAmount = Number((qty * rate).toFixed(2));
    const taxable = Math.max(0, baseAmount - discount);
    const gstRate = Number(prod.gst_rate) || 18;
    const gstRes = calculateGST({ amount: taxable, rate: gstRate, isInterState: false });

    return {
      item_type: prod.item_type || 'product',
      product_id: prod.product_id || null,
      description: prod.description,
      sku: prod.sku,
      hsn_code: prod.hsn_code || (prod.item_type === 'service' ? '998719' : '8501'),
      width: 0,
      height: 0,
      measurement_unit: prod.unit || (prod.item_type === 'service' ? 'Job' : 'Nos'),
      width_ft: 0,
      height_ft: 0,
      area_sqft: 0,
      rate_per_sqft: rate,
      quantity: qty,
      unit_price: rate,
      material_charges: 0,
      motor_charges: 0,
      spring_charges: 0,
      gearbox_charges: 0,
      installation_charges: 0,
      discount,
      taxable_amount: gstRes.taxableAmount,
      gst_rate: gstRate,
      cgst: gstRes.cgstAmount,
      sgst: gstRes.sgstAmount,
      total_amount: gstRes.grandTotal,
    };
  });

  // Unified Subtotals & Grand Totals
  const shutterFabricationSubtotal = calculatedShutters.reduce((acc, it) => acc + (it.unit_price || 0), 0);
  const shutterAddOnsSubtotal = calculatedShutters.reduce((acc, it) => acc + (it.motorCharges || 0) + (it.installationCharges || 0), 0);
  const productsSubtotal = calculatedProducts.reduce((acc, p) => acc + (p.quantity * p.unit_price), 0);
  const totalDiscount = calculatedShutters.reduce((acc, it) => acc + (it.discount || 0), 0) + calculatedProducts.reduce((acc, p) => acc + (p.discount || 0), 0);

  const subtotal = Number((calculatedShutters.reduce((acc, it) => acc + it.taxable_amount, 0) + calculatedProducts.reduce((acc, p) => acc + p.taxable_amount, 0)).toFixed(2));
  const totalCGST = Number((calculatedShutters.reduce((acc, it) => acc + (it.cgst || 0), 0) + calculatedProducts.reduce((acc, p) => acc + (p.cgst || 0), 0)).toFixed(2));
  const totalSGST = Number((calculatedShutters.reduce((acc, it) => acc + (it.sgst || 0), 0) + calculatedProducts.reduce((acc, p) => acc + (p.sgst || 0), 0)).toFixed(2));
  const totalTax = Number((totalCGST + totalSGST).toFixed(2));
  const grandTotal = Number((subtotal + totalTax + transportCharges).toFixed(2));

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: 'Commercial Rolling Shutter Leaf',
        width: 10,
        height: 8,
        measurementUnit: 'Feet',
        quantity: 1,
        ratePerSqFt: 250,
        motorCharges: 0,
        installationCharges: 1000,
        discount: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleAddProduct = () => {
    const first = products.length > 0 ? products[0] : null;
    const isService = first?.item_type === 'service';
    const hasPartyPrice = first ? partyPrices[first.id] !== undefined : false;
    const effectiveSellingPrice = first ? (hasPartyPrice ? partyPrices[first.id] : (first.selling_price || 0)) : 0;
    const gstRate = first?.gst_rate || 18;
    const baseRate = first?.tax_type === 'with_tax'
      ? Number((effectiveSellingPrice / (1 + gstRate / 100)).toFixed(2))
      : effectiveSellingPrice;

    setAdditionalProducts([
      ...additionalProducts,
      {
        product_id: first ? first.id : '',
        item_type: isService ? 'service' : 'product',
        description: first ? first.name : 'Select Product / Service',
        sku: first?.sku || '',
        hsn_code: isService ? (first?.sac_code || first?.hsn_code || '998719') : (first?.hsn_code || '8501'),
        quantity: 1,
        unit: first?.unit || (isService ? 'Job' : 'Piece'),
        rate: baseRate,
        original_rate: effectiveSellingPrice,
        is_party_price: hasPartyPrice,
        tax_type: first?.tax_type || 'without_tax',
        discount: 0,
        gst_rate: gstRate,
        current_stock: isService ? 0 : (first?.current_stock ?? 0),
      },
    ]);
  };

  const handleProductSelect = (pIdx: number, selectedProductId: string) => {
    const found = products.find((p) => p.id === selectedProductId);
    if (!found) return;

    const isService = found.item_type === 'service';
    const hasPartyPrice = partyPrices[found.id] !== undefined;
    const effectiveSellingPrice = hasPartyPrice ? partyPrices[found.id] : (found.selling_price || 0);
    const gstRate = found.gst_rate || 18;
    const baseRate = found.tax_type === 'with_tax'
      ? Number((effectiveSellingPrice / (1 + gstRate / 100)).toFixed(2))
      : effectiveSellingPrice;

    const updated = [...additionalProducts];
    updated[pIdx] = {
      ...updated[pIdx],
      product_id: found.id,
      item_type: isService ? 'service' : 'product',
      description: found.name,
      sku: found.sku || '',
      hsn_code: isService ? (found.sac_code || found.hsn_code || '998719') : (found.hsn_code || '8501'),
      unit: found.unit || (isService ? 'Job' : 'Piece'),
      rate: baseRate,
      original_rate: effectiveSellingPrice,
      is_party_price: hasPartyPrice,
      tax_type: found.tax_type || 'without_tax',
      gst_rate: gstRate,
      current_stock: isService ? 0 : (found.current_stock ?? 0),
    };
    setAdditionalProducts(updated);
  };

  const handleRemoveProduct = (pIdx: number) => {
    setAdditionalProducts(additionalProducts.filter((_, i) => i !== pIdx));
  };

  const handleOpenCreateModal = async () => {
    try {
      const res = await fetch('/api/quotations/next-number?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.nextNumber) {
        setQuotationNumber(data.nextNumber);
      }
    } catch (e) {
      console.error('Error fetching next quotation number:', e);
    }
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setValidityDate(d.toISOString().split('T')[0]);
    setShowCreateModal(true);
  };

  const handleDeleteQuotation = async (qt: any) => {
    if (!confirm(`Are you sure you want to delete Quotation #${qt.quotation_number}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/quotations/${qt.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert('Failed to delete quotation: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleSaveQuotation = async () => {
    if (!customerId) {
      alert('Please select a customer');
      return;
    }

    if (calculatedShutters.length === 0 && calculatedProducts.length === 0) {
      alert('Please add at least one rolling shutter or inventory product.');
      return;
    }

    const allItems = [...calculatedShutters, ...calculatedProducts];

    const payload = {
      quotation_number: quotationNumber ? quotationNumber.trim() : undefined,
      customer_id: customerId,
      site_address: siteAddress,
      validity_date: validityDate,
      subtotal,
      discount: totalDiscount,
      taxable_amount: subtotal,
      cgst: totalCGST,
      sgst: totalSGST,
      igst: 0,
      total_tax: totalTax,
      installation_charges: calculatedShutters.reduce((acc, it) => acc + (it.installationCharges || 0), 0),
      transport_charges: transportCharges,
      grand_total: grandTotal,
      status: 'sent',
      terms,
      items: allItems,
    };

    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setAdditionalProducts([]);
        fetchData();
      } else {
        alert('Failed to save quotation: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleConvertToInvoice = async (qt: any) => {
    if (!confirm(`Are you sure you want to convert Quotation #${qt.quotation_number} into a confirmed Sales Invoice?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/quotations/${qt.id}/convert`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Quotation successfully converted to Invoice #${data.data.invoice_number}!`);
        router.push('/sales');
      } else {
        alert('Conversion failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleDownloadPDF = async (qt: any) => {
    const fullRes = await fetch(`/api/quotations/${qt.id}`);
    const fullData = await fullRes.json();
    const quotation = fullData.data || qt;

    const doc = generateDocumentPDF({
      type: 'quotation',
      docNumber: quotation.quotation_number,
      date: quotation.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      dueDate: quotation.validity_date,
      business: {
        name: 'AL AMEEN WELDING WORKS & ROLLING SHUTTER MANUFACTURING',
        legalName: 'AL AMEEN WELDING WORKS & ROLLING SHUTTER MANUFACTURING',
        address: 'Office: Danishpet main road, santhaipettai, kadaiyampatti(PO &TK),salem(DT),Tamil Nadu, INDIA -636351, Salem, Tamil Nadu, 636351',
        phone1: '9629495874',
        email: 'alameenweldingwork@gmail.com',
        gstin: '33CRHPD7107H1Z3',
        pan: 'CRHPD7107H',
      },
      customer: {
        name: quotation.customer_name,
        phone: quotation.customer_phone,
        address: quotation.customer_address || 'Salem, Tamil Nadu',
        gstin: quotation.customer_gstin,
        pan: quotation.customer_pan || (quotation.customer_gstin && quotation.customer_gstin.length >= 12 ? quotation.customer_gstin.substring(2, 12) : 'BSOPV6815R'),
        state: quotation.customer_state || 'Tamil Nadu',
      },
      shipTo: {
        name: quotation.customer_name,
        address: quotation.site_address || quotation.customer_address || 'Salem, Tamil Nadu',
      },
      siteAddress: quotation.site_address,
      items: (quotation.items || []).map((it: any) => ({
        description: it.description,
        hsnCode: it.hsn_code || (it.item_type === 'service' ? '998719' : (it.item_type === 'product' ? '8501' : '7308')),
        item_type: it.item_type || (it.product_id ? 'product' : 'shutter'),
        width: it.width,
        height: it.height,
        measurementUnit: it.measurement_unit,
        areaSqFt: it.area_sqft,
        quantity: it.quantity,
        unit: it.item_type === 'service' ? (it.measurement_unit || 'Job') : (it.item_type === 'product' ? (it.measurement_unit || 'Nos') : (it.measurement_unit === 'KGS' ? 'KGS' : it.measurement_unit || 'Nos')),
        ratePerSqFt: it.rate_per_sqft,
        unitPrice: it.unit_price,
        taxableAmount: it.taxable_amount,
        gstRate: it.gst_rate || 18,
        cgstAmount: it.cgst_amount || (it.taxable_amount * ((it.gst_rate || 18) / 2)) / 100,
        sgstAmount: it.sgst_amount || (it.taxable_amount * ((it.gst_rate || 18) / 2)) / 100,
        igstAmount: it.igst_amount || 0,
        totalAmount: it.total_amount,
      })),
      subtotal: quotation.subtotal,
      taxableAmount: quotation.taxable_amount,
      cgst: quotation.cgst,
      sgst: quotation.sgst,
      igst: quotation.igst,
      totalTax: quotation.total_tax,
      installationCharges: quotation.installation_charges,
      transportCharges: quotation.transport_charges,
      grandTotal: quotation.grand_total,
      paidAmount: 0,
      previousBalance: 0,
      balanceAmount: quotation.grand_total,
      bankDetails: {
        accountName: 'AL AMEEN WELDING WORKS',
        ifsc: 'SBIN0018379',
        accountNumber: '41904105649',
        bankName: 'State Bank of India ,THEEVATTIPATTI',
        upiId: 'thasthagiralameen-1@okicici',
      },
      terms: '1. Goods once sold will not be taken back or exchanged',
    });

    doc.save(`Quotation_${quotation.quotation_number}.pdf`);
  };

  const handleWhatsAppShare = (qt: any) => {
    const link = generateWhatsAppLink({
      phone: qt.customer_phone,
      customerName: qt.customer_name,
      type: 'quotation',
      docNumber: qt.quotation_number,
      grandTotal: qt.grand_total,
      date: qt.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    window.open(link, '_blank');
  };

  const filteredQuotations = quotations.filter((qt) => {
    const matchesStatus = filterStatus === 'all' || qt.status === filterStatus;
    const matchesSearch =
      qt.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qt.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Quotation & Estimates
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Generate custom rolling shutter estimates with 1-click invoice conversion
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Build New Quotation
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Quotations' },
            { id: 'sent', label: 'Sent' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'converted', label: 'Converted to Bill' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                filterStatus === tab.id
                  ? 'bg-[#13A89E] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotation number, customer..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Quotation #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Site Location</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading quotations...
                  </td>
                </tr>
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((qt) => {
                  let badge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-[#13A89E]">
                      <Clock className="w-3 h-3" /> Sent
                    </span>
                  );
                  if (qt.status === 'accepted') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Accepted
                      </span>
                    );
                  } else if (qt.status === 'converted') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700">
                        ✓ Invoiced
                      </span>
                    );
                  }

                  return (
                    <tr key={qt.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {qt.quotation_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{qt.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{qt.customer_phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">
                        {qt.site_address || 'Salem'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        {formatINR(qt.taxable_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatINR(qt.grand_total)}
                      </td>
                      <td className="py-3.5 px-4 text-center">{badge}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {qt.status !== 'converted' && (
                            <button
                              onClick={() => handleConvertToInvoice(qt)}
                              title="Convert to Sales Invoice"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                            >
                              Bill <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPDF(qt)}
                            title="Download PDF"
                            className="p-1.5 text-slate-600 hover:text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleWhatsAppShare(qt)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuotation(qt)}
                            title="Delete Quotation"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#13A89E]" />
                <h3 className="font-bold text-slate-900 text-base">New Rolling Shutter Quotation</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Document Sequence & Validity Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-[#E2E8F0]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#172B4D]">
                      Quotation Number:
                    </label>
                    <span className="text-[10px] font-extrabold text-[#13A89E] bg-white px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs">
                      Auto Sequence
                    </span>
                  </div>
                  <input
                    type="text"
                    value={quotationNumber}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    placeholder="e.g. 001"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-mono font-extrabold text-[#172B4D] focus:border-[#13A89E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Validity Date:
                  </label>
                  <input
                    type="date"
                    value={validityDate}
                    onChange={(e) => setValidityDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:border-[#13A89E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Customer & Site Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Select Customer:</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Site Address:</label>
                  <input
                    type="text"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    placeholder="e.g. NH44 Warehouse Plot 2"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                    <Ruler className="w-4 h-4 text-[#13A89E]" />
                    Quotation Shutters & Specifications
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="font-bold text-[#13A89E] hover:text-[#0E8A81] bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition border border-teal-200"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Shutter
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                    No rolling shutters added. (Click &quot;+ Add Shutter&quot; if quoting manufactured rolling shutters)
                  </div>
                ) : (
                  items.map((it, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#172B4D]">Shutter #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-500"
                          title="Remove Shutter"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Description:</label>
                          <input
                            type="text"
                            value={it.description}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].description = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Width (ft):</label>
                          <input
                            type="number"
                            value={it.width}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].width = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Height (ft):</label>
                          <input
                            type="number"
                            value={it.height}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].height = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Rate/Sq.Ft (₹):</label>
                          <input
                            type="number"
                            value={it.ratePerSqFt}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].ratePerSqFt = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Motor Charges (₹):</label>
                          <input
                            type="number"
                            value={it.motorCharges}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].motorCharges = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fitting Charges (₹):</label>
                          <input
                            type="number"
                            value={it.installationCharges}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].installationCharges = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Discount (₹):</label>
                          <input
                            type="number"
                            value={it.discount || 0}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].discount = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ADDITIONAL PRODUCTS & SERVICES */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                      <Package className="w-4 h-4 text-[#13A89E]" />
                      ADDITIONAL PRODUCTS & SERVICES
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Add inventory products (Motors, Remotes, Springs) or billable services (Installation, AMC, Alignment).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="font-bold text-[#13A89E] hover:text-[#0E8A81] bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition border border-teal-200 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item (Product / Service)
                  </button>
                </div>

                {additionalProducts.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                    No additional items added yet. Click &quot;Add Item (Product / Service)&quot; to include motors, remotes, accessories, or services.
                  </div>
                ) : (
                  additionalProducts.map((prod, pIdx) => {
                    const lineTaxable = Math.max(0, (prod.quantity * prod.rate) - (prod.discount || 0));
                    const lineTax = (lineTaxable * (prod.gst_rate || 18)) / 100;
                    const lineTotal = lineTaxable + lineTax;
                    const isService = prod.item_type === 'service';

                    return (
                      <div key={pIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#172B4D]">Item #{pIdx + 1}</span>
                            {isService ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-sky-100 text-sky-800 flex items-center gap-1">
                                <Wrench className="w-3 h-3" /> Service
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-teal-50 text-[#13A89E] flex items-center gap-1">
                                <Package className="w-3 h-3" /> Product
                              </span>
                            )}
                            {prod.sku && (
                              <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono text-[10px]">
                                SKU: {prod.sku}
                              </span>
                            )}
                            {isService ? (
                              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono text-[10px]">
                                SAC: {prod.hsn_code || '998719'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono text-[10px]">
                                HSN: {prod.hsn_code || '8501'}
                              </span>
                            )}
                            {isService ? (
                              <span className="px-2 py-0.5 rounded font-medium text-[10px] bg-slate-200/70 text-slate-600">
                                No Stock Deduction
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  prod.current_stock > 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                Stock: {prod.current_stock}
                              </span>
                            )}
                            {prod.is_party_price && (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-[#172B4D] flex items-center gap-1 shadow-xs border border-slate-200">
                                🎯 Party Special Price Applied
                              </span>
                            )}
                            {prod.tax_type === 'with_tax' && (
                              <span className="text-[10px] text-teal-700 font-medium">
                                (Catalog: ₹{prod.original_rate} incl. {prod.gst_rate}% tax)
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(pIdx)}
                            className="text-slate-400 hover:text-rose-500"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-6">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Select Item from Database:</label>
                            <select
                              value={prod.product_id}
                              onChange={(e) => handleProductSelect(pIdx, e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs"
                            >
                              <option value="">-- Choose Product or Service --</option>
                              {products.some(p => p.item_type === 'service') && (
                                <optgroup label="🛠️ SERVICES">
                                  {products.filter(p => p.item_type === 'service').map((p) => {
                                    const pPrice = partyPrices[p.id];
                                    return (
                                      <option key={p.id} value={p.id}>
                                        {p.name} - SAC: {p.sac_code || '998719'} - {pPrice !== undefined ? `🎯 Party Price: ₹${pPrice} (Std: ₹${p.selling_price})` : `₹${p.selling_price}`}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              )}
                              {products.some(p => p.item_type !== 'service') && (
                                <optgroup label="📦 PRODUCTS">
                                  {products.filter(p => p.item_type !== 'service').map((p) => {
                                    const pPrice = partyPrices[p.id];
                                    return (
                                      <option key={p.id} value={p.id}>
                                        {p.name} {p.sku ? `(${p.sku})` : ''} - Stock: {p.current_stock} {p.unit} - {pPrice !== undefined ? `🎯 Party Price: ₹${pPrice} (Std: ₹${p.selling_price})` : `₹${p.selling_price}`}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              )}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Qty:</label>
                            <input
                              type="number"
                              min="1"
                              value={prod.quantity}
                              onChange={(e) => {
                                const updated = [...additionalProducts];
                                updated[pIdx].quantity = parseFloat(e.target.value) || 1;
                                setAdditionalProducts(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Unit:</label>
                            <input
                              type="text"
                              value={prod.unit}
                              onChange={(e) => {
                                const updated = [...additionalProducts];
                                updated[pIdx].unit = e.target.value;
                                setAdditionalProducts(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Rate (₹):</label>
                            <input
                              type="number"
                              min="0"
                              value={prod.rate}
                              onChange={(e) => {
                                const updated = [...additionalProducts];
                                updated[pIdx].rate = parseFloat(e.target.value) || 0;
                                setAdditionalProducts(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Discount (₹):</label>
                            <input
                              type="number"
                              min="0"
                              value={prod.discount}
                              onChange={(e) => {
                                const updated = [...additionalProducts];
                                updated[pIdx].discount = parseFloat(e.target.value) || 0;
                                setAdditionalProducts(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">GST Rate (%):</label>
                            <select
                              value={prod.gst_rate}
                              onChange={(e) => {
                                const updated = [...additionalProducts];
                                updated[pIdx].gst_rate = parseFloat(e.target.value) || 18;
                                setAdditionalProducts(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Taxable Amount:</label>
                            <div className="px-3 py-2 bg-slate-100 rounded-xl font-semibold text-slate-700">
                              {formatINR(lineTaxable)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Line Total (Inc. GST):</label>
                            <div className="px-3 py-2 bg-teal-50/50 border border-teal-200 rounded-xl font-bold text-[#172B4D]">
                              {formatINR(lineTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Grand Total Preview */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-[#E2E8F0] space-y-2">
                {calculatedShutters.length > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Rolling Shutters Subtotal:</span>
                    <span className="font-semibold text-slate-900">{formatINR(shutterFabricationSubtotal)}</span>
                  </div>
                )}
                {shutterAddOnsSubtotal > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Motor & Fitting Charges:</span>
                    <span className="font-semibold text-slate-900">{formatINR(shutterAddOnsSubtotal)}</span>
                  </div>
                )}
                {calculatedProducts.length > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Additional Products Subtotal:</span>
                    <span className="font-semibold text-slate-900">{formatINR(productsSubtotal)}</span>
                  </div>
                )}
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Total Discount:</span>
                    <span className="font-bold text-emerald-700">- {formatINR(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 pt-1 border-t border-[#E2E8F0]">
                  <span>Taxable Subtotal:</span>
                  <span className="font-semibold text-slate-900">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (CGST + SGST):</span>
                  <span className="font-semibold text-slate-900">{formatINR(totalTax)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Transportation:</span>
                  <span className="font-semibold text-slate-900">{formatINR(transportCharges)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#172B4D] pt-2 border-t border-[#E2E8F0]">
                  <span>GRAND TOTAL:</span>
                  <span>{formatINR(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuotation}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md"
              >
                Save & Issue Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
