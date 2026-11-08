import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { seedDatabase } from './seed';

function getDatabasePath(): string {
  // On Vercel / AWS Lambda, the root deployment directory is strictly read-only.
  // The only writable directory on serverless runtimes is /tmp.
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    (process.env.NODE_ENV === 'production' && !process.env.FLY_APP_NAME && !process.env.RENDER)
  );

  if (isServerless) {
    const tmpDbPath = path.join('/tmp', 'al_ameen.db');
    if (!fs.existsSync(tmpDbPath)) {
      const sourceDb = path.join(process.cwd(), 'data', 'al_ameen.db');
      if (fs.existsSync(sourceDb)) {
        try {
          fs.copyFileSync(sourceDb, tmpDbPath);
          const sourceWal = path.join(process.cwd(), 'data', 'al_ameen.db-wal');
          const sourceShm = path.join(process.cwd(), 'data', 'al_ameen.db-shm');
          if (fs.existsSync(sourceWal)) {
            try { fs.copyFileSync(sourceWal, `${tmpDbPath}-wal`); } catch {}
          }
          if (fs.existsSync(sourceShm)) {
            try { fs.copyFileSync(sourceShm, `${tmpDbPath}-shm`); } catch {}
          }
        } catch (e) {
          console.error('Failed copying bundled database to /tmp:', e);
        }
      }
    }
    return tmpDbPath;
  }

  // Persistent development or VPS server
  const DATA_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
  return path.join(DATA_DIR, 'al_ameen.db');
}

