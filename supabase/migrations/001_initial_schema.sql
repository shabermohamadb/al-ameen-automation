-- ====================================================================
-- AL AMEEN AUTOMATION: PRODUCTION POSTGRESQL SCHEMA (SUPABASE COMPATIBLE)
-- Rolling Shutter Manufacturing & Billing Web Application
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    category TEXT DEFAULT 'Rolling Shutter Manufacturing & Automation',
    address TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Tamil Nadu',
    state_code TEXT NOT NULL DEFAULT '33',
    phone1 TEXT NOT NULL,
    phone2 TEXT,
    email TEXT,
    gstin TEXT,
    logo_url TEXT,
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Business Settings Table
CREATE TABLE IF NOT EXISTS business_settings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_prefix TEXT DEFAULT 'SI-',
    quotation_prefix TEXT DEFAULT 'QT-',
    purchase_prefix TEXT DEFAULT 'PI-',
    job_prefix TEXT DEFAULT 'JB-',
    payment_prefix TEXT DEFAULT 'RCP-',
    default_gst_rate NUMERIC(5,2) DEFAULT 18.00,
    default_terms TEXT DEFAULT '1. 50% advance along with confirmed order.\n2. Balance payment on delivery/installation.\n3. Goods once sold will not be taken back.\n4. Warranty 1 year for automation motors against manufacturing defects.',
    next_invoice_number INT DEFAULT 1,
    next_quotation_number INT DEFAULT 1,
    bank_name TEXT,
    bank_branch TEXT,
    account_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    upi_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Business Members Table
CREATE TABLE IF NOT EXISTS business_members (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, user_id)
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    email TEXT,
    address TEXT NOT NULL,
    state TEXT DEFAULT 'Tamil Nadu',
    state_code TEXT DEFAULT '33',
    gstin TEXT,
    opening_balance NUMERIC(12,2) DEFAULT 0.00,
    current_balance NUMERIC(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    gstin TEXT,
    balance NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    hsn_code TEXT DEFAULT '7308',
    sac_code TEXT,
    brand TEXT,
    item_type TEXT DEFAULT 'product' CHECK (item_type IN ('product', 'service')),
    tax_type TEXT DEFAULT 'without_tax' CHECK (tax_type IN ('without_tax', 'with_tax')),
    discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'amount')),
    discount_value NUMERIC(10,2) DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'Piece',
    purchase_price NUMERIC(12,2) DEFAULT 0.00,
    selling_price NUMERIC(12,2) DEFAULT 0.00,
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    opening_stock NUMERIC(10,2) DEFAULT 0.00,
    current_stock NUMERIC(10,2) DEFAULT 0.00,
    min_stock_alert NUMERIC(10,2) DEFAULT 5.00,
    track_stock BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_measurement_based BOOLEAN DEFAULT false,
    rate_per_sqft NUMERIC(10,2) DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
    quantity NUMERIC(10,2) NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    quotation_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    site_address TEXT,
    validity_date DATE,
    subtotal NUMERIC(12,2) DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    taxable_amount NUMERIC(12,2) DEFAULT 0.00,
    cgst NUMERIC(12,2) DEFAULT 0.00,
    sgst NUMERIC(12,2) DEFAULT 0.00,
    igst NUMERIC(12,2) DEFAULT 0.00,
    total_tax NUMERIC(12,2) DEFAULT 0.00,
    installation_charges NUMERIC(12,2) DEFAULT 0.00,
    transport_charges NUMERIC(12,2) DEFAULT 0.00,
    other_charges NUMERIC(12,2) DEFAULT 0.00,
    grand_total NUMERIC(12,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted')),
    terms TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Quotation Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    item_type TEXT DEFAULT 'standard',
    hsn_code TEXT DEFAULT '7308',
    description TEXT NOT NULL,
    width NUMERIC(8,2) DEFAULT 0.00,
    height NUMERIC(8,2) DEFAULT 0.00,
    measurement_unit TEXT DEFAULT 'Feet',
    width_ft NUMERIC(8,3) DEFAULT 0.000,
    height_ft NUMERIC(8,3) DEFAULT 0.000,
    area_sqft NUMERIC(10,3) DEFAULT 0.000,
    rate_per_sqft NUMERIC(10,2) DEFAULT 0.00,
    quantity NUMERIC(10,2) DEFAULT 1.00,
    unit_price NUMERIC(12,2) DEFAULT 0.00,
    material_charges NUMERIC(12,2) DEFAULT 0.00,
    motor_charges NUMERIC(12,2) DEFAULT 0.00,
    spring_charges NUMERIC(12,2) DEFAULT 0.00,
    gearbox_charges NUMERIC(12,2) DEFAULT 0.00,
    installation_charges NUMERIC(12,2) DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    taxable_amount NUMERIC(12,2) DEFAULT 0.00,
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00
);

