'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Package,
  Wrench,
  Layers,
  Ruler,
  CheckCircle,
  X,
  History,
  Edit2,
  Trash2,
  Tag,
  DollarSign,
  TrendingDown,
  Building2,
  Users,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';

interface PartyPrice {
  customer_id: string;
  customer_name?: string;
  price: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service' | 'low_stock'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Stock Adjustment State
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Item Form State (MyBillBook style)
  const [activeModalTab, setActiveModalTab] = useState<'pricing' | 'stock' | 'other' | 'party_prices'>('pricing');
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [hsnCode, setHsnCode] = useState('7308');
  const [sacCode, setSacCode] = useState('998719');
  const [unit, setUnit] = useState('Piece');
  const [brand, setBrand] = useState('Al Ameen');
  const [description, setDescription] = useState('');

  // Pricing Tab
  const [salesPrice, setSellingPrice] = useState<number>(0);
  const [salesTaxType, setSalesTaxType] = useState<'without_tax' | 'with_tax'>('without_tax');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [purchaseTaxType, setPurchaseTaxType] = useState<'without_tax' | 'with_tax'>('without_tax');
  const [gstRate, setGstRate] = useState<number>(18);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');

  // Stock Tab
  const [trackStock, setTrackStock] = useState<boolean>(true);
  const [openingStock, setOpeningStock] = useState<number>(10);
  const [openingStockDate, setOpeningStockDate] = useState<string>('2026-11-08');
  const [minStockAlert, setMinStockAlert] = useState<number>(5);

  // Other Details Tab
  const [isMeasurementBased, setIsMeasurementBased] = useState(false);
  const [ratePerSqFt, setRatePerSqFt] = useState(250);