// Singleton database instance
let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = getDatabasePath();

    try {
      dbInstance = new Database(dbPath);
      try {
        dbInstance.pragma('journal_mode = WAL');
      } catch {
        dbInstance.pragma('journal_mode = DELETE');
      }
      dbInstance.pragma('foreign_keys = ON');
    } catch (openErr: any) {
      console.warn('Could not open database in read-write mode, falling back to readonly:', openErr.message);
      dbInstance = new Database(dbPath, { readonly: true });
    }

    try {
      initSchema(dbInstance);
    } catch (schemaErr: any) {
      console.warn('initSchema notice (database may be pre-initialized or read-only):', schemaErr.message);
    }

    try {
      seedDatabase(dbInstance);
    } catch (seedErr: any) {
      console.warn('seedDatabase notice:', seedErr.message);
    }
  }
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS business_settings (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      invoice_prefix TEXT DEFAULT 'SI-',
      quotation_prefix TEXT DEFAULT 'QT-',
      purchase_prefix TEXT DEFAULT 'PI-',
      job_prefix TEXT DEFAULT 'JB-',
      payment_prefix TEXT DEFAULT 'RCP-',
      default_gst_rate REAL DEFAULT 18.00,
      default_terms TEXT,
      next_invoice_number INTEGER DEFAULT 1,
      next_quotation_number INTEGER DEFAULT 1,
      bank_name TEXT,
      bank_branch TEXT,
      account_name TEXT,
      account_number TEXT,
      ifsc_code TEXT,
      upi_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'staff',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      category_id TEXT REFERENCES product_categories(id),
      name TEXT NOT NULL,
      sku TEXT,
      hsn_code TEXT DEFAULT '7308',
      unit TEXT NOT NULL DEFAULT 'Piece',
      purchase_price REAL DEFAULT 0.00,
      selling_price REAL DEFAULT 0.00,
      gst_rate REAL DEFAULT 18.00,
      opening_stock REAL DEFAULT 0.00,
      current_stock REAL DEFAULT 0.00,
      min_stock_alert REAL DEFAULT 5.00,
      is_measurement_based INTEGER DEFAULT 0,
      rate_per_sqft REAL DEFAULT 0.00,
      description TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      alternate_phone TEXT,
      email TEXT,
      address TEXT NOT NULL,
      state TEXT DEFAULT 'Tamil Nadu',
      state_code TEXT DEFAULT '33',
      gstin TEXT,
      opening_balance REAL DEFAULT 0.00,
      current_balance REAL DEFAULT 0.00,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT NOT NULL,
      gstin TEXT,
      balance REAL DEFAULT 0.00,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      quotation_number TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      site_address TEXT,
      validity_date TEXT,
      subtotal REAL DEFAULT 0.00,
      discount REAL DEFAULT 0.00,
      taxable_amount REAL DEFAULT 0.00,
      cgst REAL DEFAULT 0.00,
      sgst REAL DEFAULT 0.00,
      igst REAL DEFAULT 0.00,
      total_tax REAL DEFAULT 0.00,
      installation_charges REAL DEFAULT 0.00,
      transport_charges REAL DEFAULT 0.00,
      other_charges REAL DEFAULT 0.00,
      grand_total REAL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'draft',
      terms TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      item_type TEXT DEFAULT 'standard',
      description TEXT NOT NULL,
      hsn_code TEXT DEFAULT '7308',
      width REAL DEFAULT 0.00,
      height REAL DEFAULT 0.00,
      measurement_unit TEXT DEFAULT 'Feet',
      width_ft REAL DEFAULT 0.00,
      height_ft REAL DEFAULT 0.00,
      area_sqft REAL DEFAULT 0.00,
      rate_per_sqft REAL DEFAULT 0.00,
      quantity REAL DEFAULT 1.00,
      unit_price REAL DEFAULT 0.00,
      material_charges REAL DEFAULT 0.00,
      motor_charges REAL DEFAULT 0.00,
      spring_charges REAL DEFAULT 0.00,
      gearbox_charges REAL DEFAULT 0.00,
      installation_charges REAL DEFAULT 0.00,
      discount REAL DEFAULT 0.00,
      taxable_amount REAL DEFAULT 0.00,
      gst_rate REAL DEFAULT 18.00,
      total_amount REAL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      quotation_id TEXT REFERENCES quotations(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      invoice_type TEXT DEFAULT 'tax_invoice',
      issue_date TEXT NOT NULL,
      due_date TEXT,
      site_address TEXT,
      subtotal REAL DEFAULT 0.00,
      discount REAL DEFAULT 0.00,
      taxable_amount REAL DEFAULT 0.00,
      is_interstate INTEGER DEFAULT 0,
      cgst REAL DEFAULT 0.00,
      sgst REAL DEFAULT 0.00,
      igst REAL DEFAULT 0.00,
      total_tax REAL DEFAULT 0.00,
      installation_charges REAL DEFAULT 0.00,
      transport_charges REAL DEFAULT 0.00,
      other_charges REAL DEFAULT 0.00,
      grand_total REAL DEFAULT 0.00,
      paid_amount REAL DEFAULT 0.00,
      balance_amount REAL DEFAULT 0.00,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      terms TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      item_type TEXT DEFAULT 'standard',
      description TEXT NOT NULL,
      hsn_code TEXT DEFAULT '7308',
      width REAL DEFAULT 0.00,
      height REAL DEFAULT 0.00,
      measurement_unit TEXT DEFAULT 'Feet',
      width_ft REAL DEFAULT 0.00,
      height_ft REAL DEFAULT 0.00,
      area_sqft REAL DEFAULT 0.00,
      rate_per_sqft REAL DEFAULT 0.00,
      quantity REAL DEFAULT 1.00,
      unit_price REAL DEFAULT 0.00,
      material_charges REAL DEFAULT 0.00,
      motor_charges REAL DEFAULT 0.00,
      spring_charges REAL DEFAULT 0.00,
      gearbox_charges REAL DEFAULT 0.00,
      installation_charges REAL DEFAULT 0.00,
      discount REAL DEFAULT 0.00,
      taxable_amount REAL DEFAULT 0.00,
      gst_rate REAL DEFAULT 18.00,
      cgst_amount REAL DEFAULT 0.00,
      sgst_amount REAL DEFAULT 0.00,
      igst_amount REAL DEFAULT 0.00,
      total_amount REAL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      purchase_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      invoice_date TEXT NOT NULL,
      due_date TEXT,
      subtotal REAL DEFAULT 0.00,
      discount REAL DEFAULT 0.00,
      tax_amount REAL DEFAULT 0.00,
      grand_total REAL DEFAULT 0.00,
      paid_amount REAL DEFAULT 0.00,
      balance_amount REAL DEFAULT 0.00,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      gst_rate REAL DEFAULT 18.00,
      total_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      payment_number TEXT NOT NULL,
      type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      invoice_id TEXT,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      reference_number TEXT,
      notes TEXT,
      payment_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      expense_number TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      expense_date TEXT NOT NULL,
      notes TEXT,
      receipt_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS manufacturing_jobs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      job_number TEXT NOT NULL,
      quotation_id TEXT REFERENCES quotations(id),
      invoice_id TEXT REFERENCES sales_invoices(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      shutter_type TEXT NOT NULL,
      material_type TEXT,
      width REAL DEFAULT 0.00,
      height REAL DEFAULT 0.00,
      area_sqft REAL DEFAULT 0.00,
      site_address TEXT NOT NULL,
      assigned_staff TEXT,
      start_date TEXT,
      expected_completion_date TEXT,
      manufacturing_cost REAL DEFAULT 0.00,
      installation_cost REAL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'New Order',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS manufacturing_materials (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      name TEXT NOT NULL,
      quantity_required REAL NOT NULL,
      quantity_used REAL DEFAULT 0.00,
      unit TEXT DEFAULT 'Piece'
    );

    CREATE TABLE IF NOT EXISTS installations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      job_id TEXT REFERENCES manufacturing_jobs(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      site_address TEXT NOT NULL,
      technician_name TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      completion_date TEXT,
      service_charges REAL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      ticket_number TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      product_name TEXT NOT NULL,
      issue_description TEXT NOT NULL,
      technician_name TEXT,
      visit_date TEXT,
      service_charges REAL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'Open',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS party_prices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(product_id, customer_id)
    );

    CREATE TABLE IF NOT EXISTS eway_bills (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
      eway_bill_number TEXT UNIQUE,
      eway_bill_date TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      generation_method TEXT NOT NULL DEFAULT 'manual',
      supply_type TEXT NOT NULL DEFAULT 'O',
      sub_supply_type TEXT NOT NULL DEFAULT '1',
      doc_type TEXT NOT NULL DEFAULT 'INV',
      doc_number TEXT NOT NULL,
      doc_date TEXT NOT NULL,
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
      distance_km INTEGER NOT NULL DEFAULT 20,
      transporter_name TEXT,
      transporter_id TEXT,
      transporter_doc_no TEXT,
      transporter_doc_date TEXT,
      vehicle_number TEXT,
      vehicle_type TEXT DEFAULT 'R',
      total_taxable_amount REAL NOT NULL DEFAULT 0.00,
      cgst_amount REAL DEFAULT 0.00,
      sgst_amount REAL DEFAULT 0.00,
      igst_amount REAL DEFAULT 0.00,
      cess_amount REAL DEFAULT 0.00,
      other_charges REAL DEFAULT 0.00,
      total_invoice_value REAL NOT NULL DEFAULT 0.00,
      cancel_reason_code TEXT,
      cancel_remarks TEXT,
      cancelled_at TEXT,
      qr_code_data TEXT,
      nic_payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS eway_bill_items (
      id TEXT PRIMARY KEY,
      eway_bill_id TEXT NOT NULL REFERENCES eway_bills(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      product_desc TEXT,
      hsn_code TEXT NOT NULL DEFAULT '7308',
      quantity REAL NOT NULL DEFAULT 1.00,
      unit TEXT NOT NULL DEFAULT 'NOS',
      taxable_amount REAL NOT NULL DEFAULT 0.00,
      gst_rate REAL NOT NULL DEFAULT 18.00,
      cgst_rate REAL DEFAULT 9.00,
      cgst_amount REAL DEFAULT 0.00,
      sgst_rate REAL DEFAULT 9.00,
      sgst_amount REAL DEFAULT 0.00,
      igst_rate REAL DEFAULT 0.00,
      igst_amount REAL DEFAULT 0.00,
      cess_rate REAL DEFAULT 0.00,
      cess_amount REAL DEFAULT 0.00,
      total_amount REAL NOT NULL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS eway_bill_settings (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      environment TEXT DEFAULT 'sandbox',
      gsp_provider TEXT DEFAULT 'manual',
      api_username TEXT DEFAULT '',
      api_password TEXT DEFAULT '',
      client_id TEXT DEFAULT '',
      client_secret TEXT DEFAULT '',
      gstin TEXT DEFAULT '33CRHPD7107H1Z3',
      auth_token TEXT,
      token_expiry TEXT,
      default_transporter_id TEXT DEFAULT '',
      default_transporter_name TEXT DEFAULT '',
      default_vehicle_number TEXT DEFAULT '',
      default_from_address TEXT DEFAULT '',
      default_from_place TEXT DEFAULT 'Salem',
      default_from_pincode TEXT DEFAULT '636001',
      default_from_state_code TEXT DEFAULT '33',
      auto_calculate_distance INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS eway_bill_logs (
      id TEXT PRIMARY KEY,
      eway_bill_id TEXT,
      action TEXT NOT NULL,
      request_payload TEXT,
      response_payload TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL DEFAULT 'biz_al_ameen_01',
      emp_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      alternate_phone TEXT,
      address TEXT,
      job_role TEXT NOT NULL DEFAULT 'Worker',
      department TEXT NOT NULL DEFAULT 'Workshop',
      joining_date TEXT NOT NULL,
      employment_type TEXT NOT NULL DEFAULT 'full_time',
      salary_type TEXT NOT NULL DEFAULT 'monthly',
      base_salary REAL NOT NULL DEFAULT 0.00,
      employment_status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL DEFAULT 'biz_al_ameen_01',
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      attendance_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present',
      check_in_time TEXT,
      notes TEXT,
      marked_by_user_id TEXT NOT NULL,
      marked_by_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, attendance_date)
    );

    CREATE TABLE IF NOT EXISTS attendance_audit_logs (
      id TEXT PRIMARY KEY,
      attendance_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      attendance_date TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by_user_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS salary_payments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL DEFAULT 'biz_al_ameen_01',
      payment_number TEXT UNIQUE NOT NULL,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      period_month INTEGER NOT NULL,
      period_year INTEGER NOT NULL,
      salary_type TEXT NOT NULL DEFAULT 'monthly',
      base_rate REAL NOT NULL DEFAULT 0.00,
      total_days_in_month INTEGER DEFAULT 30,
      days_present REAL DEFAULT 0.00,
      days_absent REAL DEFAULT 0.00,
      days_half_day REAL DEFAULT 0.00,
      days_leave REAL DEFAULT 0.00,
      earned_salary REAL NOT NULL DEFAULT 0.00,
      allowances REAL DEFAULT 0.00,
      bonuses REAL DEFAULT 0.00,
      deductions REAL DEFAULT 0.00,
      advance_deducted REAL DEFAULT 0.00,
      net_payable REAL NOT NULL DEFAULT 0.00,
      paid_amount REAL NOT NULL DEFAULT 0.00,
      balance_amount REAL NOT NULL DEFAULT 0.00,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      payment_date TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      notes TEXT,
      recorded_by_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS salary_advances (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL DEFAULT 'biz_al_ameen_01',
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      advance_date TEXT NOT NULL,
      recovered_amount REAL DEFAULT 0.00,
      balance_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT,
      recorded_by_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safely migrate products, users, sales and stock tables with new columns if upgrading existing db
  const colsToAdd = [
    "ALTER TABLE products ADD COLUMN item_type TEXT DEFAULT 'product'",
    "ALTER TABLE products ADD COLUMN tax_type TEXT DEFAULT 'without_tax'",
    "ALTER TABLE products ADD COLUMN discount_type TEXT DEFAULT 'percentage'",
    "ALTER TABLE products ADD COLUMN discount_value REAL DEFAULT 0.00",
    "ALTER TABLE products ADD COLUMN brand TEXT DEFAULT ''",
    "ALTER TABLE products ADD COLUMN sac_code TEXT DEFAULT ''",
    "ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE products ADD COLUMN track_stock INTEGER DEFAULT 1",
    "ALTER TABLE business_settings ADD COLUMN next_invoice_number INTEGER DEFAULT 1",
    "ALTER TABLE business_settings ADD COLUMN next_quotation_number INTEGER DEFAULT 1",
    "ALTER TABLE sales_invoices ADD COLUMN eway_bill_number TEXT",
    "ALTER TABLE sales_invoices ADD COLUMN eway_bill_id TEXT",
    "ALTER TABLE sales_invoices ADD COLUMN created_by_user_id TEXT",
    "ALTER TABLE sales_invoices ADD COLUMN created_by_name TEXT",
    "ALTER TABLE users ADD COLUMN username TEXT",
    "ALTER TABLE users ADD COLUMN password_hash TEXT",
    "ALTER TABLE users ADD COLUMN last_login TEXT",
    "ALTER TABLE users ADD COLUMN updated_at TEXT",
    "ALTER TABLE stock_movements ADD COLUMN user_id TEXT",
    "ALTER TABLE stock_movements ADD COLUMN user_name TEXT",
    "ALTER TABLE stock_movements ADD COLUMN user_role TEXT",
    "ALTER TABLE stock_movements ADD COLUMN previous_stock REAL DEFAULT 0.00",
    "ALTER TABLE stock_movements ADD COLUMN added_stock REAL DEFAULT 0.00",
    "ALTER TABLE stock_movements ADD COLUMN new_stock REAL DEFAULT 0.00",
    "ALTER TABLE stock_movements ADD COLUMN previous_price REAL DEFAULT 0.00",
    "ALTER TABLE stock_movements ADD COLUMN new_price REAL DEFAULT 0.00",
    "ALTER TABLE stock_movements ADD COLUMN reason TEXT"
  ];
  for (const colSql of colsToAdd) {
    try {
      db.exec(colSql);
    } catch (e) {
      // Column already exists
    }
  }

  // Ensure Al Ameen Automation product and service categories exist
  const standardCategories = [
    { id: 'cat_shutter_acc', name: 'Rolling Shutter Accessories', description: 'Locks, handles, stoppers, and general hardware' },
    { id: 'cat_motors_auto', name: 'Automatic Rolling Shutter Motors', description: 'Center motors, side motors, tubular motors' },
    { id: 'cat_sliding_motors', name: 'Sliding Gate Motors', description: 'Heavy-duty industrial and residential sliding gate operators' },
    { id: 'cat_gearboxes', name: 'Gearboxes', description: 'Manual pull-chain reduction gear boxes' },
    { id: 'cat_springs', name: 'Springs', description: 'High tensile carbon steel flat and spiral springs' },
    { id: 'cat_bottom_plates', name: 'Bottom Plates', description: 'Heavy MS and GI angle bottom plates' },
    { id: 'cat_guide_channels', name: 'Guide Channels', description: 'Cold rolled heavy gauge guide channels and tracks' },
    { id: 'cat_remotes', name: 'Remote Controls', description: 'Wireless transmitters, receivers, and smart controllers' },
    { id: 'cat_boom_barriers', name: 'Boom Barriers', description: 'Automated parking and entrance boom barriers' },
    { id: 'cat_glass_fittings', name: 'Glass Door Fittings', description: 'Patch fittings, floor springs, locks, and brackets' },
    { id: 'cat_svc_installation', name: 'Installation Services', description: 'Site erection, motor mounting, alignment and commissioning' },
    { id: 'cat_svc_repair', name: 'Repair and Maintenance Services', description: 'Emergency repairs, shutter servicing, motor troubleshooting, AMC' },
  ];
  const catCheck = db.prepare('SELECT id FROM product_categories WHERE name = ?');
  const catInsert = db.prepare('INSERT INTO product_categories (id, business_id, name, description) VALUES (?, ?, ?, ?)');
  for (const cat of standardCategories) {
    if (!catCheck.get(cat.name)) {
      try {
        catInsert.run(cat.id, 'biz_al_ameen_01', cat.name, cat.description);
      } catch (e) {
        catInsert.run('cat_' + Date.now() + '_' + Math.floor(Math.random() * 1000), 'biz_al_ameen_01', cat.name, cat.description);
      }
    }
  }

  // Seed or update default Admin user
  const adminHash = 'd3c1693548c5909d458683581ff0b181:2788143ddf8138484ccc106f5cbb56e4eff6ede20f3b0513910dfb160fc911cba4a92cdf69a92a4f94164efb713901f1604c5d9f413c1799fc15ba3e54767308';
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('admin@alameen.com', 'admin') as any;
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (id, email, username, full_name, phone, role, password_hash, is_active)
      VALUES ('usr_admin_01', 'admin@alameen.com', 'admin', 'Al Ameen Admin', '96294 95874', 'admin', ?, 1)
    `).run(adminHash);
  } else {
    db.prepare(`
      UPDATE users SET
        username = COALESCE(username, 'admin'),
        role = 'admin',
        password_hash = COALESCE(password_hash, ?),
        is_active = 1
      WHERE id = ?
    `).run(adminHash, existingAdmin.id);
  }

  // Seed default Cashier user
  const cashierHash = 'e7cddf6fcd2eefadd6796a6a63d8eb09:eaf8002510bcd43a88370edc005ac7de9546232165f11acb610d5d6f861c144f30d745690d534cf09bd97b2b65be59cd2d48426a53dfb27068d3ae9e868b4b92';
  const existingCashier = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('cashier@alameen.com', 'cashier1') as any;
  if (!existingCashier) {
    db.prepare(`
      INSERT INTO users (id, email, username, full_name, phone, role, password_hash, is_active)
      VALUES ('usr_cashier_01', 'cashier@alameen.com', 'cashier1', 'Main Cashier', '9876543210', 'cashier', ?, 1)
    `).run(cashierHash);
  } else {
    db.prepare(`
      UPDATE users SET
        username = COALESCE(username, 'cashier1'),
        role = 'cashier',
        password_hash = COALESCE(password_hash, ?),
        is_active = 1
      WHERE id = ?
    `).run(cashierHash, existingCashier.id);
  }

  // Seed default Manager user
  const managerHash = '41465c80578403be8ea2efbde9ddbb7e:4be41dd3dd45c497b40af27b0d03d550b9c3689a0e0eae7d20c52737dc7ed8b8ba72e9feac655a0e261432e6d7639895196cdfd284dd5bab7132aacf045a6be5';
  const existingManager = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('manager@alameen.com', 'manager') as any;
  if (!existingManager) {
    db.prepare(`
      INSERT INTO users (id, email, username, full_name, phone, role, password_hash, is_active)
      VALUES ('usr_manager_01', 'manager@alameen.com', 'manager', 'Workshop Manager', '9876543211', 'cashier', ?, 1)
    `).run(managerHash);
  }

  // Seed default employees if none exist
  const empCount = (db.prepare('SELECT COUNT(*) as c FROM employees').get() as any).c;
  if (empCount === 0) {
    const defaultEmployees = [
      { id: 'emp_001', emp_code: 'EMP-001', full_name: 'Abdul Rahman', phone: '9876543210', job_role: 'Cashier', department: 'Billing & Accounts', joining_date: '2024-01-10', employment_type: 'full_time', salary_type: 'monthly', base_salary: 22000 },
      { id: 'emp_002', emp_code: 'EMP-002', full_name: 'Mohammed Bilal', phone: '9876543211', job_role: 'Supervisor', department: 'Workshop', joining_date: '2023-06-15', employment_type: 'full_time', salary_type: 'monthly', base_salary: 28000 },
      { id: 'emp_003', emp_code: 'EMP-003', full_name: 'Syed Ibrahim', phone: '9876543212', job_role: 'Senior Technician', department: 'Field Installation', joining_date: '2023-08-01', employment_type: 'full_time', salary_type: 'monthly', base_salary: 24000 },
      { id: 'emp_004', emp_code: 'EMP-004', full_name: 'Karthik Raja', phone: '9876543213', job_role: 'Welder / Fabricator', department: 'Workshop', joining_date: '2024-02-01', employment_type: 'full_time', salary_type: 'daily', base_salary: 850 },
      { id: 'emp_005', emp_code: 'EMP-005', full_name: 'Vignesh Kumar', phone: '9876543214', job_role: 'Welder / Fabricator', department: 'Workshop', joining_date: '2024-02-15', employment_type: 'full_time', salary_type: 'daily', base_salary: 800 },
      { id: 'emp_006', emp_code: 'EMP-006', full_name: 'Ramesh Babu', phone: '9876543215', job_role: 'Helper', department: 'Workshop', joining_date: '2024-03-01', employment_type: 'full_time', salary_type: 'daily', base_salary: 600 },
    ];
    const empInsert = db.prepare(`
      INSERT INTO employees (id, business_id, emp_code, full_name, phone, job_role, department, joining_date, employment_type, salary_type, base_salary, employment_status)
      VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);
    for (const emp of defaultEmployees) {
      empInsert.run(emp.id, emp.emp_code, emp.full_name, emp.phone, emp.job_role, emp.department, emp.joining_date, emp.employment_type, emp.salary_type, emp.base_salary);
    }
  }
}

// -------------------------------------------------------------
// DATA ACCESS & BUSINESS LOGIC
// -------------------------------------------------------------

export function getBusiness() {
  const db = getDb();
  return db.prepare('SELECT * FROM businesses LIMIT 1').get() as any;
}

export function updateBusiness(data: any) {
  const db = getDb();
  const current = getBusiness();
  if (!current) return null;
  db.prepare(`
    UPDATE businesses SET
      name = ?, legal_name = ?, address = ?, phone1 = ?, phone2 = ?,
      email = ?, gstin = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(data.name, data.legal_name, data.address, data.phone1, data.phone2, data.email, data.gstin, current.id);
  return getBusiness();
}

export function getBusinessSettings() {
  const db = getDb();
  return db.prepare('SELECT * FROM business_settings LIMIT 1').get() as any;
}

export function formatDocNumber(prefix: string | null | undefined, num: number): string {
  let cleanPrefix = (prefix || '').trim();
  // If prefix was previously saved with trailing 001 (e.g. 'SI-001' or 'QT-001'), strip the trailing digits
  if (/^([A-Za-z_-]+)0+1$/.test(cleanPrefix)) {
    cleanPrefix = cleanPrefix.replace(/0+1$/, '');
  }
  const padded = String(Math.max(1, Math.floor(Number(num) || 1))).padStart(3, '0');
  if (!cleanPrefix) return padded;
  return `${cleanPrefix}${padded}`;
}

export function getNextInvoiceNumber(): string {
  const db = getDb();
  const settings = getBusinessSettings();
  const prefix = settings?.invoice_prefix ?? '';
  let nextNum = Math.max(1, Number(settings?.next_invoice_number || 1));

  let candidate = formatDocNumber(prefix, nextNum);

  // Ensure candidate does not collide with an existing invoice
  while (true) {
    const existing = db.prepare('SELECT id FROM sales_invoices WHERE invoice_number = ?').get(candidate);
    if (!existing) break;
    nextNum++;
    candidate = formatDocNumber(prefix, nextNum);
  }

  return candidate;
}

export function getNextQuotationNumber(): string {
  const db = getDb();
  const settings = getBusinessSettings();
  const prefix = settings?.quotation_prefix ?? '';
  let nextNum = Math.max(1, Number(settings?.next_quotation_number || 1));

  let candidate = formatDocNumber(prefix, nextNum);

  // Ensure candidate does not collide with an existing quotation
  while (true) {
    const existing = db.prepare('SELECT id FROM quotations WHERE quotation_number = ?').get(candidate);
    if (!existing) break;
    nextNum++;
    candidate = formatDocNumber(prefix, nextNum);
  }

  return candidate;
}

export function updateBusinessSettings(data: any) {
  const db = getDb();
  const settings = getBusinessSettings();
  if (!settings) return null;
  db.prepare(`
    UPDATE business_settings SET
      invoice_prefix = ?, quotation_prefix = ?, purchase_prefix = ?,
      next_invoice_number = ?, next_quotation_number = ?,
      default_terms = ?, bank_name = ?, bank_branch = ?,
      account_name = ?, account_number = ?, ifsc_code = ?, upi_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.invoice_prefix ?? settings.invoice_prefix ?? '',
    data.quotation_prefix ?? settings.quotation_prefix ?? '',
    data.purchase_prefix ?? settings.purchase_prefix ?? '',
    Math.max(1, Number(data.next_invoice_number ?? settings.next_invoice_number ?? 1)),
    Math.max(1, Number(data.next_quotation_number ?? settings.next_quotation_number ?? 1)),
    data.default_terms ?? settings.default_terms ?? '',
    data.bank_name ?? settings.bank_name ?? '',
    data.bank_branch ?? settings.bank_branch ?? '',
    data.account_name ?? settings.account_name ?? '',
    data.account_number ?? settings.account_number ?? '',
    data.ifsc_code ?? settings.ifsc_code ?? '',
    data.upi_id ?? settings.upi_id ?? '',
    settings.id
  );
  return getBusinessSettings();
}

export function getDashboardMetrics() {
  const db = getDb();
  
  // 1. Total Sales
  const salesRow = db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as total FROM sales_invoices`).get() as { total: number };
  const totalSales = salesRow.total;

  // 2. Today's Sales
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySalesRow = db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as total FROM sales_invoices WHERE issue_date = ?`).get(todayStr) as { total: number };
  const todaySales = todaySalesRow.total;

  // 3. Total Purchase
  const purchaseRow = db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as total FROM purchase_invoices`).get() as { total: number };
  const totalPurchase = purchaseRow.total;

  // 4. To Collect (Customer Outstanding)
  const collectRow = db.prepare(`SELECT COALESCE(SUM(balance_amount), 0) as total FROM sales_invoices WHERE balance_amount > 0`).get() as { total: number };
  const toCollect = collectRow.total;

  // 5. To Pay (Supplier Outstanding)
  const payRow = db.prepare(`SELECT COALESCE(SUM(balance_amount), 0) as total FROM purchase_invoices WHERE balance_amount > 0`).get() as { total: number };
  const toPay = payRow.total;

  // 6. Total Expenses
  const expRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`).get() as { total: number };
  const totalExpenses = expRow.total;

  // 7. Total Profit = Total Sales - Total Purchase - Total Expenses
  const totalProfit = Math.max(0, totalSales - totalPurchase - totalExpenses);

  // 8. Stock Value = SUM(current_stock * purchase_price)
  const stockRow = db.prepare(`SELECT COALESCE(SUM(current_stock * purchase_price), 0) as total FROM products`).get() as { total: number };
  const stockValue = stockRow.total;

  // 9. Cash and Bank Balances
  // Cash: Inflow cash - Outflow cash
  const cashIn = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE type = 'in' AND payment_mode = 'Cash'`).get() as any).total;
  const cashOut = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE type = 'out' AND payment_mode = 'Cash'`).get() as any).total;
  const cashExp = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE payment_mode = 'Cash'`).get() as any).total;
  const cashBalance = Math.max(0, cashIn - cashOut - cashExp);

  // Bank: Inflow bank/upi - Outflow bank/upi
  const bankIn = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE type = 'in' AND payment_mode IN ('Bank Transfer', 'UPI', 'Card', 'Cheque')`).get() as any).total;
  const bankOut = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE type = 'out' AND payment_mode IN ('Bank Transfer', 'UPI', 'Card', 'Cheque')`).get() as any).total;
  const bankExp = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE payment_mode IN ('Bank Transfer', 'UPI', 'Card', 'Cheque')`).get() as any).total;
  const bankBalance = Math.max(0, bankIn - bankOut - bankExp);

  // Helper for human-readable relative time
  function formatRelativeTime(dateString?: string) {
    if (!dateString) return 'Recently';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  // Recent Transactions (Combine sales, purchases, payments, expenses)
  const recentInvoices = (db.prepare(`
    SELECT s.id, 'invoice' as kind, ('Invoice #' || s.invoice_number) as title, c.name as subtitle, s.grand_total as amount, s.created_at
    FROM sales_invoices s
    JOIN customers c ON s.customer_id = c.id
    ORDER BY s.created_at DESC LIMIT 3
  `).all() as any[]).map(r => ({ ...r, timeAgo: formatRelativeTime(r.created_at) }));

  const recentPurchases = (db.prepare(`
    SELECT p.id, 'purchase' as kind, ('Purchase #' || p.purchase_number) as title, sp.name as subtitle, p.grand_total as amount, p.created_at
    FROM purchase_invoices p
    JOIN suppliers sp ON p.supplier_id = sp.id
    ORDER BY p.created_at DESC LIMIT 2
  `).all() as any[]).map(r => ({ ...r, timeAgo: formatRelativeTime(r.created_at) }));

  const recentPayments = (db.prepare(`
    SELECT pay.id, 'payment' as kind, 'Payment Received' as title, COALESCE(c.name, 'Customer') as subtitle, pay.amount, pay.created_at
    FROM payments pay
    LEFT JOIN customers c ON pay.entity_id = c.id
    WHERE pay.type = 'in'
    ORDER BY pay.created_at DESC LIMIT 2
  `).all() as any[]).map(r => ({ ...r, timeAgo: formatRelativeTime(r.created_at) }));

  const recentExpenses = (db.prepare(`
    SELECT e.id, 'expense' as kind, 'Expense Added' as title, e.title as subtitle, e.amount, e.created_at
    FROM expenses e
    ORDER BY e.created_at DESC LIMIT 2
  `).all() as any[]).map(r => ({ ...r, timeAgo: formatRelativeTime(r.created_at) }));

  const recentTransactions = [...recentInvoices, ...recentPurchases, ...recentPayments, ...recentExpenses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Sales & Purchase Overview Chart (Dynamic Last 7 Days)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = daysOfWeek[d.getDay()];

    const daySales = (db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as total FROM sales_invoices WHERE issue_date = ? OR DATE(created_at) = ?`).get(dateStr, dateStr) as any).total;
    const dayPurchase = (db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as total FROM purchase_invoices WHERE invoice_date = ? OR DATE(created_at) = ?`).get(dateStr, dateStr) as any).total;

    chartData.push({
      name: dayName,
      date: dateStr,
      sales: daySales,
      purchase: dayPurchase,
    });
  }

  return {
    totalSales,
    todaySales,
    totalPurchase,
    toCollect,
    toPay,
    totalExpenses,
    totalProfit,
    stockValue,
    cashBalance,
    bankBalance,
    recentTransactions,
    chartData,
  };
}