-- 13. Sales Invoices Table
CREATE TABLE IF NOT EXISTS sales_invoices (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    quotation_id TEXT REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_type TEXT DEFAULT 'tax_invoice' CHECK (invoice_type IN ('tax_invoice', 'proforma', 'challan')),
    issue_date DATE NOT NULL,
    due_date DATE,
    site_address TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    taxable_amount NUMERIC(12,2) DEFAULT 0.00,
    is_interstate BOOLEAN DEFAULT false,
    cgst NUMERIC(12,2) DEFAULT 0.00,
    sgst NUMERIC(12,2) DEFAULT 0.00,
    igst NUMERIC(12,2) DEFAULT 0.00,
    total_tax NUMERIC(12,2) DEFAULT 0.00,
    installation_charges NUMERIC(12,2) DEFAULT 0.00,
    transport_charges NUMERIC(12,2) DEFAULT 0.00,
    other_charges NUMERIC(12,2) DEFAULT 0.00,
    grand_total NUMERIC(12,2) DEFAULT 0.00,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    balance_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    terms TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Sales Invoice Items Table
CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    invoice_id TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    item_type TEXT DEFAULT 'standard',
    description TEXT NOT NULL,
    hsn_code TEXT DEFAULT '7308',
    width NUMERIC(8,2) DEFAULT 0.00,
    height NUMERIC(8,2) DEFAULT 0.00,
    measurement_unit TEXT DEFAULT 'Feet',
    width_ft NUMERIC(8,3) DEFAULT 0.000,
    height_ft NUMERIC(8,3) DEFAULT 0.000,
    area_sqft NUMERIC(10,3) DEFAULT 0.000,
    rate_per_sqft NUMERIC(10,2) DEFAULT 0.00,
    quantity NUMERIC(10,2) DEFAULT 1.00,
    unit_price NUMERIC(12,2) DEFAULT 0.00,
    material_charges NUMERIC(12,2) DEFAULT 0.00,
    motor_charges NUMERIC(12,2) DEFAULT 0.00,
    spring_charges NUMERIC(12,2) DEFAULT 0.00,
    gearbox_charges NUMERIC(12,2) DEFAULT 0.00,
    installation_charges NUMERIC(12,2) DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    taxable_amount NUMERIC(12,2) DEFAULT 0.00,
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    cgst_amount NUMERIC(12,2) DEFAULT 0.00,
    sgst_amount NUMERIC(12,2) DEFAULT 0.00,
    igst_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00
);

-- 15. Purchase Invoices Table
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    purchase_number TEXT NOT NULL,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal NUMERIC(12,2) DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    grand_total NUMERIC(12,2) DEFAULT 0.00,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    balance_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Purchase Items Table
CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    purchase_id TEXT NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    total_amount NUMERIC(12,2) NOT NULL
);

-- 17. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    payment_number TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'supplier')),
    entity_id TEXT NOT NULL,
    invoice_id TEXT,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque')),
    reference_number TEXT,
    notes TEXT,
    payment_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    expense_number TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Material Expenses', 'Labour Expenses', 'Transportation', 'Electricity', 'Workshop Expenses', 'Installation Expenses', 'Other Expenses')),
    title TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'Cash',
    expense_date DATE NOT NULL,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Manufacturing Jobs Table