  // Party-Wise Prices Tab
  const [partyPrices, setPartyPrices] = useState<PartyPrice[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customPartyPrice, setCustomPartyPrice] = useState<number>(0);

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes, meRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/customers'),
        fetch('/api/auth/me').catch(() => null),
      ]);
      const [prodData, custData] = await Promise.all([
        prodRes.json(),
        custRes.json(),
      ]);

      if (meRes && meRes.ok) {
        const meData = await meRes.json();
        if (meData?.authenticated) setCurrentUser(meData.user);
      }

      if (prodData.success) {
        setProducts(prodData.data || []);
        setCategories(prodData.categories || []);
      }
      if (custData.success) {
        setCustomers(custData.data || []);
        if (custData.data?.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custData.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset Item Form
  const resetItemForm = (type: 'product' | 'service' = 'product') => {
    setEditingItem(null);
    setItemType(type);
    setName('');
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setSku(type === 'product' ? `RS-PRD-${Math.floor(100 + Math.random() * 900)}` : `SRV-${Math.floor(100 + Math.random() * 900)}`);
    setHsnCode('7308');
    setSacCode('998719');
    setUnit(type === 'product' ? 'Piece' : 'Service');
    setBrand('Al Ameen');
    setDescription('');

    setSellingPrice(0);
    setSalesTaxType('without_tax');
    setPurchasePrice(0);
    setPurchaseTaxType('without_tax');
    setGstRate(18);
    setDiscountValue(0);
    setDiscountType('percentage');

    setTrackStock(type === 'product');
    setOpeningStock(type === 'product' ? 10 : 0);
    setOpeningStockDate(new Date().toISOString().split('T')[0]);
    setMinStockAlert(type === 'product' ? 5 : 0);

    setIsMeasurementBased(false);
    setRatePerSqFt(250);

    setPartyPrices([]);
    setCustomPartyPrice(0);
    setActiveModalTab('pricing');
  };

  const handleOpenAddModal = (type: 'product' | 'service' = 'product') => {
    resetItemForm(type);
    setShowItemModal(true);
  };

  const handleOpenEditModal = async (prod: any) => {
    try {
      setEditingItem(prod);
      const res = await fetch(`/api/products/${prod.id}`);
      const data = await res.json();
      const p = data.success ? data.data : prod;

      setItemType(p.item_type || 'product');
      setName(p.name || '');
      setCategoryId(p.category_id || (categories.length > 0 ? categories[0].id : ''));
      setSku(p.sku || '');
      setHsnCode(p.hsn_code || '7308');
      setSacCode(p.sac_code || '998719');
      setUnit(p.unit || (p.item_type === 'service' ? 'Service' : 'Piece'));
      setBrand(p.brand || 'Al Ameen');
      setDescription(p.description || '');

      setSellingPrice(p.selling_price || 0);
      setSalesTaxType(p.tax_type || 'without_tax');
      setPurchasePrice(p.purchase_price || 0);
      setGstRate(p.gst_rate ?? 18);
      setDiscountValue(p.discount_value || 0);
      setDiscountType(p.discount_type || 'percentage');

      setTrackStock(p.track_stock !== 0 && p.item_type !== 'service');
      setOpeningStock(p.opening_stock || 0);
      setMinStockAlert(p.min_stock_alert ?? 5);

      setIsMeasurementBased(p.is_measurement_based === 1);
      setRatePerSqFt(p.rate_per_sqft || 250);

      setPartyPrices(p.party_prices || []);
      setActiveModalTab('pricing');
      setShowItemModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (p: any) => {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: p.is_active === 0 ? 1 : 0 }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDeleteItem = async (p: any) => {
    if (!confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert('Delete failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddPartyPrice = () => {
    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }
    if (customPartyPrice <= 0) {
      alert('Please enter a valid price for this customer');
      return;
    }
    const cust = customers.find((c) => c.id === selectedCustomerId);
    const existingIndex = partyPrices.findIndex((pp) => pp.customer_id === selectedCustomerId);

    if (existingIndex >= 0) {
      const updated = [...partyPrices];
      updated[existingIndex].price = customPartyPrice;
      setPartyPrices(updated);
    } else {
      setPartyPrices([
        ...partyPrices,
        {
          customer_id: selectedCustomerId,
          customer_name: cust ? cust.name : 'Customer',
          price: customPartyPrice,
        },
      ]);
    }
    setCustomPartyPrice(0);
  };

  const handleRemovePartyPrice = (customerId: string) => {
    setPartyPrices(partyPrices.filter((pp) => pp.customer_id !== customerId));
  };

  const handleCreateNewCategory = async () => {
    if (!newCatName.trim()) {
      alert('Please enter a category name');
      return;
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories([...categories, data.data]);
        setCategoryId(data.data.id);
        setShowNewCatModal(false);
        setNewCatName('');
        setNewCatDesc('');
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSaveItem = async (saveAndNew = false) => {
    if (!name.trim()) {
      alert('Please enter the Item Name (Required)');
      return;
    }

    const payload = {
      item_type: itemType,
      name: name.trim(),
      category_id: categoryId || null,
      sku: sku.trim(),
      hsn_code: itemType === 'service' ? (sacCode.trim() || '998719') : (hsnCode.trim() || '7308'),
      sac_code: itemType === 'service' ? (sacCode.trim() || '998719') : '',
      unit,
      brand: brand.trim(),
      description: description.trim(),
      selling_price: Number(salesPrice) || 0,
      tax_type: salesTaxType,
      purchase_price: itemType === 'service' ? 0 : Number(purchasePrice) || 0,
      gst_rate: Number(gstRate) || 0,
      discount_value: Number(discountValue) || 0,
      discount_type: discountType,
      track_stock: itemType === 'product' && trackStock ? 1 : 0,
      opening_stock: itemType === 'product' && trackStock ? Number(openingStock) || 0 : 0,
      current_stock: editingItem ? editingItem.current_stock : (itemType === 'product' && trackStock ? Number(openingStock) || 0 : 0),
      min_stock_alert: itemType === 'product' && trackStock ? Number(minStockAlert) || 0 : 0,
      is_measurement_based: isMeasurementBased ? 1 : 0,
      rate_per_sqft: Number(ratePerSqFt) || 0,
      party_prices: partyPrices,
    };

    try {
      const url = editingItem ? `/api/products/${editingItem.id}` : '/api/products';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (saveAndNew) {
          resetItemForm(itemType);
        } else {
          setShowItemModal(false);
        }
      } else {
        alert('Failed to save item: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Stock Adjustment Handler
  const handleOpenStockModal = (prod: any) => {
    setSelectedProduct(prod);
    setAdjustQty(10);
    setAdjustType('in');
    setAdjustNotes('');
    setShowStockModal(true);
  };

  const handleSaveStockAdjustment = async () => {
    if (!selectedProduct) return;
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: adjustQty,
          type: adjustType,
          notes: adjustNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowStockModal(false);
        fetchData();
      } else {
        alert('Stock update failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // Compute Filtered Items
  const filteredItems = products.filter((p) => {
    // Type Filter
    if (typeFilter === 'product' && p.item_type === 'service') return false;
    if (typeFilter === 'service' && p.item_type !== 'service') return false;
    if (typeFilter === 'low_stock') {
      if (p.item_type === 'service') return false;
      if (p.current_stock > p.min_stock_alert) return false;
    }

    // Category Filter
    if (activeCategory !== 'all' && p.category_id !== activeCategory) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      const matchHsn = p.hsn_code?.toLowerCase().includes(q);
      const matchBrand = p.brand?.toLowerCase().includes(q);
      const matchCat = p.category_name?.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchHsn && !matchBrand && !matchCat) return false;
    }
    return true;
  });

  // Metrics
  const totalProducts = products.filter((p) => p.item_type !== 'service');
  const totalServices = products.filter((p) => p.item_type === 'service');
  const lowStockCount = totalProducts.filter((p) => p.current_stock <= p.min_stock_alert).length;
  const inventoryStockValue = totalProducts.reduce((acc, p) => acc + (p.current_stock * (p.purchase_price || p.selling_price || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-teal-50 text-[#13A89E] rounded-2xl">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Products & Services
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                MyBillBook-style catalog management, party-wise pricing, and live stock tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => handleOpenAddModal('service')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition"
          >
            <Wrench className="w-4 h-4" />
            + Add Service
          </button>
          <button
            onClick={() => handleOpenAddModal('product')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            + Add Product
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Items</span>
            <div className="p-1.5 bg-teal-50 text-[#13A89E] rounded-lg">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{products.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalProducts.length} Products • {totalServices.length} Services
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Inventory Stock Value</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">
            {formatINR(inventoryStockValue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Estimated at cost/selling value</div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Services</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-700 mt-2">{totalServices.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Zero stock deduction on billing</div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Low Stock Alerts</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold mt-2 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {lowStockCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Items at or below alert limit</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Search */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Segmented Type Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'all', label: `All Items (${products.length})` },
              { id: 'product', label: `Products (${totalProducts.length})` },
              { id: 'service', label: `Services (${totalServices.length})` },
              { id: 'low_stock', label: `Low Stock (${lowStockCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                  typeFilter === tab.id
                    ? 'bg-white text-[#13A89E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Item name, SKU, HSN, Brand..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl focus:border-[#13A89E] focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 shadow-xs font-medium"
            />
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
              activeCategory === 'all'
                ? 'bg-[#13A89E] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                activeCategory === c.id
                  ? 'bg-[#13A89E] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Items Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Item Details</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">HSN / SAC</th>
                <th className="py-3.5 px-3">Unit</th>
                <th className="py-3.5 px-3 text-right">Purchase Rate</th>
                <th className="py-3.5 px-4 text-right">Selling Rate</th>
                <th className="py-3.5 px-3 text-center">Stock</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#13A89E] border-t-transparent rounded-full animate-spin" />
                      Loading catalog items...
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((p) => {
                  const isService = p.item_type === 'service';
                  const isLow = !isService && p.current_stock <= p.min_stock_alert;
                  const isActive = p.is_active !== 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition ${!isActive ? 'opacity-50 bg-slate-50/40' : ''}`}
                    >
                      {/* Name & Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${isService ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-[#13A89E]'}`}>
                            {isService ? <Wrench className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {p.name}
                              {p.brand && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                                  {p.brand}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                              <span>SKU: {p.sku || '-'}</span>
                              {p.party_prices?.length > 0 && (
                                <span className="text-[#13A89E] font-bold">
                                  • {p.party_prices.length} Party Price{p.party_prices.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                          isService
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-teal-50 text-[#13A89E]'
                        }`}>
                          {p.item_type || 'Product'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {p.category_name || 'Standard'}
                        </span>
                      </td>

                      {/* HSN / SAC */}
                      <td className="py-3.5 px-3 text-slate-600 font-mono font-medium">
                        {p.sac_code || p.hsn_code || '-'}
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-3 text-slate-700 font-medium">{p.unit}</td>

                      {/* Purchase Price */}
                      <td className="py-3.5 px-3 text-right text-slate-600 font-medium">
                        {isService ? '-' : formatINR(p.purchase_price)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-extrabold text-slate-900">
                          {p.is_measurement_based ? `${formatINR(p.rate_per_sqft)}/sqft` : formatINR(p.selling_price)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.tax_type === 'with_tax' ? 'Incl. GST' : `+${p.gst_rate || 18}% GST`}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-3 text-center">
                        {isService ? (
                          <span className="text-[11px] text-slate-400 font-medium italic">N/A (Service)</span>
                        ) : p.track_stock === 0 ? (
                          <span className="text-[11px] text-slate-400 font-medium italic">Not Tracked</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold">
                            <span className={isLow ? 'text-amber-600 font-black' : 'text-slate-800'}>
                              {p.current_stock} {p.unit}
                            </span>
                            {isLow && (
                              <span title="Low Stock Alert" className="text-amber-500">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          title={isActive ? 'Click to Disable' : 'Click to Enable'}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isService && p.track_stock !== 0 && (
                            <button
                              onClick={() => handleOpenStockModal(p)}
                              title="Stock In / Out Adjustment"
                              className="p-1.5 bg-teal-50 hover:bg-teal-100 text-[#13A89E] rounded-lg transition"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Item Details"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role !== 'cashier' && (
                            <button
                              onClick={() => handleDeleteItem(p)}
                              title="Delete Item"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* ======================================================== */}
      {/* MYBILLBOOK STYLE CREATE / EDIT NEW ITEM MODAL             */}
      {/* ======================================================== */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header with Segmented Item Type */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${itemType === 'service' ? 'bg-blue-100 text-blue-700' : 'bg-teal-50 text-[#13A89E]'}`}>
                  {itemType === 'service' ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingItem ? 'Edit Item' : 'Create New Item'}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {itemType === 'service' ? 'Service / Labor / AMC' : 'Physical Product / Component'}
                  </div>
                </div>
              </div>

              {/* Segmented Button (Product / Service) */}
              <div className="flex items-center bg-slate-200 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setItemType('product');
                    setUnit('Piece');
                    setTrackStock(true);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                    itemType === 'product'
                      ? 'bg-[#13A89E] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemType('service');
                    setUnit('Service');
                    setTrackStock(false);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                    itemType === 'service'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Service
                </button>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="ml-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Primary Name, Code, and Category */}
              <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={itemType === 'service' ? 'e.g. Shutter Motor Installation & Wiring' : 'e.g. Automatic Center Motor 600kg'}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:border-[#13A89E] focus:outline-none shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category with Inline Add Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-600">Category:</label>
                      <button
                        type="button"
                        onClick={() => setShowNewCatModal(true)}
                        className="text-[11px] text-[#13A89E] hover:text-[#0E8A81] font-bold"
                      >
                        + Add Category
                      </button>
                    </div>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="">Select Category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* HSN / SAC Code */}
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      {itemType === 'service' ? 'SAC Code:' : 'HSN Code:'}
                    </label>
                    <input
                      type="text"
                      value={itemType === 'service' ? sacCode : hsnCode}
                      onChange={(e) => {
                        if (itemType === 'service') setSacCode(e.target.value);
                        else setHsnCode(e.target.value);
                      }}
                      placeholder={itemType === 'service' ? '998719' : '7308'}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-medium"
                    />
                    {/* Quick suggestion chips */}
                    <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Quick:</span>
                      {(itemType === 'service'
                        ? ['998719', '998729', '995469', '998314']
                        : ['7308', '8501', '8526', '7326', '8479']
                      ).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            if (itemType === 'service') setSacCode(code);
                            else setHsnCode(code);
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-teal-100 hover:text-[#13A89E] text-[10px] font-mono transition"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* MyBillBook Form Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                {[
                  { id: 'pricing', label: '1. Pricing & Tax', icon: DollarSign },
                  ...(itemType === 'product' ? [{ id: 'stock', label: '2. Stock & Inventory', icon: Layers }] : []),
                  { id: 'other', label: itemType === 'product' ? '3. Other Details' : '2. Other Details', icon: Info },
                  { id: 'party_prices', label: 'Party-Wise Prices', icon: Users },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveModalTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                        activeModalTab === tab.id
                          ? 'bg-[#13A89E] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Pricing */}
              {activeModalTab === 'pricing' && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary Unit */}
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Unit:</label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                      >
                        {itemType === 'service' ? (
                          <>
                            <option value="Service">Service</option>
                            <option value="Job">Job</option>
                            <option value="Hours">Hours</option>
                            <option value="Visits">Visits</option>
                            <option value="Days">Days</option>
                            <option value="Nos">Nos</option>
                            <option value="Square Feet">Square Feet</option>
                          </>
                        ) : (
                          <>
                            <option value="Piece">Piece (PCS)</option>
                            <option value="Set">Set</option>
                            <option value="Nos">Nos</option>
                            <option value="Meter">Meter (MTR)</option>
                            <option value="Square Feet">Square Feet (SQFT)</option>
                            <option value="Kg">Kg</option>
                            <option value="Box">Box</option>
                            <option value="Pair">Pair</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* GST Rate */}
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">GST Tax Rate:</label>
                      <select
                        value={gstRate}
                        onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                      >
                        <option value={0}>0% (Tax Exempt / Nil)</option>
                        <option value={5}>5% GST (2.5% CGST + 2.5% SGST)</option>
                        <option value={12}>12% GST (6% CGST + 6% SGST)</option>
                        <option value={18}>18% GST (9% CGST + 9% SGST) - Standard</option>
                        <option value={28}>28% GST (14% CGST + 14% SGST)</option>
                      </select>
                    </div>

                    {/* Sales Price */}
                    <div className="p-3 bg-teal-50/40 rounded-2xl border border-teal-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#172B4D]">Sales Price (₹):</label>
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-teal-200">
                          <button
                            type="button"
                            onClick={() => setSalesTaxType('without_tax')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              salesTaxType === 'without_tax' ? 'bg-[#13A89E] text-white' : 'text-slate-600'
                            }`}
                          >
                            Without Tax
                          </button>
                          <button
                            type="button"
                            onClick={() => setSalesTaxType('with_tax')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              salesTaxType === 'with_tax' ? 'bg-[#13A89E] text-white' : 'text-slate-600'
                            }`}
                          >
                            With Tax
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={salesPrice}
                        onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl font-black text-[#172B4D] text-base"
                      />
                    </div>

                    {/* Purchase Price (Products only) */}
                    {itemType === 'product' && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-800">Purchase Cost (₹):</label>
                          <span className="text-[10px] text-slate-400 font-semibold">Excl. GST</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-base"
                        />
                      </div>
                    )}

                    {/* Discount on Sales Price */}
                    <div className="sm:col-span-2 flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <div className="font-bold text-slate-800">Discount on Sales Price:</div>
                        <div className="text-[11px] text-slate-400">Default trade discount applied to this item</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                          className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-right"
                        />
                        <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setDiscountType('percentage')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              discountType === 'percentage' ? 'bg-[#13A89E] text-white' : 'text-slate-600'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType('amount')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              discountType === 'amount' ? 'bg-[#13A89E] text-white' : 'text-slate-600'
                            }`}
                          >
                            ₹
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Stock (Products only) */}
              {activeModalTab === 'stock' && itemType === 'product' && (
                <div className="space-y-4 pt-1">
                  {/* Track Stock Switch */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-900">Track Inventory Stock</div>
                      <div className="text-[11px] text-slate-400">Deduct warehouse inventory automatically when billed</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trackStock}
                        onChange={(e) => setTrackStock(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#13A89E]" />
                    </label>
                  </div>

                  {trackStock && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Opening Stock ({unit}):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={openingStock}
                          onChange={(e) => setOpeningStock(parseFloat(e.target.value) || 0)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">As of Date:</label>
                        <input
                          type="date"
                          value={openingStockDate}
                          onChange={(e) => setOpeningStockDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Low Stock Warning Alert ({unit}):
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={minStockAlert}
                          onChange={(e) => setMinStockAlert(parseFloat(e.target.value) || 0)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-amber-700"
                        />
                      </div>

                      {editingItem && (
                        <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 flex flex-col justify-center">
                          <span className="text-[11px] font-semibold text-[#13A89E]">Current Stock in Warehouse:</span>
                          <span className="text-xl font-black text-[#172B4D] mt-0.5">
                            {editingItem.current_stock} {unit}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Other Details */}
              {activeModalTab === 'other' && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-600">SKU / Item Code:</label>
                        <button
                          type="button"
                          onClick={() => setSku(`ALM-${Math.floor(1000 + Math.random() * 9000)}`)}
                          className="text-[10px] text-[#13A89E] hover:text-[#0E8A81] font-bold"
                        >
                          Auto-Generate
                        </button>
                      </div>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g. MOT-CTR-600"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Brand Name:</label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g. Al Ameen, Somfy, BFT, Tata"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-600 mb-1">Item Description / Scope:</label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detailed specifications, technical features, or scope of service..."
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>

                    {/* Measurement-Based for Rolling Shutter Curtains */}
                    {itemType === 'product' && (
                      <div className="sm:col-span-2 p-3 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="modalIsMeas"
                            checked={isMeasurementBased}
                            onChange={(e) => setIsMeasurementBased(e.target.checked)}
                            className="w-4 h-4 text-[#13A89E] rounded"
                          />
                          <label htmlFor="modalIsMeas" className="font-bold text-[#172B4D] cursor-pointer">
                            Is Measurement-Based Rolling Shutter (Billed by Square Feet)
                          </label>
                        </div>
                        {isMeasurementBased && (
                          <div className="pt-1">
                            <label className="block font-semibold text-[#172B4D] mb-1">
                              Rate Per Square Feet (₹):
                            </label>
                            <input
                              type="number"
                              value={ratePerSqFt}
                              onChange={(e) => setRatePerSqFt(parseFloat(e.target.value) || 0)}
                              className="w-full px-3.5 py-2 bg-white border border-teal-200 rounded-xl font-black text-[#172B4D]"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Party-Wise Prices */}
              {activeModalTab === 'party_prices' && (
                <div className="space-y-4 pt-1">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">Set Custom Selling Price for Specific Customer</div>
                    <p className="text-[11px] text-slate-500">
                      When creating a quotation or invoice for this customer, their custom price will automatically populate.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={customPartyPrice || ''}
                            onChange={(e) => setCustomPartyPrice(parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                            className="w-28 pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddPartyPrice}
                          className="px-4 py-2 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold rounded-xl transition"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Existing Party Prices Table */}
                  <div className="space-y-2">
                    <div className="font-bold text-slate-800">Customer Price Overrides ({partyPrices.length}):</div>
                    {partyPrices.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        No customer-specific prices set. Standard selling price will apply to all parties.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {partyPrices.map((pp) => (
                          <div
                            key={pp.customer_id}
                            className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[#13A89E]" />
                              <span className="font-bold text-slate-800">{pp.customer_name || pp.customer_id}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-[#172B4D] text-sm">
                                {formatINR(pp.price)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemovePartyPrice(pp.customer_id)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {!editingItem && (
                  <button
                    type="button"
                    onClick={() => handleSaveItem(true)}
                    className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-[#13A89E] font-bold text-xs rounded-xl border border-teal-200 transition"
                  >
                    Save & New
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveItem(false)}
                  className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  {editingItem ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK ADD CATEGORY MODAL                                 */}
      {/* ======================================================== */}
      {showNewCatModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">Create New Category</h4>
              <button onClick={() => setShowNewCatModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Category Name:</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Sliding Gate Hardware"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Description (Optional):</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowNewCatModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewCategory}
                className="px-4 py-1.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STOCK ADJUSTMENT MODAL                                    */}
      {/* ======================================================== */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-[#13A89E]" />
                <h3 className="font-bold text-slate-900 text-base">Adjust Inventory Stock</h3>
              </div>
              <button onClick={() => setShowStockModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-500">Selected Product:</span>
                <div className="font-bold text-slate-800 text-sm">{selectedProduct.name}</div>
                <div className="text-[#13A89E] font-semibold mt-0.5">
                  Current In Stock: {selectedProduct.current_stock} {selectedProduct.unit}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Movement Type:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'in', label: 'Stock In (+)' },
                    { id: 'out', label: 'Stock Out (-)' },
                    { id: 'adjustment', label: 'Set Exact' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAdjustType(t.id as any)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        adjustType === t.id
                          ? 'bg-[#13A89E] text-white border-[#13A89E]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Quantity ({selectedProduct.unit}):
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reason / Notes:</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Workshop production intake, physical stock audit"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowStockModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStockAdjustment}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md"
              >
                Save Stock Movement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