// -------------------------------------------------------------
// CUSTOMERS
// -------------------------------------------------------------
export function getCustomers() {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM sales_invoices WHERE customer_id = c.id) as total_invoices,
      (SELECT COALESCE(SUM(grand_total), 0) FROM sales_invoices WHERE customer_id = c.id) as total_sales,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE entity_id = c.id AND type = 'in') as total_paid
    FROM customers c
    ORDER BY c.name ASC
  `).all() as any[];
}

export function getCustomerById(id: string) {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!customer) return null;

  const invoices = db.prepare('SELECT * FROM sales_invoices WHERE customer_id = ? ORDER BY issue_date DESC').all(id);
  const quotations = db.prepare('SELECT * FROM quotations WHERE customer_id = ? ORDER BY created_at DESC').all(id);
  const payments = db.prepare("SELECT * FROM payments WHERE entity_id = ? AND entity_type = 'customer' ORDER BY payment_date DESC").all(id);
  const jobs = db.prepare('SELECT * FROM manufacturing_jobs WHERE customer_id = ? ORDER BY created_at DESC').all(id);
  const serviceRequests = db.prepare('SELECT * FROM service_requests WHERE customer_id = ? ORDER BY created_at DESC').all(id);

  return {
    ...customer,
    invoices,
    quotations,
    payments,
    jobs,
    serviceRequests,
  };
}

export function createCustomer(data: any) {
  const db = getDb();
  const id = 'cust_' + Date.now();
  db.prepare(`
    INSERT INTO customers (id, business_id, name, phone, alternate_phone, email, address, state, state_code, gstin, opening_balance, current_balance, notes)
    VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.phone, data.alternate_phone || '', data.email || '', data.address,
    data.state || 'Tamil Nadu', data.state_code || '33', data.gstin || '',
    data.opening_balance || 0, data.opening_balance || 0, data.notes || ''
  );
  return getCustomerById(id);
}

export function updateCustomer(id: string, data: any) {
  const db = getDb();
  db.prepare(`
    UPDATE customers SET
      name = ?, phone = ?, alternate_phone = ?, email = ?, address = ?,
      state = ?, state_code = ?, gstin = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(data.name, data.phone, data.alternate_phone || '', data.email || '', data.address, data.state, data.state_code, data.gstin || '', data.notes || '', id);
  return getCustomerById(id);
}

// -------------------------------------------------------------
// SUPPLIERS
// -------------------------------------------------------------
export function getSuppliers() {
  const db = getDb();
  return db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM purchase_invoices WHERE supplier_id = s.id) as total_purchases,
      (SELECT COALESCE(SUM(grand_total), 0) FROM purchase_invoices WHERE supplier_id = s.id) as total_amount
    FROM suppliers s
    ORDER BY s.name ASC
  `).all() as any[];
}

export function createSupplier(data: any) {
  const db = getDb();
  const id = 'supp_' + Date.now();
  db.prepare(`
    INSERT INTO suppliers (id, business_id, name, contact_person, phone, email, address, gstin, balance)
    VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.contact_person || '', data.phone, data.email || '',
    data.address, data.gstin || '', data.balance || 0
  );
  return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
}

// -------------------------------------------------------------
// PRODUCTS & INVENTORY
// -------------------------------------------------------------
export function getCategories() {
  const db = getDb();
  return db.prepare('SELECT * FROM product_categories ORDER BY name ASC').all() as any[];
}

export function getProducts(filter?: string | { categoryId?: string; type?: string; activeOnly?: boolean; search?: string }) {
  const db = getDb();
  let categoryId: string | undefined;
  let type: string | undefined;
  let activeOnly = false;
  let search: string | undefined;

  if (typeof filter === 'string') {
    categoryId = filter;
  } else if (filter) {
    categoryId = filter.categoryId;
    type = filter.type;
    activeOnly = !!filter.activeOnly;
    search = filter.search;
  }

  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (type && type !== 'all') {
    sql += ' AND p.item_type = ?';
    params.push(type);
  }

  if (activeOnly) {
    sql += ' AND (p.is_active IS NULL OR p.is_active = 1)';
  }

  if (search && search.trim()) {
    sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.hsn_code LIKE ? OR p.sac_code LIKE ?)';
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s, s);
  }

  sql += ' ORDER BY p.name ASC';
  return db.prepare(sql).all(...params) as any[];
}

export function getProductById(id: string) {
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(id) as any;
  if (!product) return null;

  const partyPrices = db.prepare(`
    SELECT pp.*, c.name as customer_name
    FROM party_prices pp
    JOIN customers c ON pp.customer_id = c.id
    WHERE pp.product_id = ?
  `).all(id) as any[];

  return { ...product, party_prices: partyPrices };
}

export function createProduct(data: any) {
  const db = getDb();
  const id = data.id || 'p_' + Date.now();
  const itemType = data.item_type || 'product';
  const trackStock = itemType === 'service' ? 0 : (data.track_stock !== undefined ? (data.track_stock ? 1 : 0) : 1);
  const openingStock = trackStock ? Number(data.opening_stock || 0) : 0;
  const currentStock = trackStock ? Number(data.current_stock ?? data.opening_stock ?? 0) : 0;

  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO products (
        id, business_id, category_id, name, sku, hsn_code, unit,
        purchase_price, selling_price, gst_rate, opening_stock, current_stock, min_stock_alert,
        is_measurement_based, rate_per_sqft, description,
        item_type, tax_type, discount_type, discount_value, brand, sac_code, is_active, track_stock
      ) VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.category_id || null, data.name, data.sku || '',
      data.hsn_code || (itemType === 'service' ? '998719' : '7308'),
      data.unit || (itemType === 'service' ? 'Service' : 'Piece'),
      data.purchase_price || 0, data.selling_price || 0, data.gst_rate ?? 18,
      openingStock, currentStock, data.min_stock_alert ?? 5,
      data.is_measurement_based ? 1 : 0, data.rate_per_sqft || 0, data.description || '',
      itemType, data.tax_type || 'without_tax', data.discount_type || 'percentage', data.discount_value || 0,
      data.brand || '', data.sac_code || (itemType === 'service' ? (data.hsn_code || '998719') : ''),
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1, trackStock
    );

    // Save Party-Wise Prices if provided
    if (Array.isArray(data.party_prices)) {
      const pStmt = db.prepare(`
        INSERT OR REPLACE INTO party_prices (id, business_id, product_id, customer_id, price)
        VALUES (?, 'biz_al_ameen_01', ?, ?, ?)
      `);
      for (const pp of data.party_prices) {
        if (pp.customer_id && pp.price !== undefined && pp.price !== '') {
          pStmt.run('pp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), id, pp.customer_id, Number(pp.price));
        }
      }
    }
  });

  run();
  return getProductById(id);
}

export function updateProduct(id: string, data: any) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Product not found');

  const itemType = data.item_type || existing.item_type || 'product';
  const trackStock = itemType === 'service' ? 0 : (data.track_stock !== undefined ? (data.track_stock ? 1 : 0) : (existing.track_stock ?? 1));

  const run = db.transaction(() => {
    db.prepare(`
      UPDATE products SET
        category_id = ?,
        name = ?,
        sku = ?,
        hsn_code = ?,
        unit = ?,
        purchase_price = ?,
        selling_price = ?,
        gst_rate = ?,
        opening_stock = ?,
        current_stock = ?,
        min_stock_alert = ?,
        is_measurement_based = ?,
        rate_per_sqft = ?,
        description = ?,
        item_type = ?,
        tax_type = ?,
        discount_type = ?,
        discount_value = ?,
        brand = ?,
        sac_code = ?,
        is_active = ?,
        track_stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.category_id !== undefined ? data.category_id : existing.category_id,
      data.name !== undefined ? data.name : existing.name,
      data.sku !== undefined ? data.sku : existing.sku,
      data.hsn_code !== undefined ? data.hsn_code : existing.hsn_code,
      data.unit !== undefined ? data.unit : existing.unit,
      data.purchase_price !== undefined ? data.purchase_price : existing.purchase_price,
      data.selling_price !== undefined ? data.selling_price : existing.selling_price,
      data.gst_rate !== undefined ? data.gst_rate : existing.gst_rate,
      data.opening_stock !== undefined ? data.opening_stock : existing.opening_stock,
      data.current_stock !== undefined ? data.current_stock : existing.current_stock,
      data.min_stock_alert !== undefined ? data.min_stock_alert : existing.min_stock_alert,
      data.is_measurement_based !== undefined ? (data.is_measurement_based ? 1 : 0) : existing.is_measurement_based,
      data.rate_per_sqft !== undefined ? data.rate_per_sqft : existing.rate_per_sqft,
      data.description !== undefined ? data.description : existing.description,
      itemType,
      data.tax_type !== undefined ? data.tax_type : existing.tax_type,
      data.discount_type !== undefined ? data.discount_type : existing.discount_type,
      data.discount_value !== undefined ? data.discount_value : existing.discount_value,
      data.brand !== undefined ? data.brand : existing.brand,
      data.sac_code !== undefined ? data.sac_code : existing.sac_code,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
      trackStock,
      id
    );

    // Sync party_prices if provided
    if (Array.isArray(data.party_prices)) {
      db.prepare('DELETE FROM party_prices WHERE product_id = ?').run(id);
      const pStmt = db.prepare(`
        INSERT OR REPLACE INTO party_prices (id, business_id, product_id, customer_id, price)
        VALUES (?, 'biz_al_ameen_01', ?, ?, ?)
      `);
      for (const pp of data.party_prices) {
        if (pp.customer_id && pp.price !== undefined && pp.price !== '') {
          pStmt.run('pp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), id, pp.customer_id, Number(pp.price));
        }
      }
    }
  });

  run();
  return getProductById(id);
}