CREATE TABLE IF NOT EXISTS manufacturing_jobs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    job_number TEXT NOT NULL,
    quotation_id TEXT REFERENCES quotations(id) ON DELETE SET NULL,
    invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    shutter_type TEXT NOT NULL,
    material_type TEXT,
    width NUMERIC(8,2) DEFAULT 0.00,
    height NUMERIC(8,2) DEFAULT 0.00,
    area_sqft NUMERIC(10,3) DEFAULT 0.000,
    site_address TEXT NOT NULL,
    assigned_staff TEXT,
    start_date DATE,
    expected_completion_date DATE,
    manufacturing_cost NUMERIC(12,2) DEFAULT 0.00,
    installation_cost NUMERIC(12,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'New Order' CHECK (status IN (
        'New Order',
        'Quotation Approved',
        'Materials Pending',
        'Manufacturing',
        'Ready for Installation',
        'Installation Completed',
        'Delivered',
        'Cancelled'
    )),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Manufacturing Materials Table
CREATE TABLE IF NOT EXISTS manufacturing_materials (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    job_id TEXT NOT NULL REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity_required NUMERIC(10,2) NOT NULL,
    quantity_used NUMERIC(10,2) DEFAULT 0.00,
    unit TEXT DEFAULT 'Piece'
);

-- 21. Installations & Service Requests Table
CREATE TABLE IF NOT EXISTS installations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    job_id TEXT REFERENCES manufacturing_jobs(id) ON DELETE SET NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    site_address TEXT NOT NULL,
    technician_name TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    completion_date DATE,
    service_charges NUMERIC(12,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_requests (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    technician_name TEXT,
    visit_date DATE,
    service_charges NUMERIC(12,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Technician Assigned', 'In Progress', 'Completed', 'Closed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 23. Party Prices Table
CREATE TABLE IF NOT EXISTS party_prices (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, customer_id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_party_prices_product ON party_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_party_prices_customer ON party_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_business ON sales_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_quotations_business ON quotations(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_business ON purchase_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_business ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_business ON manufacturing_jobs(business_id);

-- 24. E-Way Bills Table
CREATE TABLE IF NOT EXISTS eway_bills (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
    eway_bill_number TEXT UNIQUE,
    eway_bill_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    generation_method TEXT NOT NULL DEFAULT 'manual' CHECK (generation_method IN ('manual', 'api')),
    supply_type TEXT NOT NULL DEFAULT 'O',
    sub_supply_type TEXT NOT NULL DEFAULT '1',
    doc_type TEXT NOT NULL DEFAULT 'INV',
    doc_number TEXT NOT NULL,
    doc_date DATE NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'regular',
    from_name TEXT NOT NULL,
    from_gstin TEXT NOT NULL,
    from_address TEXT NOT NULL,
    from_place TEXT NOT NULL,
    from_pincode TEXT NOT NULL,
    from_state_code TEXT NOT NULL DEFAULT '33',
    to_name TEXT NOT NULL,
    to_gstin TEXT,
    to_address TEXT NOT NULL,
    to_place TEXT NOT NULL,
    to_pincode TEXT NOT NULL,
    to_state_code TEXT NOT NULL DEFAULT '33',
    dispatch_from_address TEXT,
    dispatch_from_place TEXT,
    dispatch_from_pincode TEXT,
    dispatch_from_state_code TEXT,
    ship_to_address TEXT,
    ship_to_place TEXT,
    ship_to_pincode TEXT,
    ship_to_state_code TEXT,
    transport_mode TEXT DEFAULT '1',
    distance_km INT NOT NULL DEFAULT 20,
    transporter_name TEXT,
    transporter_id TEXT,
    transporter_doc_no TEXT,
    transporter_doc_date DATE,
    vehicle_number TEXT,
    vehicle_type TEXT DEFAULT 'R',
    total_taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12,2) DEFAULT 0.00,
    sgst_amount NUMERIC(12,2) DEFAULT 0.00,
    igst_amount NUMERIC(12,2) DEFAULT 0.00,
    cess_amount NUMERIC(12,2) DEFAULT 0.00,
    other_charges NUMERIC(12,2) DEFAULT 0.00,
    total_invoice_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cancel_reason_code TEXT,
    cancel_remarks TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    qr_code_data TEXT,
    nic_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 25. E-Way Bill Items Table
CREATE TABLE IF NOT EXISTS eway_bill_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    eway_bill_id TEXT NOT NULL REFERENCES eway_bills(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_desc TEXT,
    hsn_code TEXT NOT NULL DEFAULT '7308',
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    unit TEXT NOT NULL DEFAULT 'NOS',
    taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    cgst_rate NUMERIC(5,2) DEFAULT 9.00,
    cgst_amount NUMERIC(12,2) DEFAULT 0.00,
    sgst_rate NUMERIC(5,2) DEFAULT 9.00,
    sgst_amount NUMERIC(12,2) DEFAULT 0.00,
    igst_rate NUMERIC(5,2) DEFAULT 0.00,
    igst_amount NUMERIC(12,2) DEFAULT 0.00,
    cess_rate NUMERIC(5,2) DEFAULT 0.00,
    cess_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- 26. E-Way Bill Settings Table
CREATE TABLE IF NOT EXISTS eway_bill_settings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    gsp_provider TEXT DEFAULT 'manual',
    api_username TEXT DEFAULT '',
    api_password TEXT DEFAULT '',
    client_id TEXT DEFAULT '',
    client_secret TEXT DEFAULT '',
    gstin TEXT DEFAULT '33CRHPD7107H1Z3',
    auth_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    default_transporter_id TEXT DEFAULT '',
    default_transporter_name TEXT DEFAULT '',
    default_vehicle_number TEXT DEFAULT '',
    default_from_address TEXT DEFAULT '',
    default_from_place TEXT DEFAULT 'Salem',
    default_from_pincode TEXT DEFAULT '636001',
    default_from_state_code TEXT DEFAULT '33',
    auto_calculate_distance BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 27. E-Way Bill Logs Table
CREATE TABLE IF NOT EXISTS eway_bill_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    eway_bill_id TEXT REFERENCES eway_bills(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eway_bills_business ON eway_bills(business_id);
CREATE INDEX IF NOT EXISTS idx_eway_bills_invoice ON eway_bills(invoice_id);
CREATE INDEX IF NOT EXISTS idx_eway_bills_number ON eway_bills(eway_bill_number);
CREATE INDEX IF NOT EXISTS idx_eway_bills_status ON eway_bills(status);
CREATE INDEX IF NOT EXISTS idx_eway_bill_items_ewb ON eway_bill_items(eway_bill_id);

