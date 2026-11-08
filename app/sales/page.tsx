'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Download,
  Share2,
  Printer,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  X,
  Phone,
  Ruler,
  Package,
  Wrench,
  Truck,
} from 'lucide-react';
import { formatINR, calculateGST } from '@/lib/gst';
import { generateDocumentPDF } from '@/lib/pdf/invoice-pdf';
import { generateWhatsAppLink } from '@/lib/whatsapp';
import { LEAF_PROFILES, MeasurementUnit, convertToFeet } from '@/lib/measurement';
import { numberToIndianWords } from '@/lib/number-to-words';

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

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [partyPrices, setPartyPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [paymentRef, setPaymentRef] = useState<string>('');

  // Create Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [invoiceType, setInvoiceType] = useState('tax_invoice');
  const [items, setItems] = useState<any[]>([
    {
      description: 'Rolling Shutter - Box Profile',
      hsnCode: '7308',
      width: 10,
      height: 8,
      measurementUnit: 'Feet',
      quantity: 1,
      ratePerSqFt: 280,
      unitPrice: 0,
      materialCharges: 0,
      motorCharges: 0,
      springCharges: 0,
      installationCharges: 1500,
      discount: 0,
      gstRate: 18,
    },
  ]);
  const [additionalProducts, setAdditionalProducts] = useState<AdditionalProductItem[]>([]);
  const [transportCharges, setTransportCharges] = useState(1000);
  const [advancePaid, setAdvancePaid] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, custRes, prodRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/customers'),
        fetch('/api/products'),
      ]);
      const [invData, custData, prodData] = await Promise.all([
        invRes.json(),
        custRes.json(),
        prodRes.json(),
      ]);

      if (invData.success) setInvoices(invData.data);
      if (custData.success) {
        setCustomers(custData.data);
        if (custData.data.length > 0 && !customerId) setCustomerId(custData.data[0].id);
      }
      if (prodData.success) setProducts(prodData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setIssueDate(new Date().toISOString().split('T')[0]);
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
            hsnCode: '7308',
            width: it.widthInput || it.width || 10,
            height: it.heightInput || it.height || 8,
            measurementUnit: it.unit || 'Feet',
            quantity: it.quantity || 1,
            ratePerSqFt: it.ratePerSqFt || 250,
            unitPrice: 0,
            motorCharges: it.motorCharges || 0,
            springCharges: it.springCharges || 0,
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

  // Calculate totals for shutters
  const calculatedShutters = items.map((it) => {
    const wFt = convertToFeet(it.width || 0, it.measurementUnit || 'Feet');
    const hFt = convertToFeet(it.height || 0, it.measurementUnit || 'Feet');
    const areaSqFt = Number((wFt * hFt).toFixed(3));
    const qty = it.quantity || 1;
    const baseFabrication = Number((areaSqFt * (it.ratePerSqFt || 0) * qty).toFixed(2));
    const addOns = Number(((it.motorCharges || 0) + (it.springCharges || 0) + (it.installationCharges || 0)).toFixed(2));
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
      cgst_amount: gstRes.cgstAmount,
      sgst_amount: gstRes.sgstAmount,
      total_amount: gstRes.grandTotal,
    };
  });

  // Calculate totals for products & services
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
      cgst_amount: gstRes.cgstAmount,
      sgst_amount: gstRes.sgstAmount,
      total_amount: gstRes.grandTotal,
    };
  });

  // Subtotals & Grand Totals
  const shutterFabricationSubtotal = calculatedShutters.reduce((acc, it) => acc + (it.unit_price || 0), 0);
  const shutterAddOnsSubtotal = calculatedShutters.reduce((acc, it) => acc + (it.motorCharges || 0) + (it.springCharges || 0) + (it.installationCharges || 0), 0);
  const productsSubtotal = calculatedProducts.reduce((acc, p) => acc + (p.quantity * p.unit_price), 0);
  const totalDiscount = calculatedShutters.reduce((acc, it) => acc + (it.discount || 0), 0) + calculatedProducts.reduce((acc, p) => acc + (p.discount || 0), 0);

  const subtotal = Number((calculatedShutters.reduce((acc, it) => acc + it.taxable_amount, 0) + calculatedProducts.reduce((acc, p) => acc + p.taxable_amount, 0)).toFixed(2));
  const totalCGST = Number((calculatedShutters.reduce((acc, it) => acc + it.cgst_amount, 0) + calculatedProducts.reduce((acc, p) => acc + p.cgst_amount, 0)).toFixed(2));
  const totalSGST = Number((calculatedShutters.reduce((acc, it) => acc + it.sgst_amount, 0) + calculatedProducts.reduce((acc, p) => acc + p.sgst_amount, 0)).toFixed(2));
  const totalTax = Number((totalCGST + totalSGST).toFixed(2));
  const grandTotal = Number((subtotal + totalTax + transportCharges).toFixed(2));
  const balanceDue = Math.max(0, grandTotal - advancePaid);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: 'Rolling Shutter Leaf Profile',
        hsnCode: '7308',
        width: 10,
        height: 8,
        measurementUnit: 'Feet',
        quantity: 1,
        ratePerSqFt: 250,
        motorCharges: 0,
        springCharges: 0,
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
      const res = await fetch('/api/invoices/next-number?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.nextNumber) {
        setInvoiceNumber(data.nextNumber);
      }
    } catch (e) {
      console.error('Error fetching next invoice number:', e);
    }
    setIssueDate(new Date().toISOString().split('T')[0]);
    setShowCreateModal(true);
  };

  const handleDeleteInvoice = async (inv: any) => {
    if (!confirm(`Are you sure you want to delete Invoice #${inv.invoice_number}? This will restore product inventory and rollback customer balance.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert('Failed to delete invoice: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleSaveInvoice = async () => {
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
      invoice_number: invoiceNumber ? invoiceNumber.trim() : undefined,
      issue_date: issueDate || new Date().toISOString().split('T')[0],
      customer_id: customerId,
      site_address: siteAddress,
      invoice_type: invoiceType,
      subtotal,
      discount: totalDiscount,
      taxable_amount: subtotal,
      is_interstate: false,
      cgst: totalCGST,
      sgst: totalSGST,
      igst: 0,
      total_tax: totalTax,
      installation_charges: calculatedShutters.reduce((acc, it) => acc + (it.installationCharges || 0), 0),
      transport_charges: transportCharges,
      grand_total: grandTotal,
      paid_amount: advancePaid,
      payment_mode: 'Cash',
      items: allItems,
    };

    try {
      const res = await fetch('/api/invoices', {
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
        alert('Failed to save invoice: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Payment Recording
  const handleOpenPayment = (inv: any) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentAmount(inv.balance_amount);
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoiceForPayment || paymentAmount <= 0) return;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'in',
          entity_type: 'customer',
          entity_id: selectedInvoiceForPayment.customer_id,
          invoice_id: selectedInvoiceForPayment.id,
          amount: paymentAmount,
          payment_mode: paymentMode,
          reference_number: paymentRef,
          notes: `Settlement for Invoice #${selectedInvoiceForPayment.invoice_number}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        fetchData();
      } else {
        alert('Payment failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error recording payment: ' + e.message);
    }
  };

  // View & PDF Generation
  const handleViewInvoice = async (inv: any) => {
    try {
      const fullRes = await fetch(`/api/invoices/${inv.id}`);
      const fullData = await fullRes.json();
      setViewingInvoice(fullData.data || inv);
    } catch (e) {
      setViewingInvoice(inv);
    }
  };

  const handleDownloadPDF = async (inv: any) => {
    const fullRes = await fetch(`/api/invoices/${inv.id}`);
    const fullData = await fullRes.json();
    const invoice = fullData.data || inv;

    const doc = generateDocumentPDF({
      type: 'invoice',
      docNumber: invoice.invoice_number,
      date: invoice.issue_date,
      dueDate: invoice.due_date,
      ewayBillNumber: invoice.eway_bill_number || (invoice.ewayBills && invoice.ewayBills[0]?.eway_bill_number),
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
        name: invoice.customer_name,
        phone: invoice.customer_phone,
        address: invoice.customer_address || 'Salem, Tamil Nadu',
        gstin: invoice.customer_gstin,
        pan: invoice.customer_pan || (invoice.customer_gstin && invoice.customer_gstin.length >= 12 ? invoice.customer_gstin.substring(2, 12) : 'BSOPV6815R'),
        state: invoice.customer_state || 'Tamil Nadu',
      },
      shipTo: {
        name: invoice.customer_name,
        address: invoice.site_address || invoice.customer_address || 'Salem, Tamil Nadu',
      },
      siteAddress: invoice.site_address,
      items: (invoice.items || []).map((it: any) => ({
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
      subtotal: invoice.subtotal,
      taxableAmount: invoice.taxable_amount,
      cgst: invoice.cgst,
      sgst: invoice.sgst,
      igst: invoice.igst,
      totalTax: invoice.total_tax,
      installationCharges: invoice.installation_charges,
      transportCharges: invoice.transport_charges,
      grandTotal: invoice.grand_total,
      paidAmount: invoice.paid_amount,
      previousBalance: 0,
      balanceAmount: invoice.balance_amount,
      bankDetails: {
        accountName: 'AL AMEEN WELDING WORKS',
        ifsc: 'SBIN0018379',
        accountNumber: '41904105649',
        bankName: 'State Bank of India ,THEEVATTIPATTI',
        upiId: 'thasthagiralameen-1@okicici',
      },
      terms: '1. Goods once sold will not be taken back or exchanged',
    });

    const cleanName = (invoice.customer_name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${cleanName}_Sales_Invoice_${invoice.invoice_number}.pdf`);
  };

  // WhatsApp Share
  const handleWhatsAppShare = (inv: any) => {
    const link = generateWhatsAppLink({
      phone: inv.customer_phone,
      customerName: inv.customer_name,
      type: 'invoice',
      docNumber: inv.invoice_number,
      grandTotal: inv.grand_total,
      balanceAmount: inv.balance_amount,
      date: inv.issue_date,
    });
    window.open(link, '_blank');
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = filterStatus === 'all' || inv.payment_status === filterStatus;
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Sales & Invoices
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage GST sales bills, delivery challans, and track customer payments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Create Bill / Invoice
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'paid', label: 'Paid' },
            { id: 'partial', label: 'Partially Paid' },
            { id: 'unpaid', label: 'Unpaid' },
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

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice number, client..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No invoices found. Click "Create Bill / Invoice" above to issue one.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  let badge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-600">
                      <Clock className="w-3 h-3" /> Partial
                    </span>
                  );
                  if (inv.payment_status === 'paid') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-600">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </span>
                    );
                  } else if (inv.payment_status === 'unpaid') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600">
                        <AlertCircle className="w-3 h-3" /> Unpaid
                      </span>
                    );
                  }

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div>{inv.invoice_number}</div>
                        {inv.eway_bill_number ? (
                          <Link
                            href={`/eway-bill?search=${inv.eway_bill_number}`}
                            className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-[#13A89E] hover:bg-teal-100 transition border border-teal-200"
                            title={`E-Way Bill #${inv.eway_bill_number}`}
                          >
                            <Truck className="w-2.5 h-2.5" /> EWB: {inv.eway_bill_number.slice(-6)}
                          </Link>
                        ) : inv.grand_total >= 50000 ? (
                          <Link
                            href="/eway-bill?status=pending"
                            className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200"
                            title="E-Way Bill Required (> ₹50,000 threshold)"
                          >
                            <Truck className="w-2.5 h-2.5" /> + E-Way Bill
                          </Link>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{inv.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{inv.customer_phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{inv.issue_date}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        {formatINR(inv.taxable_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatINR(inv.grand_total)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                        {formatINR(inv.paid_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                        {formatINR(inv.balance_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">{badge}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewInvoice(inv)}
                            title="View Authentic Bill"
                            className="p-1.5 text-slate-600 hover:text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={inv.eway_bill_number ? `/eway-bill?search=${inv.eway_bill_number}` : `/eway-bill?status=pending`}
                            title={inv.eway_bill_number ? `View E-Way Bill #${inv.eway_bill_number}` : 'Generate E-Way Bill'}
                            className="p-1.5 text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                          >
                            <Truck className="w-4 h-4" />
                          </Link>
                          {inv.balance_amount > 0 && (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              title="Record Payment"
                              className="p-1.5 text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            title="Download PDF"
                            className="p-1.5 text-slate-600 hover:text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleWhatsAppShare(inv)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            title="Delete Invoice"
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

      {/* 4. Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#13A89E]" />
                <h3 className="font-bold text-slate-900 text-base">New GST Sales Invoice</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Document Sequence & Issue Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-[#E2E8F0]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#172B4D]">
                      Invoice Number:
                    </label>
                    <span className="text-[10px] font-extrabold text-[#13A89E] bg-white px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs">
                      Auto Sequence
                    </span>
                  </div>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. 001"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-mono font-extrabold text-[#172B4D] focus:border-[#13A89E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Invoice Issue Date:
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 focus:border-[#13A89E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Customer & Site Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Select Customer:
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Site Delivery Address:
                  </label>
                  <input
                    type="text"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    placeholder="e.g. Shop #4, Salem Main Road"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Shutter Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-[#13A89E]" />
                    Shutter Line Items & Measurements
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-[#13A89E] hover:text-[#0E8A81] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Shutter
                  </button>
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                      No rolling shutters added. (Click &quot;+ Add Shutter&quot; if billing manufactured rolling shutters)
                    </div>
                  ) : (
                    items.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#172B4D]">
                            Shutter Item #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-500"
                            title="Remove Shutter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Description / Profile:
                            </label>
                            <input
                              type="text"
                              value={it.description}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].description = e.target.value;
                                setItems(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Width:
                            </label>
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
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Height:
                            </label>
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

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Unit:
                            </label>
                            <select
                              value={it.measurementUnit}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].measurementUnit = e.target.value;
                                setItems(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                            >
                              <option value="Feet">Feet</option>
                              <option value="Inches">Inches</option>
                              <option value="Millimetres">Millimetres</option>
                              <option value="Metres">Metres</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Rate/Sq.Ft (₹):
                            </label>
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
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Motor Charges (₹):
                            </label>
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
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Springs / Parts (₹):
                            </label>
                            <input
                              type="number"
                              value={it.springCharges || 0}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].springCharges = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-100">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Fitting / Lab (₹):
                            </label>
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
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Discount (₹):
                            </label>
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
                      <div key={pIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
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
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Select Item from Database:
                            </label>
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

              {/* Transportation & Advance Paid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Transportation Charges (₹):
                  </label>
                  <input
                    type="number"
                    value={transportCharges}
                    onChange={(e) => setTransportCharges(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Advance Payment Received (₹):
                  </label>
                  <input
                    type="number"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-600"
                  />
                </div>
              </div>

              {/* Financial Calculation Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-[#E2E8F0] space-y-2 text-xs">
                {calculatedShutters.length > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Rolling Shutters Subtotal:</span>
                    <span className="font-semibold text-slate-900">{formatINR(shutterFabricationSubtotal)}</span>
                  </div>
                )}
                {shutterAddOnsSubtotal > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Motor, Spring &amp; Fitting Charges:</span>
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
                <div className="flex justify-between text-xs font-bold text-rose-600">
                  <span>Balance Due on Delivery:</span>
                  <span>{formatINR(balanceDue)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInvoice}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Save & Generate Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Payment Modal */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#13A89E]" />
                <h3 className="font-bold text-slate-900 text-base">Record Payment</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-500">Invoice:</span>
                <div className="font-bold text-slate-800 text-sm">
                  #{selectedInvoiceForPayment.invoice_number} ({selectedInvoiceForPayment.customer_name})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Payment Amount (₹):
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Payment Mode:</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Reference / Transaction ID (Optional):
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI/3948291048"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md"
              >
                Confirm Payment Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Authentic Bill Viewer Modal (Exact SRI KUMARAN SHUTTERS format) */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    Sales Invoice #{viewingInvoice.invoice_number}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Official Authentic GST Format (Al Ameen Rolling Shutter Manufacturing)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(viewingInvoice)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bill Canvas (A4 Paper Aspect) */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center">
              <div className="bg-white w-full max-w-[760px] p-6 shadow-sm border border-slate-300 text-slate-900 font-sans text-[11px] leading-tight select-none">
                {/* Header Badge: TAX INVOICE | ORIGINAL */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-extrabold text-sm tracking-wide text-black">
                    TAX INVOICE
                  </span>
                  <span className="border border-slate-400 text-slate-600 px-3 py-0.5 rounded-md text-[10px] font-bold">
                    ORIGINAL
                  </span>
                </div>

                {/* Section 1: Company Header (Top 2-column box) */}
                <div className="border border-black grid grid-cols-2">
                  {/* Left Column: Logo & Company details */}
                  <div className="p-2.5 border-r border-black flex gap-2.5">
                    {/* Logo */}
                    <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/logo.png"
                        alt="Al Ameen Automation Logo"
                        className="w-14 h-14 object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="font-black text-[#DA8C18] text-xs leading-snug">
                        AL AMEEN WELDING WORKS &<br />
                        ROLLING SHUTTER<br />
                        MANUFACTURING
                      </div>
                      <p className="text-[9px] text-slate-700 leading-tight">
                        Office: Danishpet main road, santhaipettai, kadaiyampatti(PO &TK),salem(DT),Tamil Nadu, INDIA -636351, Salem, Tamil Nadu, 636351
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-[9px] pt-1 border-t border-slate-200">
                        <div>
                          <span className="font-bold">GSTIN:</span> 33CRHPD7107H1Z3
                        </div>
                        <div>
                          <span className="font-bold">Mobile:</span> 9629495874
                        </div>
                        <div>
                          <span className="font-bold">PAN:</span> CRHPD7107H
                        </div>
                        <div className="truncate">
                          <span className="font-bold">Email:</span> alameenweldingwork@gmail.com
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Invoice Details (3 sub-columns) */}
                  <div className="grid grid-cols-3 divide-x divide-slate-300 text-center items-center py-6">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-600 text-[10px]">Invoice No.</div>
                      <div className="font-extrabold text-xs text-black">
                        {viewingInvoice.invoice_number}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-600 text-[10px]">Invoice Date</div>
                      <div className="font-semibold text-[10px] text-black">
                        {viewingInvoice.issue_date}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-600 text-[10px]">Due Date</div>
                      <div className="font-semibold text-[10px] text-black">
                        {viewingInvoice.due_date || viewingInvoice.issue_date}
                      </div>
                    </div>
                  </div>
                  {viewingInvoice.eway_bill_number && (
                    <div className="border-t border-slate-300 py-1.5 px-3 flex items-center justify-between text-[10px] bg-teal-50/60 text-[#172B4D] font-bold">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-[#13A89E]" />
                        Official e-Way Bill No:
                      </span>
                      <span className="font-mono tracking-wider text-[#172B4D]">
                        {viewingInvoice.eway_bill_number}
                      </span>
                    </div>
                  )}
                </div>

                {/* Section 2: Bill To & Ship To */}
                <div className="border-x border-b border-black grid grid-cols-2">
                  <div className="p-2 border-r border-black space-y-1">
                    <div className="font-bold text-[10px] text-black">BILL TO</div>
                    <div className="font-bold text-[11px] text-black">
                      {viewingInvoice.customer_name?.toUpperCase()}
                    </div>
                    <p className="text-[9.5px] text-slate-700">
                      Address: {viewingInvoice.customer_address || 'Salem, Tamil Nadu, 636015'}
                    </p>
                    <div className="flex items-center justify-between text-[9.5px] pt-1">
                      <div>
                        <span className="font-bold">GSTIN:</span>{' '}
                        {viewingInvoice.customer_gstin || '33BSOPV6815R1ZN'}
                      </div>
                      <div>
                        <span className="font-bold">Place of Supply:</span> Tamil Nadu
                      </div>
                    </div>
                    <div className="text-[9.5px]">
                      <span className="font-bold">PAN Number:</span>{' '}
                      {viewingInvoice.customer_pan ||
                        (viewingInvoice.customer_gstin && viewingInvoice.customer_gstin.length >= 12
                          ? viewingInvoice.customer_gstin.substring(2, 12)
                          : 'BSOPV6815R')}
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <div className="font-bold text-[10px] text-black">SHIP TO</div>
                    <div className="font-bold text-[11px] text-black">
                      {viewingInvoice.customer_name?.toUpperCase()}
                    </div>
                    <p className="text-[9.5px] text-slate-700">
                      Address: {viewingInvoice.site_address || viewingInvoice.customer_address || 'Salem, Tamil Nadu, 636015'}
                    </p>
                  </div>
                </div>

                {/* Section 3: Items Table with Peach/Cream Header */}
                <div className="border-x border-b border-black">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FEF3C7] border-b border-black text-black font-bold text-[10px]">
                        <th className="py-1 px-2 border-r border-black text-center w-10">S.NO.</th>
                        <th className="py-1 px-2 border-r border-black">ITEMS</th>
                        <th className="py-1 px-2 border-r border-black text-center w-16">HSN / SAC</th>
                        <th className="py-1 px-2 border-r border-black text-right w-24">QTY.</th>
                        <th className="py-1 px-2 border-r border-black text-right w-16">RATE</th>
                        <th className="py-1 px-2 border-r border-black text-right w-24">TAX</th>
                        <th className="py-1 px-2 text-right w-24">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-0 text-[10.5px]">
                      {(viewingInvoice.items && viewingInvoice.items.length > 0
                        ? viewingInvoice.items
                        : [
                            {
                              description: 'Roilng shuttar Lath',
                              hsn_code: '7308',
                              quantity: 1454.5,
                              measurement_unit: 'KGS',
                              unit_price: 84.75,
                              taxable_amount: 123262.71,
                              gst_rate: 18,
                              total_amount: 145450,
                            },
                          ]
                      ).map((it: any, idx: number) => {
                        const taxAmt =
                          (it.cgst_amount || 0) + (it.sgst_amount || 0) ||
                          (it.taxable_amount * (it.gst_rate || 18)) / 100;
                        return (
                          <tr key={idx} className="h-10 align-top">
                            <td className="py-1 px-2 border-r border-black text-center">
                              {idx + 1}
                            </td>
                            <td className="py-1 px-2 border-r border-black font-medium">
                              {it.description}
                            </td>
                            <td className="py-1 px-2 border-r border-black text-center">
                              {it.hsn_code || (it.item_type === 'service' ? '998719' : (it.item_type === 'product' ? '8501' : '7308'))}
                            </td>
                            <td className="py-1 px-2 border-r border-black text-right">
                              {it.quantity} {it.item_type === 'service' ? (it.measurement_unit || 'Job') : (it.item_type === 'product' ? (it.measurement_unit || 'Nos') : (it.measurement_unit || 'KGS'))}
                            </td>
                            <td className="py-1 px-2 border-r border-black text-right">
                              {it.item_type === 'service' || it.item_type === 'product' || !it.rate_per_sqft ? it.unit_price : it.rate_per_sqft}
                            </td>
                            <td className="py-1 px-2 border-r border-black text-right">
                              <div>{formatINR(taxAmt).replace('₹', '').trim()}</div>
                              <div className="text-[9px] text-slate-500">
                                ({it.gst_rate || 18}%)
                              </div>
                            </td>
                            <td className="py-1 px-2 text-right font-medium">
                              {formatINR(it.total_amount).replace('₹', '').trim()}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Spacer rows to maintain vertical column lines */}
                      <tr className="h-24">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td></td>
                      </tr>

                      {/* TOTAL ROW */}
                      <tr className="border-t border-black font-bold">
                        <td colSpan={3} className="py-1 px-2 text-right border-r border-black">
                          TOTAL
                        </td>
                        <td className="py-1 px-2 text-right border-r border-black">
                          {viewingInvoice.items
                            ? viewingInvoice.items.reduce(
                                (acc: number, it: any) => acc + (it.quantity || 0),
                                0
                              )
                            : 1454.5}
                        </td>
                        <td className="border-r border-black"></td>
                        <td className="py-1 px-2 text-right border-r border-black">
                          ₹ {formatINR(viewingInvoice.total_tax).replace('₹', '').trim()}
                        </td>
                        <td className="py-1 px-2 text-right">
                          ₹ {formatINR(viewingInvoice.grand_total).replace('₹', '').trim()}
                        </td>
                      </tr>

                      {/* RECEIVED AMOUNT */}
                      <tr className="border-t border-black font-bold">
                        <td colSpan={6} className="py-1 px-2 text-right border-r border-black">
                          RECEIVED AMOUNT
                        </td>
                        <td className="py-1 px-2 text-right">
                          ₹ {formatINR(viewingInvoice.paid_amount || 0).replace('₹', '').trim()}
                        </td>
                      </tr>

                      {/* PREVIOUS BALANCE */}
                      <tr className="border-t border-black font-bold">
                        <td colSpan={6} className="py-1 px-2 text-right border-r border-black">
                          PREVIOUS BALANCE
                        </td>
                        <td className="py-1 px-2 text-right">₹ 0</td>
                      </tr>

                      {/* CURRENT BALANCE */}
                      <tr className="border-t border-black font-bold">
                        <td colSpan={6} className="py-1 px-2 text-right border-r border-black">
                          CURRENT BALANCE
                        </td>
                        <td className="py-1 px-2 text-right font-extrabold">
                          ₹ {formatINR(viewingInvoice.balance_amount).replace('₹', '').trim()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 4: HSN/SAC Breakdown Table */}
                <div className="border-x border-b border-black mt-2">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-[#FEF3C7] border-b border-black font-bold">
                        <th rowSpan={2} className="py-1 px-2 border-r border-black w-20">
                          HSN/SAC
                        </th>
                        <th rowSpan={2} className="py-1 px-2 border-r border-black w-32">
                          Taxable Value
                        </th>
                        <th colSpan={2} className="py-0.5 px-2 border-r border-black">
                          CGST
                        </th>
                        <th colSpan={2} className="py-0.5 px-2 border-r border-black">
                          SGST
                        </th>
                        <th rowSpan={2} className="py-1 px-2 w-32">
                          Total Tax Amount
                        </th>
                      </tr>
                      <tr className="bg-[#FEF3C7] border-b border-black font-bold text-[9px]">
                        <th className="py-0.5 px-1 border-r border-black">Rate</th>
                        <th className="py-0.5 px-1 border-r border-black">Amount</th>
                        <th className="py-0.5 px-1 border-r border-black">Rate</th>
                        <th className="py-0.5 px-1 border-r border-black">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px]">
                      {(() => {
                        const hsnMap: { [hsn: string]: { taxable: number; rate: number; cgst: number; sgst: number; totalTax: number } } = {};
                        const invItems = viewingInvoice.items && viewingInvoice.items.length > 0 ? viewingInvoice.items : [];

                        if (invItems.length > 0) {
                          invItems.forEach((it: any) => {
                            const hsn = (it.hsn_code || '7308').trim();
                            const rate = it.gst_rate || 18;
                            const taxable = Number(it.taxable_amount) || 0;
                            const cgst = Number(it.cgst_amount) || (taxable * (rate / 2)) / 100;
                            const sgst = Number(it.sgst_amount) || (taxable * (rate / 2)) / 100;
                            const total = cgst + sgst;
                            if (!hsnMap[hsn]) {
                              hsnMap[hsn] = { taxable: 0, rate, cgst: 0, sgst: 0, totalTax: 0 };
                            }
                            hsnMap[hsn].taxable += taxable;
                            hsnMap[hsn].cgst += cgst;
                            hsnMap[hsn].sgst += sgst;
                            hsnMap[hsn].totalTax += total;
                          });
                        } else {
                          hsnMap['7308'] = {
                            taxable: viewingInvoice.taxable_amount || 0,
                            rate: 18,
                            cgst: viewingInvoice.cgst || (viewingInvoice.total_tax / 2) || 0,
                            sgst: viewingInvoice.sgst || (viewingInvoice.total_tax / 2) || 0,
                            totalTax: viewingInvoice.total_tax || 0,
                          };
                        }

                        return Object.entries(hsnMap).map(([hsn, g], idx) => (
                          <tr key={idx} className="h-6">
                            <td className="border-r border-black text-center">{hsn}</td>
                            <td className="border-r border-black text-right px-2">
                              {formatINR(g.taxable).replace('₹', '').trim()}
                            </td>
                            <td className="border-r border-black text-center">{(g.rate / 2).toFixed(g.rate % 2 === 0 ? 0 : 1)}%</td>
                            <td className="border-r border-black text-right px-2">
                              {formatINR(g.cgst).replace('₹', '').trim()}
                            </td>
                            <td className="border-r border-black text-center">{(g.rate / 2).toFixed(g.rate % 2 === 0 ? 0 : 1)}%</td>
                            <td className="border-r border-black text-right px-2">
                              {formatINR(g.sgst).replace('₹', '').trim()}
                            </td>
                            <td className="text-right px-2 font-semibold">
                              ₹ {formatINR(g.totalTax).replace('₹', '').trim()}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Section 5: Total Amount in words */}
                <div className="border-x border-b border-black p-2 mt-2">
                  <div className="text-[9px] font-bold text-slate-700">
                    Total Amount (in words)
                  </div>
                  <div className="font-bold text-[11px] text-black">
                    {numberToIndianWords(viewingInvoice.grand_total)}
                  </div>
                </div>

                {/* Section 6: Bank Details & Payment QR Code */}
                <div className="border-x border-b border-black grid grid-cols-2 mt-2">
                  {/* Left: Bank Details */}
                  <div className="p-2.5 border-r border-black space-y-1">
                    <div className="font-bold text-[10px] text-black mb-1">Bank Details</div>
                    <div className="grid grid-cols-[80px_1fr] text-[10px] gap-0.5">
                      <span className="text-slate-600">Name:</span>
                      <span className="font-bold">AL AMEEN WELDING WORKS</span>
                      <span className="text-slate-600">IFSC Code:</span>
                      <span className="font-bold">SBIN0018379</span>
                      <span className="text-slate-600">Account No:</span>
                      <span className="font-bold">41904105649</span>
                      <span className="text-slate-600">Bank:</span>
                      <span>State Bank of India ,THEEVATTIPATTI</span>
                    </div>
                  </div>

                  {/* Right: Payment QR Code & Banner */}
                  <div className="p-2.5 flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="font-bold text-[10px] text-black">Payment QR Code</div>
                      <div className="text-[10px]">
                        <span className="text-slate-600">UPI ID:</span><br />
                        <span className="font-bold">thasthagiralameen-1@okicici</span>
                      </div>
                      {/* UPI Banner */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/upi_banner.png"
                        alt="UPI Apps (PhonePe, GPay, Paytm, UPI)"
                        className="h-6 object-contain object-left max-w-[220px]"
                      />
                    </div>
                    {/* QR Code */}
                    <div className="w-16 h-16 shrink-0 border border-slate-200 p-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/qr_code.png"
                        alt="UPI QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 7: Terms and Conditions & Authorised Signatory */}
                <div className="border-x border-b border-black grid grid-cols-2 mt-2">
                  <div className="p-2.5 border-r border-black space-y-1">
                    <div className="font-bold text-[10px] text-black">
                      Terms and Conditions
                    </div>
                    <p className="text-[9.5px] text-slate-700 leading-tight">
                      1. Goods once sold will not be taken back or exchanged
                    </p>
                  </div>

                  <div className="p-2.5 text-center flex flex-col items-center justify-end">
                    {/* Signature */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/signature.png"
                      alt="Signature"
                      className="h-8 object-contain mb-1"
                    />
                    <div className="text-[9.5px] text-slate-600">Authorised Signatory For</div>
                    <div className="font-bold text-[9px] text-black">
                      AL AMEEN WELDING WORKS & ROLLING SHUTTER MANUFACTURING
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