export function deleteProduct(id: string) {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare('DELETE FROM party_prices WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
  });
  run();
  return { success: true };
}

export function toggleProductActive(id: string, isActive?: boolean) {
  const db = getDb();
  const prod = db.prepare('SELECT is_active FROM products WHERE id = ?').get(id) as any;
  if (!prod) throw new Error('Product not found');
  const nextVal = isActive !== undefined ? (isActive ? 1 : 0) : (prod.is_active === 1 ? 0 : 1);
  db.prepare('UPDATE products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextVal, id);
  return getProductById(id);
}

export function createCategory(data: any) {
  const db = getDb();
  const id = 'cat_' + Date.now();
  db.prepare(`
    INSERT INTO product_categories (id, business_id, name, description)
    VALUES (?, 'biz_al_ameen_01', ?, ?)
  `).run(id, data.name, data.description || '');
  return db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id) as any;
}

export function getPartyPrice(productId: string, customerId: string) {
  const db = getDb();
  const row = db.prepare('SELECT price FROM party_prices WHERE product_id = ? AND customer_id = ?').get(productId, customerId) as any;
  return row ? row.price : null;
}

export function getCustomerPartyPrices(customerId: string) {
  const db = getDb();
  return db.prepare('SELECT product_id, price FROM party_prices WHERE customer_id = ?').all(customerId) as { product_id: string; price: number }[];
}

