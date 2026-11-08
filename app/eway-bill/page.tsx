'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Download,
  Printer,
  Eye,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
  ExternalLink,
  Copy,
  FileText,
  Building,
  MapPin,
  Calendar,
  Shield,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';
import { generateEWayBillPDF } from '@/lib/pdf/eway-bill-pdf';
import {
  formatEBN,
  formatToNICDate,
  estimateDistanceKm,
  GST_STATE_CODES,
  CANCELLATION_REASONS,
  VEHICLE_UPDATE_REASONS,
  normalizeVehicleNumber,
  validateVehicleNumber,
  validatePincode,
  validateGSTIN,
} from '@/lib/eway-bill/utils';

export default function EWayBillPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [selectedBillForAction, setSelectedBillForAction] = useState<any>(null);

  // Create Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState('');
  const [toName, setToName] = useState('');
  const [toGstin, setToGstin] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [toPlace, setToPlace] = useState('');
  const [toPincode, setToPincode] = useState('');
  const [toStateCode, setToStateCode] = useState('33');

  // Transport details
  const [transportMode, setTransportMode] = useState('1'); // 1=Road
  const [distanceKm, setDistanceKm] = useState(20);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('R');
  const [transporterName, setTransporterName] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [transporterDocNo, setTransporterDocNo] = useState('');
  const [transporterDocDate, setTransporterDocDate] = useState('');

  // Amounts
  const [totalTaxableAmount, setTotalTaxableAmount] = useState(0);
  const [cgstAmount, setCgstAmount] = useState(0);
  const [sgstAmount, setSgstAmount] = useState(0);
  const [igstAmount, setIgstAmount] = useState(0);
  const [totalInvoiceValue, setTotalInvoiceValue] = useState(0);
  const [formItems, setFormItems] = useState<any[]>([]);

  // Generation Method: 'manual' or 'api'
  const [createMethod, setCreateMethod] = useState<'manual' | 'api'>('manual');
  const [manualEbn, setManualEbn] = useState('');
  const [manualValidUntil, setManualValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Vehicle Update Form
  const [updateVehNumber, setUpdateVehNumber] = useState('');
  const [updateReasonCode, setUpdateReasonCode] = useState('1');
  const [updateFromPlace, setUpdateFromPlace] = useState('Salem');
  const [updateDocNo, setUpdateDocNo] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');

  // Cancel Form
  const [cancelReasonCode, setCancelReasonCode] = useState('2');
  const [cancelRemarks, setCancelRemarks] = useState('');

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<any>({
    environment: 'sandbox',
    gsp_provider: 'manual',
    api_username: '',
    api_password: '',
    client_id: '',
    client_secret: '',
    gstin: '33CRHPD7107H1Z3',
    default_transporter_id: '',
    default_transporter_name: '',
    default_vehicle_number: 'TN28AB1234',
    default_from_place: 'Salem',
    default_from_pincode: '636001',
    default_from_address: '13-A, Omalur Main Road, Near Bus Stand',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ewbRes, pendingRes, invRes, setRes] = await Promise.all([
        fetch('/api/eway-bill'),
        fetch('/api/eway-bill/pending'),
        fetch('/api/invoices'),
        fetch('/api/eway-bill/settings'),
      ]);

      const [ewbData, pendingData, invData, setData] = await Promise.all([
        ewbRes.json(),
        pendingRes.json(),
        invRes.json(),
        setRes.json(),
      ]);

      if (ewbData.success) setBills(ewbData.data || []);
      if (pendingData.success) setPendingInvoices(pendingData.data || []);
      if (invData.success) setInvoices(invData.data || []);
      if (setData.success && setData.data) {
        setSettings(setData.data);
        setSettingsForm(setData.data);
      }
    } catch (err) {
      console.error('Failed to fetch E-Way Bill data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When invoice selection changes in Create Modal
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) return;

    const inv = invoices.find((i) => i.id === invId);
    if (!inv) return;

    setDocNumber(inv.invoice_number);
    setDocDate(inv.issue_date || new Date().toISOString().split('T')[0]);
    setToName(inv.customer_name || '');
    setToGstin(inv.customer_gstin || 'URP');
    setToAddress(inv.site_address || inv.customer_address || 'Salem, Tamil Nadu');
    setToPlace(inv.customer_state || 'Salem');
    setToPincode('636001'); // default local Salem or extracted
    setToStateCode(inv.customer_state_code || '33');

    // Values
    setTotalTaxableAmount(inv.taxable_amount || 0);
    setCgstAmount(inv.cgst || 0);
    setSgstAmount(inv.sgst || 0);
    setIgstAmount(inv.igst || 0);
    setTotalInvoiceValue(inv.grand_total || 0);

    // Distance calculation
    const fromPin = settings?.default_from_pincode || '636001';
    const estDist = estimateDistanceKm('33', inv.customer_state_code || '33', fromPin, '636001');
    setDistanceKm(estDist);

    // Default vehicle
    if (settings?.default_vehicle_number) {
      setVehicleNumber(settings.default_vehicle_number);
    }

    // Default validity date (1 day per 200 km, min 1 day)
    const daysValid = Math.max(1, Math.ceil(estDist / 200));
    const vDate = new Date();
    vDate.setDate(vDate.getDate() + daysValid);
    vDate.setHours(23, 59, 59, 0);
    setManualValidUntil(vDate.toISOString().replace('T', ' ').substring(0, 19));

    // Items
    if (inv.items && inv.items.length > 0) {
      setFormItems(
        inv.items.map((it: any) => ({
          product_name: it.description || 'Rolling Shutter Component',
          product_desc: it.description || '',
          hsn_code: it.hsn_code || '7308',
          quantity: it.quantity || 1,
          unit: it.unit || 'NOS',
          taxable_amount: it.taxable_amount || 0,
          gst_rate: it.gst_rate || 18,
          cgst_amount: it.cgst_amount || 0,
          sgst_amount: it.sgst_amount || 0,
          igst_amount: it.igst_amount || 0,
          total_amount: it.total_amount || 0,
        }))
      );
    } else {
      setFormItems([
        {
          product_name: 'Rolling Shutter & Automation Accessories',
          product_desc: 'Manufactured Rolling Shutter',
          hsn_code: '7308',
          quantity: 1,
          unit: 'NOS',
          taxable_amount: inv.taxable_amount || 0,
          gst_rate: 18,
          cgst_amount: inv.cgst || 0,
          sgst_amount: inv.sgst || 0,
          igst_amount: inv.igst || 0,
          total_amount: inv.grand_total || 0,
        },
      ]);
    }
  };

  const handleOpenCreateModal = (preselectedInvoiceId?: string) => {
    setSelectedInvoiceId('');
    setDocNumber('');
    setDocDate(new Date().toISOString().split('T')[0]);
    setToName('');
    setToGstin('URP');
    setToAddress('');
    setToPlace('Salem');
    setToPincode('636001');
    setToStateCode('33');
    setTransportMode('1');
    setDistanceKm(20);
    setVehicleNumber(settings?.default_vehicle_number || 'TN28AB1234');
    setVehicleType('R');
    setTransporterName(settings?.default_transporter_name || '');
    setTransporterId(settings?.default_transporter_id || '');
    setTransporterDocNo('');
    setManualEbn('');

    const vDate = new Date();
    vDate.setDate(vDate.getDate() + 1);
    vDate.setHours(23, 59, 59, 0);
    setManualValidUntil(vDate.toISOString().replace('T', ' ').substring(0, 19));

    setTotalTaxableAmount(0);
    setCgstAmount(0);
    setSgstAmount(0);
    setIgstAmount(0);
    setTotalInvoiceValue(0);
    setFormItems([]);

    if (preselectedInvoiceId) {
      setTimeout(() => handleSelectInvoice(preselectedInvoiceId), 50);
    } else if (pendingInvoices.length > 0) {
      setTimeout(() => handleSelectInvoice(pendingInvoices[0].id), 50);
    }

    setShowCreateModal(true);
  };

  // Build prepared JSON object for copying/downloading
  const getPreparedNICPayload = () => {
    return {
      supplyType: 'O',
      subSupplyType: '1',
      subSupplyDesc: 'Supply',
      docType: 'INV',
      docNo: docNumber || '1',
      docDate: formatToNICDate(docDate),
      fromGstin: settings?.gstin || '33CRHPD7107H1Z3',
      fromTrdName: 'AL AMEEN WELDING WORKS',
      fromAddr1: settings?.default_from_address || '13-A, Omalur Main Road',
      fromPlace: settings?.default_from_place || 'Salem',
      fromPincode: parseInt(settings?.default_from_pincode || '636001', 10),
      actFromStateCode: 33,
      fromStateCode: 33,
      toGstin: toGstin || 'URP',
      toTrdName: toName || 'Customer',
      toAddr1: toAddress || 'Delivery Address',
      toPlace: toPlace || 'Salem',
      toPincode: parseInt(toPincode || '636001', 10),
      actToStateCode: parseInt(toStateCode || '33', 10),
      toStateCode: parseInt(toStateCode || '33', 10),
      transactionType: 1,
      totalValue: totalTaxableAmount,
      cgstValue: cgstAmount,
      sgstValue: sgstAmount,
      igstValue: igstAmount,
      cessValue: 0,
      totInvValue: totalInvoiceValue,
      transMode: transportMode,
      transDistance: String(distanceKm),
      transporterName: transporterName || undefined,
      transporterId: transporterId || undefined,
      transDocNo: transporterDocNo || undefined,
      transDocDate: transporterDocDate ? formatToNICDate(transporterDocDate) : undefined,
      vehicleNo: vehicleNumber ? normalizeVehicleNumber(vehicleNumber) : undefined,
      vehicleType: vehicleType,
      itemList: formItems.map((it, idx) => ({
        itemNo: idx + 1,
        productName: it.product_name,
        productDesc: it.product_desc || it.product_name,
        hsnCode: parseInt(String(it.hsn_code || '7308').replace(/\D/g, ''), 10) || 7308,
        quantity: Number(it.quantity || 1),
        qtyUnit: (it.unit || 'NOS').toUpperCase(),
        taxableAmount: Number(it.taxable_amount || 0),
        cgstRate: it.igst_amount > 0 ? 0 : 9,
        sgstRate: it.igst_amount > 0 ? 0 : 9,
        igstRate: it.igst_amount > 0 ? 18 : 0,
        cessRate: 0,
      })),
    };
  };

  const handleCopyNICPayload = () => {
    const payload = getPreparedNICPayload();
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleDownloadNICJSON = () => {
    const payload = getPreparedNICPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NIC_EWB_${docNumber || 'Invoice'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Submit Create E-Way Bill
  const handleSaveEWayBill = async () => {
    if (!docNumber) {
      alert('Invoice / Document Number is required');
      return;
    }
    if (!toName) {
      alert('Customer / Recipient Name is required');
      return;
    }
    if (!toPincode || toPincode.length !== 6) {
      alert('Please enter a valid 6-digit PIN code');
      return;
    }

    if (vehicleNumber) {
      const vehCheck = validateVehicleNumber(vehicleNumber);
      if (!vehCheck.valid) {
        alert(vehCheck.error);
        return;
      }
    }

    if (createMethod === 'manual') {
      if (!manualEbn || manualEbn.replace(/\s/g, '').length !== 12) {
        alert('Please enter the official 12-digit E-Way Bill Number obtained from https://ewaybillgst.gov.in/');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_id: selectedInvoiceId || null,
        doc_number: docNumber,
        doc_date: docDate || new Date().toISOString().split('T')[0],
        generation_method: createMethod,
        eway_bill_number: createMethod === 'manual' ? manualEbn.replace(/\s/g, '') : undefined,
        valid_until: createMethod === 'manual' ? manualValidUntil : undefined,
        from_name: 'AL AMEEN WELDING WORKS',
        from_gstin: settings?.gstin || '33CRHPD7107H1Z3',
        from_address: settings?.default_from_address || '13-A, Omalur Main Road, Near Bus Stand',
        from_place: settings?.default_from_place || 'Salem',
        from_pincode: settings?.default_from_pincode || '636001',
        from_state_code: '33',
        to_name: toName,
        to_gstin: toGstin || 'URP',
        to_address: toAddress,
        to_place: toPlace || 'Salem',
        to_pincode: toPincode,
        to_state_code: toStateCode,
        transport_mode: transportMode,
        distance_km: distanceKm,
        transporter_name: transporterName,
        transporter_id: transporterId,
        transporter_doc_no: transporterDocNo,
        transporter_doc_date: transporterDocDate,
        vehicle_number: vehicleNumber ? normalizeVehicleNumber(vehicleNumber) : '',
        vehicle_type: vehicleType,
        total_taxable_amount: totalTaxableAmount,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        total_invoice_value: totalInvoiceValue,
        items: formItems,
      };

      const res = await fetch('/api/eway-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchData();
        // Prompt to download PDF
        if (confirm(`E-Way Bill #${formatEBN(data.data.eway_bill_number)} saved successfully!\n\nWould you like to download the official Form GST EWB-01 PDF now?`)) {
          handleDownloadPDF(data.data);
        }
      } else {
        alert(`Failed to generate E-Way Bill: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error saving E-Way Bill: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Vehicle Update Modal
  const handleOpenVehicleModal = (bill: any) => {
    setSelectedBillForAction(bill);
    setUpdateVehNumber(bill.vehicle_number || '');
    setUpdateReasonCode('1');
    setUpdateFromPlace(bill.from_place || 'Salem');
    setUpdateDocNo(bill.transporter_doc_no || '');
    setUpdateRemarks('');
    setShowVehicleModal(true);
  };

  const handleSaveVehicleUpdate = async () => {
    if (!updateVehNumber) {
      alert('Please enter new vehicle registration number');
      return;
    }
    const vehCheck = validateVehicleNumber(updateVehNumber);
    if (!vehCheck.valid) {
      alert(vehCheck.error);
      return;
    }

    try {
      const res = await fetch(`/api/eway-bill/${selectedBillForAction.id}/vehicle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_number: vehCheck.normalized,
          transport_doc_no: updateDocNo,
          from_place: updateFromPlace,
          reason_code: updateReasonCode,
          remarks: updateRemarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowVehicleModal(false);
        fetchData();
        alert('Part-B Vehicle details updated successfully!');
      } else {
        alert(`Update failed: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error updating vehicle: ${e.message}`);
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (bill: any) => {
    setSelectedBillForAction(bill);
    setCancelReasonCode('2'); // Order Cancelled
    setCancelRemarks('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!confirm('Are you sure you want to cancel this E-Way Bill? This action cannot be reversed under GST rules.')) {
      return;
    }

    try {
      const res = await fetch(`/api/eway-bill/${selectedBillForAction.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason_code: cancelReasonCode,
          remarks: cancelRemarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCancelModal(false);
        fetchData();
        alert('E-Way Bill has been marked as Cancelled.');
      } else {
        alert(`Failed to cancel: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // PDF Generation
  const handleDownloadPDF = async (bill: any) => {
    try {
      const res = await fetch(`/api/eway-bill/${bill.id}`);
      const data = await res.json();
      const fullBill = data.data || bill;

      const doc = generateEWayBillPDF(fullBill);
      const ebnClean = (fullBill.eway_bill_number || fullBill.id).replace(/\s/g, '');
      doc.save(`EWayBill_${ebnClean}.pdf`);
    } catch (e: any) {
      alert(`PDF generation failed: ${e.message}`);
    }
  };

  const handlePrintPDF = async (bill: any) => {
    try {
      const res = await fetch(`/api/eway-bill/${bill.id}`);
      const data = await res.json();
      const fullBill = data.data || bill;

      const doc = generateEWayBillPDF(fullBill);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (e: any) {
      alert(`Print failed: ${e.message}`);
    }
  };

  // View Modal
  const handleViewBill = async (bill: any) => {
    try {
      const res = await fetch(`/api/eway-bill/${bill.id}`);
      const data = await res.json();
      setViewingBill(data.data || bill);
    } catch (e) {
      setViewingBill(bill);
    }
  };

  // Settings Save
  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/eway-bill/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setShowSettingsModal(false);
        alert('E-Way Bill settings updated successfully!');
      } else {
        alert(`Failed to save settings: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Filter bills
  const filteredBills = bills.filter((b) => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (b.eway_bill_number && b.eway_bill_number.toLowerCase().includes(q)) ||
      (b.doc_number && b.doc_number.toLowerCase().includes(q)) ||
      (b.invoice_number && b.invoice_number.toLowerCase().includes(q)) ||
      (b.to_name && b.to_name.toLowerCase().includes(q)) ||
      (b.vehicle_number && b.vehicle_number.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const activeCount = bills.filter((b) => b.status === 'active').length;
  const cancelledCount = bills.filter((b) => b.status === 'cancelled').length;
  const expiredCount = bills.filter((b) => b.status === 'expired').length;
  const pendingCount = pendingInvoices.length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#13A89E] text-white rounded-2xl shadow-md">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-[#172B4D] tracking-tight">
                  E-Way Bill Module
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#13A89E] border border-teal-200">
                  Form GST EWB-01
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Generate official electronic waybills, manage Part-B vehicles, and maintain GST compliance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            API Config
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Create E-Way Bill
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active E-Way Bills</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activeCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Valid for transit</div>
        </div>

        <div
          onClick={() => setFilterStatus('pending')}
          className="bg-white p-5 rounded-2xl border border-teal-100 shadow-xs cursor-pointer hover:border-[#13A89E] transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#13A89E]">Pending Generation</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#13A89E] flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#172B4D]">{pendingCount}</div>
          <div className="text-[11px] text-[#13A89E] font-medium mt-1">
            Invoices &gt; ₹50k requiring E-Way Bill
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Expired</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{expiredCount}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Past validity date</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cancelled</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <X className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{cancelledCount}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Cancelled within 24h</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `All Bills (${bills.length})` },
            { id: 'active', label: `Active (${activeCount})` },
            {
              id: 'pending',
              label: `Pending Generation (${pendingCount})`,
              highlight: pendingCount > 0,
            },
            { id: 'cancelled', label: `Cancelled (${cancelledCount})` },
            { id: 'expired', label: `Expired (${expiredCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-[#13A89E] text-white shadow-xs'
                  : tab.highlight
                  ? 'bg-teal-50 text-[#13A89E] border border-teal-200 hover:bg-teal-100'
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
            placeholder="Search E-Way Bill #, invoice, vehicle..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      {filterStatus === 'pending' ? (
        /* PENDING INVOICES TABLE */
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#13A89E]" />
              <span className="text-xs font-bold text-[#172B4D]">
                Sales Invoices Exceeding ₹50,000 Without E-Way Bill
              </span>
            </div>
            <span className="text-[11px] text-[#13A89E] font-medium">
              Mandatory under Rule 138 of CGST Rules
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Taxable</th>
                  <th className="py-3.5 px-4 text-right">Invoice Total</th>
                  <th className="py-3.5 px-4 text-center">Compliance</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      All invoices exceeding ₹50,000 have active E-Way Bills! Zero pending.
                    </td>
                  </tr>
                ) : (
                  pendingInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{inv.customer_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {inv.customer_gstin ? `GSTIN: ${inv.customer_gstin}` : 'Unregistered (URP)'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{inv.issue_date}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        {formatINR(inv.taxable_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-[#172B4D]">
                        {formatINR(inv.grand_total)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> E-Way Bill Required
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenCreateModal(inv.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-[11px] rounded-lg shadow-xs transition"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Generate E-Way Bill
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MAIN E-WAY BILLS TABLE */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">E-Way Bill #</th>
                  <th className="py-3.5 px-4">Doc / Invoice</th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Vehicle &amp; Distance</th>
                  <th className="py-3.5 px-4 text-right">Value (₹)</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading E-Way Bills...
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No E-Way Bills found. Click "Create E-Way Bill" above to generate one.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => {
                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    );
                    if (b.status === 'cancelled') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <X className="w-3 h-3" /> Cancelled
                        </span>
                      );
                    } else if (b.status === 'expired') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Expired
                        </span>
                      );
                    }

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        {/* EBN */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-extrabold text-slate-900 text-[13px] tracking-wide">
                            {formatEBN(b.eway_bill_number)}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{b.eway_bill_date ? b.eway_bill_date.split(' ')[0] : '—'}</span>
                            <span>•</span>
                            <span className="uppercase text-[#13A89E] font-semibold">
                              {b.generation_method || 'manual'}
                            </span>
                          </div>
                        </td>

                        {/* Doc Number */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            Inv #{b.doc_number || b.invoice_number || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatToNICDate(b.doc_date)}
                          </div>
                        </td>

                        {/* Recipient */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{b.to_name}</div>
                          <div className="text-[11px] text-slate-400">
                            {b.to_place || 'Salem'} ({b.to_pincode})
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800">
                            {b.vehicle_number || (b.transporter_doc_no ? `LR: ${b.transporter_doc_no}` : '—')}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {b.distance_km} KM • Road
                          </div>
                        </td>

                        {/* Value */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-extrabold text-slate-900">
                            {formatINR(b.total_invoice_value)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Tax: {formatINR((b.cgst_amount || 0) + (b.sgst_amount || 0) + (b.igst_amount || 0))}
                          </div>
                        </td>

                        {/* Valid Until */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-700 font-medium text-[11px]">
                            {b.valid_until || '—'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">{statusBadge}</td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewBill(b)}
                              className="p-1.5 text-slate-500 hover:text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                              title="View Form GST EWB-01"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(b)}
                              className="p-1.5 text-slate-500 hover:text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                              title="Download Official PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintPDF(b)}
                              className="p-1.5 text-slate-500 hover:text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                              title="Print E-Way Bill"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {b.status === 'active' && (
                              <>
                                <button
                                  onClick={() => handleOpenVehicleModal(b)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-[#13A89E] font-semibold text-[10px] rounded-md transition"
                                  title="Update Part-B Vehicle"
                                >
                                  Update Veh
                                </button>
                                <button
                                  onClick={() => handleOpenCancelModal(b)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[10px] rounded-md transition"
                                  title="Cancel E-Way Bill"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
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
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE E-WAY BILL                               */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 text-[#13A89E] rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Generate E-Way Bill (Form GST EWB-01)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Auto-fill from Sales Tax Invoice or enter transport details manually
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-6">
              {/* Invoice Selector */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-[#E2E8F0]">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Link Existing Sales Invoice (Auto-Populate Data)
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:border-[#13A89E] focus:outline-none"
                >
                  <option value="">-- Select Sales Invoice or enter manually --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      Invoice #{inv.invoice_number} — {inv.customer_name} (₹{inv.grand_total?.toLocaleString('en-IN')}) dt. {inv.issue_date}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid: Document & Recipient Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Consignor Details (Readonly) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Consignor / From (Al Ameen)
                  </span>
                  <div className="text-xs font-bold text-slate-900">
                    AL AMEEN WELDING WORKS
                  </div>
                  <div className="text-xs text-slate-600 font-mono">
                    GSTIN: {settings?.gstin || '33CRHPD7107H1Z3'}
                  </div>
                  <div className="text-xs text-slate-500">
                    13-A, Omalur Main Road, Salem - 636001 (Tamil Nadu - 33)
                  </div>
                </div>

                {/* Consignee / To Details */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Consignee / To (Customer)
                  </span>
                  <input
                    type="text"
                    value={toName}
                    onChange={(e) => setToName(e.target.value)}
                    placeholder="Recipient / Customer Name *"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-[#13A89E] focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={toGstin}
                      onChange={(e) => setToGstin(e.target.value.toUpperCase())}
                      placeholder="GSTIN (or URP)"
                      className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-[#13A89E] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={toPincode}
                      onChange={(e) => setToPincode(e.target.value)}
                      placeholder="PIN Code (6 digits) *"
                      className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-[#13A89E] focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="Delivery Site Address"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-[#13A89E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Transportation & Vehicle Inputs (Part-B) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  PART - B: Transport &amp; Vehicle Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mode of Transport
                    </label>
                    <select
                      value={transportMode}
                      onChange={(e) => setTransportMode(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-[#13A89E] focus:outline-none"
                    >
                      <option value="1">Road</option>
                      <option value="2">Rail</option>
                      <option value="3">Air</option>
                      <option value="4">Ship</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Approx Distance (KM) *
                    </label>
                    <input
                      type="number"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-[#13A89E] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. TN28AB1234"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold focus:border-[#13A89E] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Vehicle Type
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-[#13A89E] focus:outline-none"
                    >
                      <option value="R">Regular</option>
                      <option value="O">Over Dimensional Cargo (ODC)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Transporter ID / GSTIN
                    </label>
                    <input
                      type="text"
                      value={transporterId}
                      onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                      placeholder="Optional 15-digit TRANSIN"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-[#13A89E] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Transporter Name
                    </label>
                    <input
                      type="text"
                      value={transporterName}
                      onChange={(e) => setTransporterName(e.target.value)}
                      placeholder="e.g. VRL Logistics"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-[#13A89E] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      LR / Transport Doc No.
                    </label>
                    <input
                      type="text"
                      value={transporterDocNo}
                      onChange={(e) => setTransporterDocNo(e.target.value)}
                      placeholder="e.g. LR-9921"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-[#13A89E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Value Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Taxable: </span>
                  <span className="font-bold text-slate-800">{formatINR(totalTaxableAmount)}</span>
                  <span className="text-xs text-slate-400 mx-2">|</span>
                  <span className="text-xs text-slate-500">GST: </span>
                  <span className="font-bold text-slate-800">
                    {formatINR(cgstAmount + sgstAmount + igstAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500">Total Invoice Value: </span>
                  <span className="text-lg font-extrabold text-[#172B4D]">
                    {formatINR(totalInvoiceValue)}
                  </span>
                </div>
              </div>

              {/* Generation Mode Selector */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setCreateMethod('manual')}
                    className={`flex-1 py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-2 ${
                      createMethod === 'manual'
                        ? 'bg-white text-[#13A89E] border-b-2 border-[#13A89E]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
                    Manual Portal Entry / Export JSON (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMethod('api')}
                    className={`flex-1 py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-2 ${
                      createMethod === 'api'
                        ? 'bg-white text-[#13A89E] border-b-2 border-[#13A89E]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Direct GSP / API Generation
                  </button>
                </div>

                <div className="p-5">
                  {createMethod === 'manual' ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="text-xs text-blue-900 font-medium">
                            Generate on official GST Portal (https://ewaybillgst.gov.in/) and record the 12-digit number below
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyNICPayload}
                            className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-bold shadow-xs transition"
                          >
                            {copySuccess ? 'Copied!' : 'Copy Prepared JSON'}
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadNICJSON}
                            className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-bold shadow-xs transition"
                          >
                            Export JSON
                          </button>
                          <a
                            href="https://ewaybillgst.gov.in/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1"
                          >
                            Open Portal <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Official 12-Digit E-Way Bill Number (EBN) *
                          </label>
                          <input
                            type="text"
                            value={manualEbn}
                            onChange={(e) => setManualEbn(e.target.value.replace(/\D/g, ''))}
                            maxLength={12}
                            placeholder="e.g. 121000123456"
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-mono font-bold tracking-wider focus:border-[#13A89E] focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Enter the 12-digit number generated on the government portal
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Valid Until Date &amp; Time *
                          </label>
                          <input
                            type="text"
                            value={manualValidUntil}
                            onChange={(e) => setManualValidUntil(e.target.value)}
                            placeholder="YYYY-MM-DD HH:MM:SS"
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:border-[#13A89E] focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Auto-calculated based on {distanceKm} km (1 day per 200 km)
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-900">
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Direct Government Gateway Integration
                        </div>
                        {settings?.gsp_provider === 'manual' ? (
                          <p>
                            API Credentials are currently set to "Manual". To generate directly via API, please configure your GSP provider and credentials in <strong>API Config</strong>.
                          </p>
                        ) : (
                          <p>
                            Provider: <span className="font-bold uppercase">{settings?.gsp_provider}</span> ({settings?.environment}). Payload will be dispatched to the government gateway.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEWayBill}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : createMethod === 'manual' ? 'Save & Record E-Way Bill' : 'Generate via API Gateway'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: UPDATE PART-B VEHICLE                           */}
      {/* ======================================================== */}
      {showVehicleModal && selectedBillForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update Part-B Vehicle Details
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  EBN: {formatEBN(selectedBillForAction.eway_bill_number)}
                </p>
              </div>
              <button
                onClick={() => setShowVehicleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Vehicle Number *
                </label>
                <input
                  type="text"
                  value={updateVehNumber}
                  onChange={(e) => setUpdateVehNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. TN28AB1234"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:border-[#13A89E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Vehicle Change
                </label>
                <select
                  value={updateReasonCode}
                  onChange={(e) => setUpdateReasonCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
                >
                  <option value="1">1 - Due to Breakdown</option>
                  <option value="2">2 - Due to Transshipment</option>
                  <option value="3">3 - Others (Driver / Route change)</option>
                  <option value="4">4 - First Time (Part-A generated earlier)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  From Place
                </label>
                <input
                  type="text"
                  value={updateFromPlace}
                  onChange={(e) => setUpdateFromPlace(e.target.value)}
                  placeholder="Current transit location (e.g. Salem)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transporter Doc No (LR/RR)
                </label>
                <input
                  type="text"
                  value={updateDocNo}
                  onChange={(e) => setUpdateDocNo(e.target.value)}
                  placeholder="Optional LR number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:border-[#13A89E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  placeholder="Reason remarks"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveVehicleUpdate}
                  className="px-5 py-2 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold rounded-xl shadow-md transition"
                >
                  Save Vehicle Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CANCEL E-WAY BILL                               */}
      {/* ======================================================== */}
      {showCancelModal && selectedBillForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Cancel E-Way Bill #{formatEBN(selectedBillForAction.eway_bill_number)}
              </h3>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-[11px] leading-relaxed">
                <strong>Warning:</strong> Under GST rules, an E-Way Bill can only be cancelled within 24 hours of generation and only if the goods have not already been intercepted in transit.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cancellation Reason Code *
                </label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none"
                >
                  <option value="1">1 - Duplicate E-Way Bill</option>
                  <option value="2">2 - Order Cancelled</option>
                  <option value="3">3 - Data Entry Error</option>
                  <option value="4">4 - Others</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cancellation Remarks
                </label>
                <textarea
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  rows={2}
                  placeholder="Provide brief reason for cancellation..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: VIEW FORM GST EWB-01 PREVIEW                    */}
      {/* ======================================================== */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#13A89E]" />
                <h3 className="text-base font-bold text-slate-900">
                  Form GST EWB-01 Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(viewingBill)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => handlePrintPDF(viewingBill)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewingBill(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Simulated Government Document Paper */}
            <div className="mt-5 p-6 bg-slate-50/60 rounded-2xl border border-slate-200 font-sans text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo.png"
                  alt="Al Ameen Logo"
                  className="w-10 h-10 object-contain shrink-0"
                />
                <div className="text-center flex-1">
                  <div className="text-base font-black text-slate-900 tracking-tight">
                    e-Way Bill (Form GST EWB-01)
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Government of India • Rule 138 of CGST Rules, 2017
                  </div>
                </div>
                <div className="w-10 h-10" />
              </div>

              {/* Box 1 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">e-Way Bill No</span>
                  <div className="text-base font-mono font-black text-slate-900">
                    {formatEBN(viewingBill.eway_bill_number)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Status</span>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {viewingBill.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Generated Date</span>
                  <div className="font-semibold text-slate-800">{viewingBill.eway_bill_date || '—'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Valid Until</span>
                  <div className="font-semibold text-slate-800">{viewingBill.valid_until || '—'}</div>
                </div>
              </div>

              {/* Part A */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 font-bold text-slate-800 text-[11px]">
                  PART - A (Details of Goods &amp; Parties)
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px]">Supplier GSTIN &amp; Name:</span>
                    <div className="font-bold text-slate-800">{viewingBill.from_gstin}</div>
                    <div className="text-slate-600 text-[11px]">{viewingBill.from_name}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">{viewingBill.from_place} - {viewingBill.from_pincode}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Recipient GSTIN &amp; Name:</span>
                    <div className="font-bold text-slate-800">{viewingBill.to_gstin || 'URP'}</div>
                    <div className="text-slate-600 text-[11px]">{viewingBill.to_name}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">{viewingBill.to_place} - {viewingBill.to_pincode}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Tax Invoice Number &amp; Date:</span>
                    <div className="font-bold text-slate-800">#{viewingBill.doc_number || viewingBill.invoice_number}</div>
                    <div className="text-slate-500 text-[11px]">{viewingBill.doc_date}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Total Invoice Value:</span>
                    <div className="text-sm font-extrabold text-[#172B4D]">
                      {formatINR(viewingBill.total_invoice_value)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Part B */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 font-bold text-slate-800 text-[11px]">
                  PART - B (Vehicle &amp; Transport Details)
                </div>
                <div className="p-4 grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px]">Vehicle Number:</span>
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {viewingBill.vehicle_number || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Transport Mode:</span>
                    <div className="font-semibold text-slate-800">Road</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Approx Distance:</span>
                    <div className="font-semibold text-slate-800">{viewingBill.distance_km} KM</div>
                  </div>
                  {viewingBill.transporter_name && (
                    <div className="col-span-3 text-[11px] text-slate-500">
                      Transporter: {viewingBill.transporter_name} ({viewingBill.transporter_id || '—'})
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: SETTINGS / API CONFIGURATION                    */}
      {/* ======================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#13A89E]" />
                <h3 className="text-base font-bold text-slate-900">
                  E-Way Bill Settings &amp; API Configuration
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Integration Mode
                  </label>
                  <select
                    value={settingsForm.gsp_provider}
                    onChange={(e) => setSettingsForm({ ...settingsForm, gsp_provider: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
                  >
                    <option value="manual">Manual Portal Entry / NIC JSON (Default)</option>
                    <option value="sandbox">Sandbox Test API Gateway</option>
                    <option value="nic_direct">Direct NIC Government API</option>
                    <option value="cleartax">ClearTax GSP</option>
                    <option value="mastersindia">Masters India GSP</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Environment
                  </label>
                  <select
                    value={settingsForm.environment}
                    onChange={(e) => setSettingsForm({ ...settingsForm, environment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
                  >
                    <option value="sandbox">Sandbox / Testing</option>
                    <option value="production">Production Live Gateway</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  GSP / Government Credentials (Optional)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">API Username</label>
                    <input
                      type="text"
                      value={settingsForm.api_username || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, api_username: e.target.value })}
                      placeholder="GSP Username"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">API Password</label>
                    <input
                      type="password"
                      value={settingsForm.api_password || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, api_password: e.target.value })}
                      placeholder="GSP Password"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Client ID</label>
                    <input
                      type="text"
                      value={settingsForm.client_id || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, client_id: e.target.value })}
                      placeholder="OAuth Client ID"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={settingsForm.client_secret || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, client_secret: e.target.value })}
                      placeholder="OAuth Client Secret"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Default Dispatch &amp; Vehicle Settings
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Registered GSTIN</label>
                    <input
                      type="text"
                      value={settingsForm.gstin || '33CRHPD7107H1Z3'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Default Vehicle Number</label>
                    <input
                      type="text"
                      value={settingsForm.default_vehicle_number || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_vehicle_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. TN28AB1234"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Default Dispatch Place</label>
                    <input
                      type="text"
                      value={settingsForm.default_from_place || 'Salem'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_from_place: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Default PIN Code</label>
                    <input
                      type="text"
                      value={settingsForm.default_from_pincode || '636001'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_from_pincode: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold rounded-xl shadow-md transition"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