export function adjustStock(
  productId: string,
  quantity: number,
  type: 'in' | 'out' | 'adjustment',
  notes = '',
  auditUser?: { userId?: string; userName?: string; userRole?: string; reason?: string }
) {
  const db = getDb();
  const run = db.transaction(() => {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
    if (!prod) return;
    if (prod.item_type === 'service') return; // Services never have stock adjustments

    const prevStock = Number(prod.current_stock || 0);
    let newStock = prevStock;
    if (type === 'in') newStock += quantity;
    else if (type === 'out') newStock = Math.max(0, prevStock - quantity);
    else if (type === 'adjustment') newStock = quantity;

    db.prepare('UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, productId);

    db.prepare(`
      INSERT INTO stock_movements (
        id, business_id, product_id, type, quantity, reference_type, notes,
        user_id, user_name, user_role, previous_stock, added_stock, new_stock,
        previous_price, new_price, reason
      ) VALUES (
        ?, 'biz_al_ameen_01', ?, ?, ?, 'manual_adjustment', ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `).run(
      'sm_' + Date.now(),
      productId,
      type,
      quantity,
      notes,
      auditUser?.userId || null,
      auditUser?.userName || null,
      auditUser?.userRole || null,
      prevStock,
      type === 'in' ? quantity : (type === 'out' ? -quantity : (newStock - prevStock)),
      newStock,
      prod.selling_price || 0,
      prod.selling_price || 0,
      auditUser?.reason || notes || 'Manual adjustment'
    );
  });
  run();
}

// -------------------------------------------------------------
// QUOTATIONS
// -------------------------------------------------------------
export function getQuotations() {
  const db = getDb();
  return db.prepare(`
    SELECT q.*, c.name as customer_name, c.phone as customer_phone
    FROM quotations q
    JOIN customers c ON q.customer_id = c.id
    ORDER BY q.created_at DESC
  `).all() as any[];
}

export function getQuotationById(id: string) {
  const db = getDb();
  const quotation = db.prepare(`
    SELECT q.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.gstin as customer_gstin, c.state as customer_state
    FROM quotations q
    JOIN customers c ON q.customer_id = c.id
    WHERE q.id = ?
  `).get(id) as any;
  if (!quotation) return null;

  const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(id) as any[];
  return { ...quotation, items };
}

export function createQuotation(data: any) {
  const db = getDb();
  const id = data.id || ('qt_' + Date.now());
  const quotationNumber = data.quotation_number ? String(data.quotation_number).trim() : getNextQuotationNumber();

  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO quotations (
        id, business_id, quotation_number, customer_id, site_address, validity_date,
        subtotal, discount, taxable_amount, cgst, sgst, igst, total_tax,
        installation_charges, transport_charges, grand_total, status, terms, notes
      ) VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, quotationNumber, data.customer_id, data.site_address || '', data.validity_date || '',
      data.subtotal || 0, data.discount ?? data.discount_amount ?? 0, data.taxable_amount || 0,
      data.cgst ?? data.cgst_amount ?? 0, data.sgst ?? data.sgst_amount ?? 0, data.igst ?? data.igst_amount ?? 0, data.total_tax ?? data.totalTax ?? 0,
      data.installation_charges || 0, data.transport_charges || 0,
      data.grand_total ?? data.total_amount ?? 0, data.status || 'draft', data.terms || '', data.notes || ''
    );

    // Auto-advance business_settings.next_quotation_number if applicable
    const numMatch = quotationNumber.match(/(\d+)$/);
    if (numMatch) {
      const usedNum = parseInt(numMatch[1], 10);
      const settings = getBusinessSettings();
      if (settings && usedNum >= (settings.next_quotation_number || 1)) {
        db.prepare('UPDATE business_settings SET next_quotation_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(usedNum + 1, settings.id);
      }
    }

    if (Array.isArray(data.items)) {
      const itemStmt = db.prepare(`
        INSERT INTO quotation_items (
          id, quotation_id, product_id, item_type, description, hsn_code, width, height, measurement_unit,
          width_ft, height_ft, area_sqft, rate_per_sqft, quantity, unit_price,
          material_charges, motor_charges, spring_charges, gearbox_charges, installation_charges,
          discount, taxable_amount, gst_rate, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        itemStmt.run(
          `qitem_${id}_${i}`, id, item.product_id || null,
          item.item_type || (item.product_id ? 'product' : 'shutter'),
          item.description || 'Item',
          item.hsn_code || (item.item_type === 'service' ? '998719' : (item.item_type === 'product' ? '8501' : '7308')),
          item.width || 0, item.height || 0,
          item.measurement_unit || (item.item_type === 'service' ? (item.unit || 'Job') : (item.item_type === 'product' ? (item.unit || 'Nos') : 'Feet')),
          item.width_ft || 0, item.height_ft || 0, item.area_sqft || 0,
          item.rate_per_sqft || 0, item.quantity || 1, item.unit_price || 0,
          item.material_charges || 0, item.motor_charges || 0,
          item.spring_charges || 0, item.gearbox_charges || 0,
          item.installation_charges || 0, item.discount || 0,
          item.taxable_amount || 0, item.gst_rate || 18, item.total_amount || 0
        );
      }
    }
  });

  run();
  return getQuotationById(id);
}

export function updateQuotationStatus(id: string, status: string) {
  const db = getDb();
  db.prepare('UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  return getQuotationById(id);
}

export function deleteQuotation(id: string) {
  const db = getDb();
  const quotation = getQuotationById(id);
  if (!quotation) throw new Error('Quotation not found');

  const run = db.transaction(() => {
    db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(id);
    db.prepare('DELETE FROM quotations WHERE id = ?').run(id);
  });

  run();
  return { success: true };
}

// -------------------------------------------------------------
// SALES INVOICES
// -------------------------------------------------------------
export function getSalesInvoices() {
  const db = getDb();
  return db.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone,
           ewb.eway_bill_number, ewb.status as eway_bill_status, ewb.id as eway_bill_id,
           ewb.valid_until as eway_bill_valid_until
    FROM sales_invoices s
    JOIN customers c ON s.customer_id = c.id
    LEFT JOIN eway_bills ewb ON (ewb.invoice_id = s.id AND ewb.status != 'cancelled')
    ORDER BY s.issue_date DESC, s.created_at DESC
  `).all() as any[];
}

export function getSalesInvoiceById(id: string) {
  const db = getDb();
  const invoice = db.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.gstin as customer_gstin, c.state as customer_state,
           ewb.eway_bill_number, ewb.status as eway_bill_status, ewb.id as eway_bill_id,
           ewb.valid_until as eway_bill_valid_until
    FROM sales_invoices s
    JOIN customers c ON s.customer_id = c.id
    LEFT JOIN eway_bills ewb ON (ewb.invoice_id = s.id AND ewb.status != 'cancelled')
    WHERE s.id = ?
  `).get(id) as any;
  if (!invoice) return null;

  const items = db.prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?').all(id) as any[];
  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(id) as any[];
  const ewayBills = db.prepare('SELECT * FROM eway_bills WHERE invoice_id = ? ORDER BY created_at DESC').all(id) as any[];

  return { ...invoice, items, payments, ewayBills };
}

export function createSalesInvoice(data: any) {
  const db = getDb();
  const id = data.id || ('inv_' + Date.now());
  const invoiceNumber = data.invoice_number ? String(data.invoice_number).trim() : getNextInvoiceNumber();

  const grandTotal = Number(data.grand_total ?? data.total_amount ?? 0);
  const paidAmount = Number(data.paid_amount || 0);
  const balanceAmount = Math.max(0, grandTotal - paidAmount);
  const paymentStatus = balanceAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO sales_invoices (
        id, business_id, invoice_number, quotation_id, customer_id, invoice_type,
        issue_date, due_date, site_address, subtotal, discount, taxable_amount,
        is_interstate, cgst, sgst, igst, total_tax, installation_charges, transport_charges,
        grand_total, paid_amount, balance_amount, payment_status, terms, notes,
        created_by_user_id, created_by_name
      ) VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, invoiceNumber, data.quotation_id || null, data.customer_id, data.invoice_type || 'tax_invoice',
      data.issue_date || new Date().toISOString().split('T')[0], data.due_date || '',
      data.site_address || '', data.subtotal || 0, data.discount ?? data.discount_amount ?? 0, data.taxable_amount || 0,
      data.is_interstate ? 1 : 0, data.cgst ?? data.cgst_amount ?? 0, data.sgst ?? data.sgst_amount ?? 0, data.igst ?? data.igst_amount ?? 0,
      data.total_tax ?? data.totalTax ?? 0, data.installation_charges || 0, data.transport_charges || 0,
      grandTotal, paidAmount, balanceAmount, paymentStatus, data.terms || '', data.notes || '',
      data.created_by_user_id || null, data.created_by_name || null
    );

    // Auto-advance business_settings.next_invoice_number if applicable
    const numMatch = invoiceNumber.match(/(\d+)$/);
    if (numMatch) {
      const usedNum = parseInt(numMatch[1], 10);
      const settings = getBusinessSettings();
      if (settings && usedNum >= (settings.next_invoice_number || 1)) {
        db.prepare('UPDATE business_settings SET next_invoice_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(usedNum + 1, settings.id);
      }
    }

    // Update customer current balance
    db.prepare(`
      UPDATE customers SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(balanceAmount, data.customer_id);

    // Insert Items and deduct stock
    if (Array.isArray(data.items)) {
      const itemStmt = db.prepare(`
        INSERT INTO sales_invoice_items (
          id, invoice_id, product_id, item_type, description, hsn_code, width, height, measurement_unit,
          width_ft, height_ft, area_sqft, rate_per_sqft, quantity, unit_price,
          material_charges, motor_charges, spring_charges, gearbox_charges, installation_charges,
          discount, taxable_amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        itemStmt.run(
          `sitem_${id}_${i}`, id, item.product_id || null,
          item.item_type || (item.product_id ? 'product' : 'shutter'),
          item.description || 'Item',
          item.hsn_code || (item.item_type === 'service' ? '998719' : (item.item_type === 'product' ? '8501' : '7308')),
          item.width || 0, item.height || 0,
          item.measurement_unit || (item.item_type === 'service' ? (item.unit || 'Job') : (item.item_type === 'product' ? (item.unit || 'Nos') : 'Feet')),
          item.width_ft || 0, item.height_ft || 0, item.area_sqft || 0,
          item.rate_per_sqft || 0, item.quantity || 1, item.unit_price || 0,
          item.material_charges || 0, item.motor_charges || 0,
          item.spring_charges || 0, item.gearbox_charges || 0,
          item.installation_charges || 0, item.discount || 0,
          item.taxable_amount || 0, item.gst_rate || 18,
          item.cgst_amount || 0, item.sgst_amount || 0, item.igst_amount || 0,
          item.total_amount || 0
        );

        // Deduct inventory if product is linked and is a stock-tracked physical product (NEVER for services)
        if (item.product_id) {
          const prod = db.prepare('SELECT item_type, track_stock FROM products WHERE id = ?').get(item.product_id) as any;
          const isService = item.item_type === 'service' || (prod && prod.item_type === 'service');
          const isTracked = prod ? (prod.track_stock !== 0) : true;

          if (!isService && isTracked) {
            const qty = Number(item.quantity) || 1;
            db.prepare('UPDATE products SET current_stock = MAX(0, current_stock - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(qty, item.product_id);
            db.prepare(`
              INSERT INTO stock_movements (id, business_id, product_id, type, quantity, reference_type, reference_id, notes)
              VALUES (?, 'biz_al_ameen_01', ?, 'out', ?, 'sales_invoice', ?, 'Sold via Invoice ' || ?)
            `).run(`sm_inv_${id}_${i}`, item.product_id, qty, id, invoiceNumber);
          }
        }
      }
    }

    // Record advance payment if paidAmount > 0
    if (paidAmount > 0) {
      const paymentId = 'pay_' + Date.now();
      db.prepare(`
        INSERT INTO payments (
          id, business_id, payment_number, type, entity_type, entity_id, invoice_id,
          amount, payment_mode, reference_number, notes, payment_date
        ) VALUES (?, 'biz_al_ameen_01', ?, 'in', 'customer', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId, `RCP-${Math.floor(100 + Math.random() * 900)}`, data.customer_id, id,
        paidAmount, data.payment_mode || 'Cash', data.payment_reference || '',
        'Advance payment received against ' + invoiceNumber,
        data.issue_date || new Date().toISOString().split('T')[0]
      );
    }

    // If converted from quotation, update quotation status
    if (data.quotation_id) {
      db.prepare("UPDATE quotations SET status = 'converted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(data.quotation_id);
    }
  });

  run();
  return getSalesInvoiceById(id);
}

// Convert Quotation to Invoice (Generates independent invoice number)
export function convertQuotationToInvoice(quotationId: string) {
  const quotation = getQuotationById(quotationId);
  if (!quotation) throw new Error('Quotation not found');
  if (quotation.status === 'converted') {
    throw new Error('This quotation has already been converted to an invoice.');
  }

  // Generates next independent invoice number
  const nextInvoiceNumber = getNextInvoiceNumber();

  const invoiceData = {
    invoice_number: nextInvoiceNumber,
    quotation_id: quotation.id,
    customer_id: quotation.customer_id,
    site_address: quotation.site_address,
    issue_date: new Date().toISOString().split('T')[0],
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    taxable_amount: quotation.taxable_amount,
    is_interstate: quotation.igst > 0,
    cgst: quotation.cgst,
    sgst: quotation.sgst,
    igst: quotation.igst,
    total_tax: quotation.total_tax,
    installation_charges: quotation.installation_charges,
    transport_charges: quotation.transport_charges,
    grand_total: quotation.grand_total ?? quotation.total_amount ?? 0,
    paid_amount: 0,
    terms: quotation.terms,
    notes: 'Converted from quotation #' + quotation.quotation_number,
    items: (quotation.items || []).map((it: any) => ({
      product_id: it.product_id || null,
      item_type: it.item_type || (it.product_id ? 'product' : 'shutter'),
      description: it.description,
      hsn_code: it.hsn_code || (it.item_type === 'service' ? '998719' : (it.item_type === 'product' ? '8501' : '7308')),
      width: it.width,
      height: it.height,
      measurement_unit: it.measurement_unit,
      width_ft: it.width_ft,
      height_ft: it.height_ft,
      area_sqft: it.area_sqft,
      rate_per_sqft: it.rate_per_sqft,
      quantity: it.quantity,
      unit_price: it.unit_price,
      material_charges: it.material_charges || 0,
      motor_charges: it.motor_charges || 0,
      spring_charges: it.spring_charges || 0,
      gearbox_charges: it.gearbox_charges || 0,
      installation_charges: it.installation_charges || 0,
      discount: it.discount || 0,
      taxable_amount: it.taxable_amount,
      gst_rate: it.gst_rate,
      cgst_amount: it.cgst_amount || ((it.taxable_amount || 0) * (it.gst_rate || 18) / 200),
      sgst_amount: it.sgst_amount || ((it.taxable_amount || 0) * (it.gst_rate || 18) / 200),
      igst_amount: it.igst_amount || 0,
      total_amount: it.total_amount,
    })),
  };

  return createSalesInvoice(invoiceData);
}

// Safely delete a sales invoice, rolling back inventory movements and customer balance
export function deleteSalesInvoice(id: string) {
  const db = getDb();
  const invoice = getSalesInvoiceById(id);
  if (!invoice) throw new Error('Invoice not found');

  const run = db.transaction(() => {
    // 1. Restore product stock if physical products were sold
    const items = db.prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?').all(id) as any[];
    for (const item of items) {
      if (item.product_id && item.item_type !== 'service') {
        const qty = Number(item.quantity) || 1;
        db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(qty, item.product_id);
      }
    }

    // 2. Remove stock movements
    db.prepare("DELETE FROM stock_movements WHERE reference_type = 'sales_invoice' AND reference_id = ?").run(id);

    // 3. Remove payments attached specifically to this invoice
    db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(id);

    // 4. Update customer balance (subtract balance_amount)
    if (invoice.balance_amount > 0) {
      db.prepare('UPDATE customers SET current_balance = MAX(0, current_balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(invoice.balance_amount, invoice.customer_id);
    }

    // 5. If this invoice was converted from a quotation, reset quotation status
    if (invoice.quotation_id) {
      db.prepare("UPDATE quotations SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(invoice.quotation_id);
    }

    // 6. Delete invoice items & invoice
    db.prepare('DELETE FROM sales_invoice_items WHERE invoice_id = ?').run(id);
    db.prepare('DELETE FROM sales_invoices WHERE id = ?').run(id);
  });

  run();
  return { success: true };
}

// -------------------------------------------------------------
// PURCHASES & SUPPLIERS
// -------------------------------------------------------------
export function getPurchases() {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, s.name as supplier_name, s.phone as supplier_phone
    FROM purchase_invoices p
    JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.invoice_date DESC
  `).all() as any[];
}

export function createPurchase(data: any) {
  const db = getDb();
  const id = 'pi_' + Date.now();
  const count = (db.prepare('SELECT COUNT(*) as c FROM purchase_invoices').get() as any).c + 2088;
  const purchaseNumber = `PI-${count}`;

  const grandTotal = Number(data.grand_total || 0);
  const paidAmount = Number(data.paid_amount || 0);
  const balanceAmount = Math.max(0, grandTotal - paidAmount);
  const paymentStatus = balanceAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO purchase_invoices (
        id, business_id, purchase_number, supplier_id, invoice_date, due_date,
        subtotal, discount, tax_amount, grand_total, paid_amount, balance_amount, payment_status, notes
      ) VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, purchaseNumber, data.supplier_id, data.invoice_date || new Date().toISOString().split('T')[0],
      data.due_date || '', data.subtotal || 0, data.discount || 0, data.tax_amount || 0,
      grandTotal, paidAmount, balanceAmount, paymentStatus, data.notes || ''
    );

    // Update supplier balance
    db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(balanceAmount, data.supplier_id);

    // Insert purchase items & increase stock
    if (Array.isArray(data.items)) {
      const itemStmt = db.prepare(`
        INSERT INTO purchase_items (id, purchase_id, product_id, description, quantity, unit_price, gst_rate, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        itemStmt.run(
          `pitem_${id}_${i}`, id, item.product_id || null, item.description,
          item.quantity || 1, item.unit_price || 0, item.gst_rate || 18, item.total_amount || 0
        );

        if (item.product_id) {
          const qty = item.quantity || 1;
          db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?').run(qty, item.product_id);
          db.prepare(`
            INSERT INTO stock_movements (id, business_id, product_id, type, quantity, reference_type, reference_id, notes)
            VALUES (?, 'biz_al_ameen_01', ?, 'in', ?, 'purchase_invoice', ?, 'Received via Purchase ' || ?)
          `).run(`sm_pi_${id}_${i}`, item.product_id, qty, id, purchaseNumber);
        }
      }
    }
  });

  run();
  return db.prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(id) as any;
}

// -------------------------------------------------------------
// PAYMENTS & EXPENSES
// -------------------------------------------------------------
export function getPayments(type?: 'in' | 'out') {
  const db = getDb();
  if (type) {
    return db.prepare(`
      SELECT p.*,
        CASE WHEN p.entity_type = 'customer' THEN (SELECT name FROM customers WHERE id = p.entity_id)
             ELSE (SELECT name FROM suppliers WHERE id = p.entity_id) END as entity_name
      FROM payments p
      WHERE p.type = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
    `).all(type) as any[];
  }
  return db.prepare(`
    SELECT p.*,
      CASE WHEN p.entity_type = 'customer' THEN (SELECT name FROM customers WHERE id = p.entity_id)
           ELSE (SELECT name FROM suppliers WHERE id = p.entity_id) END as entity_name
    FROM payments p
    ORDER BY p.payment_date DESC, p.created_at DESC
  `).all() as any[];
}

export function createPayment(data: any) {
  const db = getDb();
  const id = 'pay_' + Date.now();
  const paymentNumber = (data.type === 'in' ? 'RCP-' : 'PAY-') + Math.floor(100 + Math.random() * 900);

  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO payments (
        id, business_id, payment_number, type, entity_type, entity_id, invoice_id,
        amount, payment_mode, reference_number, notes, payment_date
      ) VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, paymentNumber, data.type, data.entity_type, data.entity_id, data.invoice_id || null,
      data.amount, data.payment_mode || 'Cash', data.reference_number || '',
      data.notes || '', data.payment_date || new Date().toISOString().split('T')[0]
    );

    // If payment for customer, reduce balance
    if (data.entity_type === 'customer') {
      db.prepare('UPDATE customers SET current_balance = MAX(0, current_balance - ?) WHERE id = ?').run(data.amount, data.entity_id);
      if (data.invoice_id) {
        db.prepare(`
          UPDATE sales_invoices
          SET paid_amount = paid_amount + ?,
              balance_amount = MAX(0, balance_amount - ?),
              payment_status = CASE WHEN balance_amount - ? <= 0 THEN 'paid' ELSE 'partial' END
          WHERE id = ?
        `).run(data.amount, data.amount, data.amount, data.invoice_id);
      }
    } else if (data.entity_type === 'supplier') {
      db.prepare('UPDATE suppliers SET balance = MAX(0, balance - ?) WHERE id = ?').run(data.amount, data.entity_id);
      if (data.invoice_id) {
        db.prepare(`
          UPDATE purchase_invoices
          SET paid_amount = paid_amount + ?,
              balance_amount = MAX(0, balance_amount - ?),
              payment_status = CASE WHEN balance_amount - ? <= 0 THEN 'paid' ELSE 'partial' END
          WHERE id = ?
        `).run(data.amount, data.amount, data.amount, data.invoice_id);
      }
    }
  });

  run();
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
}

export function getExpenses(category?: string) {
  const db = getDb();
  if (category && category !== 'All') {
    return db.prepare('SELECT * FROM expenses WHERE category = ? ORDER BY expense_date DESC').all(category) as any[];
  }
  return db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC').all() as any[];
}

export function createExpense(data: any) {
  const db = getDb();
  const id = 'exp_' + Date.now();
  const count = (db.prepare('SELECT COUNT(*) as c FROM expenses').get() as any).c + 202;
  const expenseNumber = `EXP-${count}`;

  db.prepare(`
    INSERT INTO expenses (id, business_id, expense_number, category, title, amount, payment_mode, expense_date, notes)
    VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, expenseNumber, data.category, data.title, data.amount,
    data.payment_mode || 'Cash', data.expense_date || new Date().toISOString().split('T')[0],
    data.notes || ''
  );
  return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any;
}

// -------------------------------------------------------------
// MANUFACTURING JOBS
// -------------------------------------------------------------
export function getManufacturingJobs() {
  const db = getDb();
  return db.prepare(`
    SELECT j.*, c.name as customer_name, c.phone as customer_phone
    FROM manufacturing_jobs j
    JOIN customers c ON j.customer_id = c.id
    ORDER BY j.created_at DESC
  `).all() as any[];
}

export function createManufacturingJob(data: any) {
  const db = getDb();
  const id = 'job_' + Date.now();
  const count = (db.prepare('SELECT COUNT(*) as c FROM manufacturing_jobs').get() as any).c + 103;
  const jobNumber = `JB-${count}`;

  db.prepare(`
    INSERT INTO manufacturing_jobs (
      id, business_id, job_number, quotation_id, invoice_id, customer_id,
      shutter_type, material_type, width, height, area_sqft, site_address,
      assigned_staff, start_date, expected_completion_date,
      manufacturing_cost, installation_cost, status, notes
    ) VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, jobNumber, data.quotation_id || null, data.invoice_id || null, data.customer_id,
    data.shutter_type, data.material_type || '', data.width || 0, data.height || 0,
    data.area_sqft || 0, data.site_address || '', data.assigned_staff || 'Workshop Team',
    data.start_date || new Date().toISOString().split('T')[0], data.expected_completion_date || '',
    data.manufacturing_cost || 0, data.installation_cost || 0,
    data.status || 'New Order', data.notes || ''
  );
  return db.prepare('SELECT * FROM manufacturing_jobs WHERE id = ?').get(id) as any;
}

export function updateJobStatus(id: string, status: string) {
  const db = getDb();
  db.prepare('UPDATE manufacturing_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  return db.prepare('SELECT * FROM manufacturing_jobs WHERE id = ?').get(id) as any;
}

// -------------------------------------------------------------
// INSTALLATIONS & SERVICES
// -------------------------------------------------------------
export function getInstallations() {
  const db = getDb();
  return db.prepare(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone
    FROM installations i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.scheduled_date DESC
  `).all() as any[];
}

export function createInstallation(data: any) {
  const db = getDb();
  const id = 'inst_' + Date.now();
  db.prepare(`
    INSERT INTO installations (
      id, business_id, job_id, customer_id, site_address, technician_name,
      scheduled_date, service_charges, status, notes
    ) VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.job_id || null, data.customer_id, data.site_address,
    data.technician_name, data.scheduled_date, data.service_charges || 0,
    data.status || 'Scheduled', data.notes || ''
  );
  return db.prepare('SELECT * FROM installations WHERE id = ?').get(id) as any;
}

export function getServiceRequests() {
  const db = getDb();
  return db.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone
    FROM service_requests s
    JOIN customers c ON s.customer_id = c.id
    ORDER BY s.created_at DESC
  `).all() as any[];
}

export function createServiceRequest(data: any) {
  const db = getDb();
  const id = 'srv_' + Date.now();
  const count = (db.prepare('SELECT COUNT(*) as c FROM service_requests').get() as any).c + 1002;
  const ticketNumber = `SR-${count}`;

  db.prepare(`
    INSERT INTO service_requests (
      id, business_id, ticket_number, customer_id, product_name,
      issue_description, technician_name, visit_date, service_charges, status, notes
    ) VALUES (?, 'biz_al_ameen_01', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, ticketNumber, data.customer_id, data.product_name, data.issue_description,
    data.technician_name || '', data.visit_date || '', data.service_charges || 0,
    data.status || 'Open', data.notes || ''
  );
  return db.prepare('SELECT * FROM service_requests WHERE id = ?').get(id) as any;
}

// -------------------------------------------------------------
// E-WAY BILL MODULE
// -------------------------------------------------------------

export function getEWayBillSettings() {
  const db = getDb();
  let settings = db.prepare('SELECT * FROM eway_bill_settings WHERE business_id = ?').get('biz_al_ameen_01') as any;
  if (!settings) {
    const id = 'ewb_set_' + Date.now();
    db.prepare(`
      INSERT INTO eway_bill_settings (
        id, business_id, environment, gsp_provider, api_username, api_password,
        client_id, client_secret, gstin, default_transporter_id, default_transporter_name,
        default_vehicle_number, default_from_address, default_from_place, default_from_pincode,
        default_from_state_code, auto_calculate_distance
      ) VALUES (
        ?, 'biz_al_ameen_01', 'sandbox', 'manual', '', '',
        '', '', '33CRHPD7107H1Z3', '', '',
        'TN28AB1234', '13-A, Omalur Main Road, Near Bus Stand', 'Salem', '636001',
        '33', 1
      )
    `).run(id);
    settings = db.prepare('SELECT * FROM eway_bill_settings WHERE id = ?').get(id) as any;
  }
  return settings;
}

export function updateEWayBillSettings(data: any) {
  const db = getDb();
  const current = getEWayBillSettings();
  db.prepare(`
    UPDATE eway_bill_settings SET
      environment = ?,
      gsp_provider = ?,
      api_username = ?,
      api_password = ?,
      client_id = ?,
      client_secret = ?,
      gstin = ?,
      default_transporter_id = ?,
      default_transporter_name = ?,
      default_vehicle_number = ?,
      default_from_address = ?,
      default_from_place = ?,
      default_from_pincode = ?,
      default_from_state_code = ?,
      auto_calculate_distance = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.environment ?? current.environment,
    data.gsp_provider ?? current.gsp_provider,
    data.api_username ?? current.api_username,
    data.api_password ?? current.api_password,
    data.client_id ?? current.client_id,
    data.client_secret ?? current.client_secret,
    data.gstin ?? current.gstin,
    data.default_transporter_id ?? current.default_transporter_id,
    data.default_transporter_name ?? current.default_transporter_name,
    data.default_vehicle_number ?? current.default_vehicle_number,
    data.default_from_address ?? current.default_from_address,
    data.default_from_place ?? current.default_from_place,
    data.default_from_pincode ?? current.default_from_pincode,
    data.default_from_state_code ?? current.default_from_state_code,
    data.auto_calculate_distance !== undefined ? (data.auto_calculate_distance ? 1 : 0) : current.auto_calculate_distance,
    current.id
  );
  return getEWayBillSettings();
}

export function logEWayBillAction(
  action: string,
  ewayBillId: string | null,
  requestPayload: any,
  responsePayload: any,
  status: 'success' | 'failure',
  errorMessage?: string
) {
  const db = getDb();
  const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  db.prepare(`
    INSERT INTO eway_bill_logs (id, eway_bill_id, action, request_payload, response_payload, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    ewayBillId,
    action,
    requestPayload ? (typeof requestPayload === 'string' ? requestPayload : JSON.stringify(requestPayload)) : null,
    responsePayload ? (typeof responsePayload === 'string' ? responsePayload : JSON.stringify(responsePayload)) : null,
    status,
    errorMessage || null
  );
  return id;
}

export function getEWayBillLogs(ewayBillId?: string) {
  const db = getDb();
  if (ewayBillId) {
    return db.prepare('SELECT * FROM eway_bill_logs WHERE eway_bill_id = ? ORDER BY created_at DESC').all(ewayBillId) as any[];
  }
  return db.prepare('SELECT * FROM eway_bill_logs ORDER BY created_at DESC LIMIT 50').all() as any[];
}

export function getEWayBills(filter?: { status?: string; invoiceId?: string; search?: string }) {
  const db = getDb();

  // Lazily update expired bills where valid_until is past and status is active
  try {
    db.prepare(`
      UPDATE eway_bills
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active'
        AND valid_until IS NOT NULL
        AND valid_until != ''
        AND datetime(valid_until) < datetime('now', 'localtime')
    `).run();
  } catch (e) {
    // Graceful fallback for non-ISO formatted date strings
  }

  let sql = `
    SELECT e.*,
           s.invoice_number,
           s.grand_total as invoice_grand_total,
           c.name as customer_name,
           c.phone as customer_phone
    FROM eway_bills e
    LEFT JOIN sales_invoices s ON e.invoice_id = s.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter?.status && filter.status !== 'all') {
    sql += ' AND e.status = ?';
    params.push(filter.status);
  }

  if (filter?.invoiceId) {
    sql += ' AND e.invoice_id = ?';
    params.push(filter.invoiceId);
  }

  if (filter?.search) {
    const q = `%${filter.search}%`;
    sql += ' AND (e.eway_bill_number LIKE ? OR e.doc_number LIKE ? OR e.to_name LIKE ? OR e.vehicle_number LIKE ?)';
    params.push(q, q, q, q);
  }

  sql += ' ORDER BY e.created_at DESC';

  return db.prepare(sql).all(...params) as any[];
}

export function getEWayBillById(id: string) {
  const db = getDb();
  const ewb = db.prepare(`
    SELECT e.*,
           s.invoice_number,
           s.grand_total as invoice_grand_total,
           c.name as customer_name,
           c.phone as customer_phone,
           c.address as customer_full_address
    FROM eway_bills e
    LEFT JOIN sales_invoices s ON e.invoice_id = s.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE e.id = ?
  `).get(id) as any;

  if (!ewb) return null;

  const items = db.prepare('SELECT * FROM eway_bill_items WHERE eway_bill_id = ?').all(id) as any[];
  const logs = db.prepare('SELECT * FROM eway_bill_logs WHERE eway_bill_id = ? ORDER BY created_at DESC').all(id) as any[];

  return { ...ewb, items, logs };
}

export function getEWayBillByNumber(ewbNo: string) {
  const db = getDb();
  const ewb = db.prepare(`
    SELECT e.*,
           s.invoice_number,
           s.grand_total as invoice_grand_total,
           c.name as customer_name,
           c.phone as customer_phone
    FROM eway_bills e
    LEFT JOIN sales_invoices s ON e.invoice_id = s.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE e.eway_bill_number = ?
  `).get(ewbNo) as any;

  if (!ewb) return null;
  const items = db.prepare('SELECT * FROM eway_bill_items WHERE eway_bill_id = ?').all(ewb.id) as any[];
  return { ...ewb, items };
}

export function getEWayBillByInvoiceId(invoiceId: string) {
  const db = getDb();
  const ewb = db.prepare(`
    SELECT * FROM eway_bills
    WHERE invoice_id = ? AND status != 'cancelled'
    ORDER BY created_at DESC LIMIT 1
  `).get(invoiceId) as any;
  if (!ewb) return null;
  const items = db.prepare('SELECT * FROM eway_bill_items WHERE eway_bill_id = ?').all(ewb.id) as any[];
  return { ...ewb, items };
}

export function getPendingEWayBillInvoices() {
  const db = getDb();
  return db.prepare(`
    SELECT s.id, s.invoice_number, s.issue_date, s.grand_total, s.taxable_amount,
           s.total_tax, s.is_interstate, c.name as customer_name, c.phone as customer_phone,
           c.gstin as customer_gstin, c.address as customer_address, c.state as customer_state,
           c.state_code as customer_state_code
    FROM sales_invoices s
    JOIN customers c ON s.customer_id = c.id
    WHERE (s.grand_total >= 50000 OR s.is_interstate = 1)
      AND s.id NOT IN (
        SELECT invoice_id FROM eway_bills WHERE invoice_id IS NOT NULL AND status != 'cancelled'
      )
    ORDER BY s.issue_date DESC, s.created_at DESC
  `).all() as any[];
}

export function createEWayBill(data: any) {
  const db = getDb();
  const id = data.id || ('ewb_' + Date.now());

  // Prevent duplicate active E-Way Bill for the same invoice
  if (data.invoice_id) {
    const existing = db.prepare(`
      SELECT id, eway_bill_number FROM eway_bills
      WHERE invoice_id = ? AND status != 'cancelled'
    `).get(data.invoice_id) as any;
    if (existing) {
      throw new Error(`An active E-Way Bill (#${existing.eway_bill_number || existing.id}) already exists for this invoice.`);
    }
  }

  // Calculate default valid_until if not provided (1 day per 200 km for regular cargo, min 1 day)
  let validUntil = data.valid_until;
  if (!validUntil) {
    const distance = Number(data.distance_km || 20);
    const daysValid = Math.max(1, Math.ceil(distance / 200));
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + daysValid);
    validDate.setHours(23, 59, 59, 0);
    validUntil = validDate.toISOString().replace('T', ' ').substring(0, 19);
  }

  const ewayBillDate = data.eway_bill_date || new Date().toISOString().replace('T', ' ').substring(0, 19);

  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO eway_bills (
        id, business_id, invoice_id, eway_bill_number, eway_bill_date, valid_until,
        status, generation_method, supply_type, sub_supply_type, doc_type, doc_number, doc_date,
        transaction_type, from_name, from_gstin, from_address, from_place, from_pincode, from_state_code,
        to_name, to_gstin, to_address, to_place, to_pincode, to_state_code,
        dispatch_from_address, dispatch_from_place, dispatch_from_pincode, dispatch_from_state_code,
        ship_to_address, ship_to_place, ship_to_pincode, ship_to_state_code,
        transport_mode, distance_km, transporter_name, transporter_id, transporter_doc_no, transporter_doc_date,
        vehicle_number, vehicle_type, total_taxable_amount, cgst_amount, sgst_amount, igst_amount,
        cess_amount, other_charges, total_invoice_value, qr_code_data, nic_payload
      ) VALUES (
        ?, 'biz_al_ameen_01', ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      id,
      data.invoice_id || null,
      data.eway_bill_number || null,
      ewayBillDate,
      validUntil,
      data.status || 'active',
      data.generation_method || 'manual',
      data.supply_type || 'O',
      data.sub_supply_type || '1',
      data.doc_type || 'INV',
      data.doc_number || '',
      data.doc_date || new Date().toISOString().split('T')[0],
      data.transaction_type || 'regular',
      data.from_name || 'Al Ameen Automation',
      data.from_gstin || '33CRHPD7107H1Z3',
      data.from_address || '',
      data.from_place || 'Salem',
      data.from_pincode || '636001',
      data.from_state_code || '33',
      data.to_name || '',
      data.to_gstin || '',
      data.to_address || '',
      data.to_place || '',
      data.to_pincode || '',
      data.to_state_code || '33',
      data.dispatch_from_address || null,
      data.dispatch_from_place || null,
      data.dispatch_from_pincode || null,
      data.dispatch_from_state_code || null,
      data.ship_to_address || null,
      data.ship_to_place || null,
      data.ship_to_pincode || null,
      data.ship_to_state_code || null,
      data.transport_mode || '1',
      Number(data.distance_km || 20),
      data.transporter_name || '',
      data.transporter_id || '',
      data.transporter_doc_no || '',
      data.transporter_doc_date || '',
      (data.vehicle_number || '').toUpperCase().replace(/\s+/g, ''),
      data.vehicle_type || 'R',
      Number(data.total_taxable_amount || 0),
      Number(data.cgst_amount || 0),
      Number(data.sgst_amount || 0),
      Number(data.igst_amount || 0),
      Number(data.cess_amount || 0),
      Number(data.other_charges || 0),
      Number(data.total_invoice_value || 0),
      data.qr_code_data || null,
      data.nic_payload ? (typeof data.nic_payload === 'string' ? data.nic_payload : JSON.stringify(data.nic_payload)) : null
    );

    // Insert Items
    if (Array.isArray(data.items) && data.items.length > 0) {
      const itemStmt = db.prepare(`
        INSERT INTO eway_bill_items (
          id, eway_bill_id, product_name, product_desc, hsn_code, quantity, unit,
          taxable_amount, gst_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
          igst_rate, igst_amount, cess_rate, cess_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const itemId = 'ewb_item_' + Date.now() + '_' + i;
        itemStmt.run(
          itemId,
          id,
          item.product_name || item.description || 'Shutter Component',
          item.product_desc || item.description || '',
          item.hsn_code || '7308',
          Number(item.quantity || 1),
          item.unit || item.qtyUnit || 'NOS',
          Number(item.taxable_amount || item.taxableAmount || 0),
          Number(item.gst_rate || item.gstRate || 18),
          Number(item.cgst_rate || 9),
          Number(item.cgst_amount || item.cgstAmount || 0),
          Number(item.sgst_rate || 9),
          Number(item.sgst_amount || item.sgstAmount || 0),
          Number(item.igst_rate || 0),
          Number(item.igst_amount || item.igstAmount || 0),
          Number(item.cess_rate || 0),
          Number(item.cess_amount || 0),
          Number(item.total_amount || item.totalAmount || 0)
        );
      }
    }

    // Link back to sales_invoices
    if (data.invoice_id) {
      db.prepare(`
        UPDATE sales_invoices
        SET eway_bill_number = ?, eway_bill_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(data.eway_bill_number || id, id, data.invoice_id);
    }
  });

  run();
  return getEWayBillById(id);
}

export function updateEWayBillVehicle(id: string, data: {
  vehicle_number: string;
  transport_doc_no?: string;
  transport_doc_date?: string;
  from_place?: string;
  from_state_code?: string;
  reason_code?: string;
  remarks?: string;
}) {
  const db = getDb();
  const current = getEWayBillById(id);
  if (!current) throw new Error('E-Way Bill not found');
  if (current.status === 'cancelled') throw new Error('Cannot update vehicle details for a cancelled E-Way Bill');

  const formattedVehicle = (data.vehicle_number || '').toUpperCase().replace(/\s+/g, '');

  db.prepare(`
    UPDATE eway_bills SET
      vehicle_number = ?,
      transporter_doc_no = COALESCE(?, transporter_doc_no),
      transporter_doc_date = COALESCE(?, transporter_doc_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    formattedVehicle,
    data.transport_doc_no || null,
    data.transport_doc_date || null,
    id
  );

  logEWayBillAction(
    'update_vehicle',
    id,
    data,
    { success: true, updated_vehicle: formattedVehicle },
    'success'
  );

  return getEWayBillById(id);
}

export function cancelEWayBill(id: string, reasonCode: string, remarks: string) {
  const db = getDb();
  const current = getEWayBillById(id);
  if (!current) throw new Error('E-Way Bill not found');
  if (current.status === 'cancelled') throw new Error('E-Way Bill is already cancelled');

  const run = db.transaction(() => {
    db.prepare(`
      UPDATE eway_bills SET
        status = 'cancelled',
        cancel_reason_code = ?,
        cancel_remarks = ?,
        cancelled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reasonCode, remarks, id);

    // Unlink from sales invoice if this was the active eway bill
    if (current.invoice_id) {
      db.prepare(`
        UPDATE sales_invoices
        SET eway_bill_number = NULL, eway_bill_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND eway_bill_id = ?
      `).run(current.invoice_id, id);
    }
  });

  run();

  logEWayBillAction(
    'cancel',
    id,
    { reason_code: reasonCode, remarks },
    { success: true, cancelled_at: new Date().toISOString() },
    'success'
  );

  return getEWayBillById(id);
}

// =============================================================
// USERS & CASHIERS
// =============================================================

export function getUserById(id: string) {
  const db = getDb();
  return db.prepare('SELECT id, email, username, full_name, phone, role, is_active, last_login, created_at, updated_at FROM users WHERE id = ?').get(id) as any;
}

export function getUserByIdentifier(identifier: string) {
  const db = getDb();
  const clean = identifier.trim().toLowerCase();
  return db.prepare(`
    SELECT * FROM users
    WHERE LOWER(email) = ? OR LOWER(username) = ?
    LIMIT 1
  `).get(clean, clean) as any;
}

export function updateLastLogin(id: string) {
  try {
    const db = getDb();
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  } catch (err: any) {
    console.warn('updateLastLogin notice (read-only mode):', err?.message);
  }
}

export function getCashiers() {
  const db = getDb();
  return db.prepare(`
    SELECT id, email, username, full_name, phone, role, is_active, last_login, created_at, updated_at
    FROM users
    WHERE role = 'cashier'
    ORDER BY created_at DESC
  `).all() as any[];
}

export function createCashier(data: {
  email: string;
  username: string;
  full_name: string;
  phone?: string;
  password_hash: string;
}) {
  const db = getDb();
  const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(data.email.trim());
  if (existingEmail) throw new Error('A user with this email already exists.');

  const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(data.username.trim());
  if (existingUser) throw new Error('A cashier with this username already exists.');

  const id = 'usr_csh_' + Date.now();
  db.prepare(`
    INSERT INTO users (id, email, username, full_name, phone, role, password_hash, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'cashier', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    id,
    data.email.trim().toLowerCase(),
    data.username.trim().toLowerCase(),
    data.full_name.trim(),
    data.phone || null,
    data.password_hash
  );

  return getUserById(id);
}

export function updateCashier(id: string, data: {
  full_name?: string;
  email?: string;
  username?: string;
  phone?: string;
  is_active?: boolean;
}) {
  const db = getDb();
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!current) throw new Error('Cashier not found');

  if (data.email && data.email.trim().toLowerCase() !== current.email.toLowerCase()) {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(data.email.trim(), id);
    if (existing) throw new Error('This email is already in use by another user.');
  }

  if (data.username && data.username.trim().toLowerCase() !== (current.username || '').toLowerCase()) {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?').get(data.username.trim(), id);
    if (existing) throw new Error('This username is already taken.');
  }

  db.prepare(`
    UPDATE users SET
      full_name = COALESCE(?, full_name),
      email = COALESCE(?, email),
      username = COALESCE(?, username),
      phone = COALESCE(?, phone),
      is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.full_name?.trim() || null,
    data.email ? data.email.trim().toLowerCase() : null,
    data.username ? data.username.trim().toLowerCase() : null,
    data.phone !== undefined ? data.phone : null,
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
    id
  );

  return getUserById(id);
}

export function updateCashierStatus(id: string, isActive: boolean) {
  const db = getDb();
  db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(isActive ? 1 : 0, id);
  return getUserById(id);
}

export function resetCashierPassword(id: string, passwordHash: string) {
  const db = getDb();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(passwordHash, id);
  return { success: true };
}

export function getCashierActivity(userId: string) {
  const db = getDb();
  const invoices = db.prepare(`
    SELECT id, invoice_number, grand_total, payment_status, issue_date, created_at
    FROM sales_invoices
    WHERE created_by_user_id = ?
    ORDER BY created_at DESC LIMIT 15
  `).all(userId) as any[];

  const attendanceMarked = db.prepare(`
    SELECT a.id, a.attendance_date, a.status, a.check_in_time, a.created_at,
           e.full_name as employee_name, e.emp_code
    FROM attendance_records a
    JOIN employees e ON a.employee_id = e.id
    WHERE a.marked_by_user_id = ?
    ORDER BY a.created_at DESC LIMIT 15
  `).all(userId) as any[];

  const stockAdjustments = db.prepare(`
    SELECT sm.id, sm.type, sm.quantity, sm.previous_stock, sm.added_stock, sm.new_stock, sm.reason, sm.notes, sm.created_at,
           p.name as product_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE sm.user_id = ?
    ORDER BY sm.created_at DESC LIMIT 15
  `).all(userId) as any[];

  return { invoices, attendanceMarked, stockAdjustments };
}

// =============================================================
// EMPLOYEES
// =============================================================

export function getEmployees(filter?: { status?: string; department?: string; search?: string }) {
  const db = getDb();
  let sql = 'SELECT * FROM employees WHERE 1=1';
  const params: any[] = [];

  if (filter?.status && filter.status !== 'all') {
    sql += ' AND employment_status = ?';
    params.push(filter.status);
  }

  if (filter?.department && filter.department !== 'all') {
    sql += ' AND department = ?';
    params.push(filter.department);
  }

  if (filter?.search && filter.search.trim()) {
    const s = `%${filter.search.trim()}%`;
    sql += ' AND (full_name LIKE ? OR emp_code LIKE ? OR phone LIKE ? OR job_role LIKE ?)';
    params.push(s, s, s, s);
  }

  sql += ' ORDER BY emp_code ASC';
  return db.prepare(sql).all(...params) as any[];
}

export function getEmployeeById(id: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
}

export function getNextEmployeeCode(): string {
  const db = getDb();
  const codes = db.prepare('SELECT emp_code FROM employees').all() as { emp_code: string }[];
  let maxNum = 0;
  for (const c of codes) {
    const match = c.emp_code.match(/EMP-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `EMP-${String(nextNum).padStart(3, '0')}`;
}

export function createEmployee(data: any) {
  const db = getDb();
  const id = data.id || ('emp_' + Date.now());
  const empCode = data.emp_code ? data.emp_code.trim() : getNextEmployeeCode();

  db.prepare(`
    INSERT INTO employees (
      id, business_id, emp_code, full_name, phone, alternate_phone, address,
      job_role, department, joining_date, employment_type, salary_type,
      base_salary, employment_status, notes
    ) VALUES (
      ?, 'biz_al_ameen_01', ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    id,
    empCode,
    data.full_name.trim(),
    data.phone.trim(),
    data.alternate_phone || null,
    data.address || null,
    data.job_role || 'Worker',
    data.department || 'Workshop',
    data.joining_date || new Date().toISOString().split('T')[0],
    data.employment_type || 'full_time',
    data.salary_type || 'monthly',
    Number(data.base_salary || 0),
    data.employment_status || 'active',
    data.notes || null
  );

  return getEmployeeById(id);
}

export function updateEmployee(id: string, data: any) {
  const db = getDb();
  const current = getEmployeeById(id);
  if (!current) throw new Error('Employee not found');

  db.prepare(`
    UPDATE employees SET
      emp_code = COALESCE(?, emp_code),
      full_name = COALESCE(?, full_name),
      phone = COALESCE(?, phone),
      alternate_phone = COALESCE(?, alternate_phone),
      address = COALESCE(?, address),
      job_role = COALESCE(?, job_role),
      department = COALESCE(?, department),
      joining_date = COALESCE(?, joining_date),
      employment_type = COALESCE(?, employment_type),
      salary_type = COALESCE(?, salary_type),
      base_salary = COALESCE(?, base_salary),
      employment_status = COALESCE(?, employment_status),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.emp_code ?? null,
    data.full_name ?? null,
    data.phone ?? null,
    data.alternate_phone !== undefined ? data.alternate_phone : null,
    data.address !== undefined ? data.address : null,
    data.job_role ?? null,
    data.department ?? null,
    data.joining_date ?? null,
    data.employment_type ?? null,
    data.salary_type ?? null,
    data.base_salary !== undefined ? Number(data.base_salary) : null,
    data.employment_status ?? null,
    data.notes !== undefined ? data.notes : null,
    id
  );

  return getEmployeeById(id);
}

export function deleteEmployee(id: string) {
  const db = getDb();
  // Mark inactive rather than hard delete if attendance or salary records exist
  const hasAttendance = db.prepare('SELECT id FROM attendance_records WHERE employee_id = ? LIMIT 1').get(id);
  const hasSalary = db.prepare('SELECT id FROM salary_payments WHERE employee_id = ? LIMIT 1').get(id);

  if (hasAttendance || hasSalary) {
    db.prepare("UPDATE employees SET employment_status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    return { success: true, mode: 'deactivated' };
  } else {
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    return { success: true, mode: 'deleted' };
  }
}

// =============================================================
// ATTENDANCE & AUDIT LOGS
// =============================================================

export function getDailyAttendance(dateStr: string) {
  const db = getDb();
  return db.prepare(`
    SELECT
      e.id as employee_id,
      e.emp_code,
      e.full_name,
      e.job_role,
      e.department,
      e.salary_type,
      e.base_salary,
      e.employment_status,
      a.id as attendance_id,
      COALESCE(a.status, 'unmarked') as status,
      a.check_in_time,
      a.notes,
      a.marked_by_user_id,
      a.marked_by_name,
      a.updated_at as marked_at
    FROM employees e
    LEFT JOIN attendance_records a ON (e.id = a.employee_id AND a.attendance_date = ?)
    WHERE e.employment_status = 'active'
    ORDER BY e.emp_code ASC
  `).all(dateStr) as any[];
}

export function markAttendanceBatch(
  dateStr: string,
  records: Array<{
    employee_id: string;
    status: 'present' | 'absent' | 'late' | 'half_day' | 'leave';
    check_in_time?: string;
    notes?: string;
  }>,
  markedByUserId: string,
  markedByName: string
) {
  const db = getDb();
  const run = db.transaction(() => {
    const upsertStmt = db.prepare(`
      INSERT INTO attendance_records (
        id, business_id, employee_id, attendance_date, status, check_in_time, notes,
        marked_by_user_id, marked_by_name, created_at, updated_at
      ) VALUES (
        ?, 'biz_al_ameen_01', ?, ?, ?, ?, ?,
        ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT(employee_id, attendance_date) DO UPDATE SET
        status = excluded.status,
        check_in_time = COALESCE(excluded.check_in_time, check_in_time),
        notes = excluded.notes,
        marked_by_user_id = excluded.marked_by_user_id,
        marked_by_name = excluded.marked_by_name,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const rec of records) {
      const id = 'att_' + rec.employee_id + '_' + dateStr.replace(/-/g, '');
      upsertStmt.run(
        id,
        rec.employee_id,
        dateStr,
        rec.status || 'present',
        rec.check_in_time || (rec.status === 'present' ? '09:00 AM' : null),
        rec.notes || null,
        markedByUserId,
        markedByName
      );
    }
  });

  run();
  return getDailyAttendance(dateStr);
}

export function updateAttendanceRecord(
  attendanceId: string,
  newStatus: 'present' | 'absent' | 'late' | 'half_day' | 'leave',
  reason: string,
  changedByUserId: string,
  changedByName: string
) {
  const db = getDb();
  const current = db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(attendanceId) as any;
  if (!current) throw new Error('Attendance record not found');

  const run = db.transaction(() => {
    // 1. Audit log
    const auditId = 'att_log_' + Date.now();
    db.prepare(`
      INSERT INTO attendance_audit_logs (
        id, attendance_id, employee_id, attendance_date,
        previous_status, new_status, changed_by_user_id, changed_by_name, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditId,
      attendanceId,
      current.employee_id,
      current.attendance_date,
      current.status,
      newStatus,
      changedByUserId,
      changedByName,
      reason
    );

    // 2. Update attendance record
    db.prepare(`
      UPDATE attendance_records SET
        status = ?,
        notes = COALESCE(notes, '') || ' (Edited by ' || ? || ': ' || ? || ')',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, changedByName, reason, attendanceId);
  });

  run();
  return db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(attendanceId) as any;
}

export function getAttendanceAuditLogs(attendanceId?: string, employeeId?: string) {
  const db = getDb();
  let sql = `
    SELECT al.*, e.full_name as employee_name, e.emp_code
    FROM attendance_audit_logs al
    JOIN employees e ON al.employee_id = e.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (attendanceId) {
    sql += ' AND al.attendance_id = ?';
    params.push(attendanceId);
  }
  if (employeeId) {
    sql += ' AND al.employee_id = ?';
    params.push(employeeId);
  }
  sql += ' ORDER BY al.created_at DESC LIMIT 50';
  return db.prepare(sql).all(...params) as any[];
}

export function getMonthlyAttendanceSummary(month: number, year: number, employeeId?: string) {
  const db = getDb();
  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}%`;

  let sql = `
    SELECT
      e.id as employee_id,
      e.emp_code,
      e.full_name,
      e.job_role,
      e.department,
      e.salary_type,
      e.base_salary,
      COUNT(a.id) as days_recorded,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as days_present,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as days_late,
      SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as days_half_day,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as days_absent,
      SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as days_leave
    FROM employees e
    LEFT JOIN attendance_records a ON (e.id = a.employee_id AND a.attendance_date LIKE ?)
    WHERE e.employment_status = 'active'
  `;
  const params: any[] = [datePrefix];
  if (employeeId) {
    sql += ' AND e.id = ?';
    params.push(employeeId);
  }
  sql += ' GROUP BY e.id ORDER BY e.emp_code ASC';

  const rows = db.prepare(sql).all(...params) as any[];
  const daysInMonth = new Date(year, month, 0).getDate();

  return rows.map(r => {
    const present = Number(r.days_present || 0);
    const late = Number(r.days_late || 0);
    const halfDay = Number(r.days_half_day || 0);
    const absent = Number(r.days_absent || 0);
    const leave = Number(r.days_leave || 0);
    // Late is counted as present for work day, halfDay gives 0.5
    const effectiveDays = present + late + (halfDay * 0.5);

    return {
      ...r,
      total_days_in_month: daysInMonth,
      effective_days: effectiveDays,
      unmarked_days: Math.max(0, daysInMonth - Number(r.days_recorded || 0)),
    };
  });
}

// =============================================================
// SALARY & PAYROLL
// =============================================================

export function calculateMonthlySalary(employeeId: string, month: number, year: number) {
  const db = getDb();
  const emp = getEmployeeById(employeeId);
  if (!emp) throw new Error('Employee not found');

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}%`;

  const attSummary = db.prepare(`
    SELECT
      COUNT(id) as days_recorded,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as days_present,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as days_late,
      SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as days_half_day,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as days_absent,
      SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as days_leave
    FROM attendance_records
    WHERE employee_id = ? AND attendance_date LIKE ?
  `).get(employeeId, datePrefix) as any;

  const present = Number(attSummary?.days_present || 0);
  const late = Number(attSummary?.days_late || 0);
  const halfDay = Number(attSummary?.days_half_day || 0);
  const absent = Number(attSummary?.days_absent || 0);
  const leave = Number(attSummary?.days_leave || 0);
  const effectiveDays = present + late + (halfDay * 0.5);

  let earnedSalary = 0;
  const baseSalary = Number(emp.base_salary || 0);

  if (emp.salary_type === 'monthly') {
    const perDayRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
    earnedSalary = Math.round(perDayRate * effectiveDays);
  } else if (emp.salary_type === 'daily') {
    earnedSalary = Math.round(baseSalary * effectiveDays);
  } else if (emp.salary_type === 'hourly') {
    earnedSalary = Math.round(baseSalary * 8 * effectiveDays);
  }

  // Get outstanding advances for this employee
  const advances = db.prepare(`
    SELECT COALESCE(SUM(balance_amount), 0) as total_outstanding
    FROM salary_advances
    WHERE employee_id = ? AND status = 'open' AND balance_amount > 0
  `).get(employeeId) as any;

  const outstandingAdvance = Number(advances?.total_outstanding || 0);

  // Check if a payment has already been recorded for this month
  const existingPayment = db.prepare(`
    SELECT * FROM salary_payments
    WHERE employee_id = ? AND period_month = ? AND period_year = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(employeeId, month, year) as any;

  return {
    employee: emp,
    period_month: month,
    period_year: year,
    total_days_in_month: daysInMonth,
    days_present: present,
    days_late: late,
    days_half_day: halfDay,
    days_absent: absent,
    days_leave: leave,
    effective_days: effectiveDays,
    base_salary: baseSalary,
    salary_type: emp.salary_type,
    earned_salary: earnedSalary,
    outstanding_advance: outstandingAdvance,
    existing_payment: existingPayment || null
  };
}

export function recordSalaryPayment(data: {
  employee_id: string;
  period_month: number;
  period_year: number;
  salary_type: string;
  base_rate: number;
  total_days_in_month?: number;
  days_present?: number;
  days_absent?: number;
  days_half_day?: number;
  days_leave?: number;
  earned_salary: number;
  allowances?: number;
  bonuses?: number;
  deductions?: number;
  advance_deducted?: number;
  net_payable: number;
  paid_amount: number;
  balance_amount?: number;
  payment_mode?: string;
  payment_date?: string;
  notes?: string;
  recorded_by_user_id: string;
}) {
  const db = getDb();
  const id = 'sal_' + Date.now();
  const count = (db.prepare('SELECT COUNT(*) as c FROM salary_payments').get() as any).c + 1;
  const paymentNumber = `PAY-SAL-${String(count).padStart(4, '0')}`;

  const advanceDeducted = Number(data.advance_deducted || 0);
  const paidAmount = Number(data.paid_amount || 0);
  const netPayable = Number(data.net_payable || 0);
  const balanceAmount = data.balance_amount !== undefined ? Number(data.balance_amount) : Math.max(0, netPayable - paidAmount);
  const paymentStatus = balanceAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO salary_payments (
        id, business_id, payment_number, employee_id, period_month, period_year,
        salary_type, base_rate, total_days_in_month, days_present, days_absent,
        days_half_day, days_leave, earned_salary, allowances, bonuses, deductions,
        advance_deducted, net_payable, paid_amount, balance_amount, payment_mode,
        payment_date, payment_status, notes, recorded_by_user_id
      ) VALUES (
        ?, 'biz_al_ameen_01', ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      id,
      paymentNumber,
      data.employee_id,
      data.period_month,
      data.period_year,
      data.salary_type || 'monthly',
      Number(data.base_rate || 0),
      Number(data.total_days_in_month || 30),
      Number(data.days_present || 0),
      Number(data.days_absent || 0),
      Number(data.days_half_day || 0),
      Number(data.days_leave || 0),
      Number(data.earned_salary || 0),
      Number(data.allowances || 0),
      Number(data.bonuses || 0),
      Number(data.deductions || 0),
      advanceDeducted,
      netPayable,
      paidAmount,
      balanceAmount,
      data.payment_mode || 'Cash',
      data.payment_date || new Date().toISOString().split('T')[0],
      paymentStatus,
      data.notes || null,
      data.recorded_by_user_id
    );

    // If advance was deducted, reduce open advances
    if (advanceDeducted > 0) {
      let remainingToDeduct = advanceDeducted;
      const openAdvances = db.prepare(`
        SELECT * FROM salary_advances
        WHERE employee_id = ? AND status = 'open' AND balance_amount > 0
        ORDER BY advance_date ASC
      `).all(data.employee_id) as any[];

      for (const adv of openAdvances) {
        if (remainingToDeduct <= 0) break;
        const deductFromThis = Math.min(remainingToDeduct, adv.balance_amount);
        const newBalance = adv.balance_amount - deductFromThis;
        const newRecovered = (adv.recovered_amount || 0) + deductFromThis;
        const newStatus = newBalance <= 0 ? 'recovered' : 'open';

        db.prepare(`
          UPDATE salary_advances SET
            recovered_amount = ?,
            balance_amount = ?,
            status = ?
          WHERE id = ?
        `).run(newRecovered, newBalance, newStatus, adv.id);

        remainingToDeduct -= deductFromThis;
      }
    }
  });

  run();
  return getSalaryPaymentById(id);
}

export function getSalaryPayments(filter?: { employeeId?: string; month?: number; year?: number }) {
  const db = getDb();
  let sql = `
    SELECT sp.*, e.full_name as employee_name, e.emp_code, e.job_role, e.department
    FROM salary_payments sp
    JOIN employees e ON sp.employee_id = e.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter?.employeeId) {
    sql += ' AND sp.employee_id = ?';
    params.push(filter.employeeId);
  }

  if (filter?.month) {
    sql += ' AND sp.period_month = ?';
    params.push(filter.month);
  }

  if (filter?.year) {
    sql += ' AND sp.period_year = ?';
    params.push(filter.year);
  }

  sql += ' ORDER BY sp.created_at DESC';
  return db.prepare(sql).all(...params) as any[];
}

export function getSalaryPaymentById(id: string) {
  const db = getDb();
  return db.prepare(`
    SELECT sp.*, e.full_name as employee_name, e.emp_code, e.job_role, e.department, e.phone as employee_phone
    FROM salary_payments sp
    JOIN employees e ON sp.employee_id = e.id
    WHERE sp.id = ?
  `).get(id) as any;
}

export function recordSalaryAdvance(data: {
  employee_id: string;
  amount: number;
  advance_date?: string;
  notes?: string;
  recorded_by_user_id: string;
}) {
  const db = getDb();
  const id = 'adv_' + Date.now();
  const amount = Number(data.amount);

  db.prepare(`
    INSERT INTO salary_advances (
      id, business_id, employee_id, amount, advance_date,
      recovered_amount, balance_amount, status, notes, recorded_by_user_id
    ) VALUES (
      ?, 'biz_al_ameen_01', ?, ?, ?,
      0.00, ?, 'open', ?, ?
    )
  `).run(
    id,
    data.employee_id,
    amount,
    data.advance_date || new Date().toISOString().split('T')[0],
    amount,
    data.notes || null,
    data.recorded_by_user_id
  );

  return db.prepare('SELECT * FROM salary_advances WHERE id = ?').get(id) as any;
}

export function getSalaryAdvances(employeeId?: string) {
  const db = getDb();
  let sql = `
    SELECT sa.*, e.full_name as employee_name, e.emp_code
    FROM salary_advances sa
    JOIN employees e ON sa.employee_id = e.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (employeeId) {
    sql += ' AND sa.employee_id = ?';
    params.push(employeeId);
  }
  sql += ' ORDER BY sa.advance_date DESC, sa.created_at DESC';
  return db.prepare(sql).all(...params) as any[];
}

// =============================================================
// INVENTORY AUDIT & STOCK MOVEMENTS
// =============================================================

export function recordStockMovement(data: {
  product_id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  previous_stock?: number;
  added_stock?: number;
  new_stock?: number;
  previous_price?: number;
  new_price?: number;
  reason?: string;
  notes?: string;
  reference_type?: string;
  reference_id?: string;
}) {
  const db = getDb();
  const id = 'sm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  db.prepare(`
    INSERT INTO stock_movements (
      id, business_id, product_id, type, quantity, reference_type, reference_id,
      notes, user_id, user_name, user_role, previous_stock, added_stock, new_stock,
      previous_price, new_price, reason
    ) VALUES (
      ?, 'biz_al_ameen_01', ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    id,
    data.product_id,
    data.type,
    data.quantity,
    data.reference_type || 'manual_adjustment',
    data.reference_id || null,
    data.notes || null,
    data.user_id || null,
    data.user_name || null,
    data.user_role || null,
    data.previous_stock ?? 0,
    data.added_stock ?? 0,
    data.new_stock ?? 0,
    data.previous_price ?? 0,
    data.new_price ?? 0,
    data.reason || null
  );

  return id;
}

export function getStockMovements(productId?: string) {
  const db = getDb();
  let sql = `
    SELECT sm.*, p.name as product_name, p.unit, p.sku
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (productId) {
    sql += ' AND sm.product_id = ?';
    params.push(productId);
  }
  sql += ' ORDER BY sm.created_at DESC LIMIT 100';
  return db.prepare(sql).all(...params) as any[];
}


