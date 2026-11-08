import Database from 'better-sqlite3';

export function seedDatabase(db: Database.Database) {
  // Check if business already exists
  const existing = db.prepare('SELECT COUNT(*) as count FROM businesses').get() as { count: number };
  if (existing && existing.count > 0) {
    return; // Already seeded
  }

  const run = db.transaction(() => {
    // 1. Business
    db.prepare(`
      INSERT INTO businesses (id, name, legal_name, category, address, state, state_code, phone1, phone2, email, gstin, currency)
      VALUES (
        'biz_al_ameen_01',
        'AL AMEEN WELDING WORKS & ROLLING SHUTTER MANUFACTURING',
        'AL AMEEN WELDING WORKS & ROLLING SHUTTER MANUFACTURING',
        'Rolling Shutter Manufacturing & Automation',
        'Office: Danishpet main road, santhaipettai, kadaiyampatti(PO &TK),salem(DT),Tamil Nadu, INDIA -636351, Salem, Tamil Nadu, 636351',
        'Tamil Nadu',
        '33',
        '9629495874',
        '6383514898',
        'alameenweldingwork@gmail.com',
        '33CRHPD7107H1Z3',
        'INR'
      )
    `).run();

    // 2. Business Settings
    db.prepare(`
      INSERT INTO business_settings (
        id, business_id, invoice_prefix, quotation_prefix, purchase_prefix, job_prefix, payment_prefix,
        default_gst_rate, default_terms, bank_name, bank_branch, account_name, account_number, ifsc_code, upi_id
      ) VALUES (
        'set_01', 'biz_al_ameen_01', 'SI-', 'QT-', 'PI-', 'JB-', 'RCP-', 18.00,
        '1. Goods once sold will not be taken back or exchanged',
        'State Bank of India ,THEEVATTIPATTI', 'THEEVATTIPATTI Branch', 'AL AMEEN WELDING WORKS', '41904105649', 'SBIN0018379', 'thasthagiralameen-1@okicici'
      )
    `).run();

    // 3. Admin User
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role)
      VALUES ('usr_admin_01', 'admin@alameen.com', 'Admin', '96294 95874', 'owner')
    `).run();

    // 4. Product Categories
    const catStmt = db.prepare('INSERT INTO product_categories (id, business_id, name, description) VALUES (?, ?, ?, ?)');
    catStmt.run('cat_shutter', 'biz_al_ameen_01', 'Rolling Shutter', 'Fabricated custom rolling shutter leaves and complete shutter curtains');
    catStmt.run('cat_components', 'biz_al_ameen_01', 'Rolling Shutter Components', 'Springs, guide channels, bottom plates, brackets, gearboxes');
    catStmt.run('cat_motors', 'biz_al_ameen_01', 'Automation Products', 'Automatic shutter motors, sliding gate motors, remotes, controllers');
    catStmt.run('cat_other', 'biz_al_ameen_01', 'Other Products', 'Glass door fittings, grill shutters, and custom hardware accessories');

    // 5. Products
    const prodStmt = db.prepare(`
      INSERT INTO products (
        id, business_id, category_id, name, sku, hsn_code, unit,
        purchase_price, selling_price, gst_rate, opening_stock, current_stock, min_stock_alert,
        is_measurement_based, rate_per_sqft, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Rolling Shutters (Measurement Based)
    prodStmt.run('p_shutter_plain', 'biz_al_ameen_01', 'cat_shutter', 'Rolling Shutter - Plain Leaf (20G)', 'RS-PL-20', '7308', 'Square Feet', 170, 230, 18, 500, 420, 100, 1, 230, 'Standard commercial plain CR rolling shutter leaf');
    prodStmt.run('p_shutter_coated', 'biz_al_ameen_01', 'cat_shutter', 'Rolling Shutter - Coated Leaf (Galvanized)', 'RS-CL-20', '7308', 'Square Feet', 195, 260, 18, 450, 380, 100, 1, 260, 'Pre-coated weather resistant galvanized leaf');
    prodStmt.run('p_shutter_wooden', 'biz_al_ameen_01', 'cat_shutter', 'Rolling Shutter - Wooden Type Aluminium Leaf', 'RS-WTA-AL', '7308', 'Square Feet', 340, 450, 18, 200, 160, 50, 1, 450, 'Premium architectural wooden textured extruded aluminium');
    prodStmt.run('p_shutter_round', 'biz_al_ameen_01', 'cat_shutter', 'Rolling Shutter - Round Profile', 'RS-RP-18', '7308', 'Square Feet', 210, 280, 18, 300, 250, 60, 1, 280, 'Curved slat profile for smooth rolling operation');
    prodStmt.run('p_shutter_box', 'biz_al_ameen_01', 'cat_shutter', 'Rolling Shutter - Box Profile', 'RS-BP-18', '7308', 'Square Feet', 230, 310, 18, 350, 290, 80, 1, 310, 'Heavy-duty box slat profile for industrial warehouses');
    prodStmt.run('p_shutter_line', 'biz_al_ameen_01', 'cat_shutter', 'Rolling Shutter - Line Profile', 'RS-LP-20', '7308', 'Square Feet', 220, 290, 18, 250, 210, 60, 1, 290, 'Architectural ribbed line profile');

    // Components
    prodStmt.run('p_comp_spring', 'biz_al_ameen_01', 'cat_components', 'Heavy Duty Shutter Spring', 'COMP-SPG-01', '7326', 'Piece', 650, 950, 18, 40, 32, 10, 0, 0, 'High-tensile carbon steel flat spring');
    prodStmt.run('p_comp_gearbox', 'biz_al_ameen_01', 'cat_components', 'Reduction Gear Box Assembly', 'COMP-GB-01', '7326', 'Set', 1400, 2100, 18, 25, 18, 5, 0, 0, 'Smooth manual pull chain reduction gear box');
    prodStmt.run('p_comp_guide', 'biz_al_ameen_01', 'cat_components', 'Guide Channel 65mm MS', 'COMP-GC-65', '7308', 'Meter', 180, 270, 18, 120, 95, 25, 0, 0, 'Heavy gauge cold-rolled guide channels');
    prodStmt.run('p_comp_bottom', 'biz_al_ameen_01', 'cat_components', 'Bottom Plate Angle & Strip', 'COMP-BP-01', '7308', 'Meter', 150, 220, 18, 80, 64, 20, 0, 0, 'Base plate with lock holes and stiffener');

    // Automation Products
    prodStmt.run('p_mot_center', 'biz_al_ameen_01', 'cat_motors', 'Automatic Shutter Center Motor 600kg', 'MOT-CTR-600', '8501', 'Set', 10500, 14500, 18, 12, 8, 3, 0, 0, 'Single phase AC motor with manual override cord');
    prodStmt.run('p_mot_side', 'biz_al_ameen_01', 'cat_motors', 'Industrial Side Motor 800kg Three-Phase', 'MOT-SIDE-800', '8501', 'Set', 16500, 21500, 18, 8, 5, 2, 0, 0, 'Heavy industrial chain drive motor for large shutters');
    prodStmt.run('p_mot_gate', 'biz_al_ameen_01', 'cat_motors', 'Automatic Sliding Gate Motor Kit', 'MOT-GATE-SLD', '8501', 'Set', 15500, 22000, 18, 6, 4, 2, 0, 0, 'Sliding gate motor with 4m gear racks, 2 remotes');
    prodStmt.run('p_mot_remote', 'biz_al_ameen_01', 'cat_motors', 'Wireless Shutter Remote Control', 'ACC-RMT-433', '8526', 'Piece', 450, 850, 18, 50, 42, 10, 0, 0, '4-button rolling code 433MHz wireless remote');
    prodStmt.run('p_mot_boom', 'biz_al_ameen_01', 'cat_motors', 'Automatic Boom Barrier Mechanism 4m', 'AUT-BOM-4M', '8479', 'Set', 28000, 38000, 18, 4, 3, 1, 0, 0, 'Automatic traffic and security boom barrier');

    // Other Products
    prodStmt.run('p_oth_glass', 'biz_al_ameen_01', 'cat_other', 'Glass Door Patch Fittings Kit', 'GLS-PF-KIT', '7326', 'Set', 2800, 4200, 18, 15, 12, 4, 0, 0, 'Top & bottom patch fittings, lock and handle');
    prodStmt.run('p_oth_grill', 'biz_al_ameen_01', 'cat_other', 'Grill Shutter Pipe Assembly', 'RS-GRL-01', '7308', 'Square Feet', 190, 275, 18, 180, 150, 40, 1, 275, 'See-through heavy pipe grill rolling shutter');

    // 6. Customers (Genuine Customer Only)
    const custStmt = db.prepare(`
      INSERT INTO customers (id, business_id, name, phone, alternate_phone, email, address, state, state_code, gstin, opening_balance, current_balance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    custStmt.run('cust_sri_kumaran', 'biz_al_ameen_01', 'SRI KUMARAN SHUTTERS', '9629495874', '', 'srikumaran@gmail.com', '188/117, NATHAJI STREET,, ERUMAPALAYAM,SALEM, Salem, Tamil Nadu, 636015', 'Tamil Nadu', '33', '33BSOPV6815R1ZN', 0, 145450, 'PAN: BSOPV6815R');

    // 7. Sales Invoices (Genuine Invoice 12 Only)
    const invStmt = db.prepare(`
      INSERT INTO sales_invoices (
        id, business_id, invoice_number, customer_id, invoice_type, issue_date, due_date, site_address,
        subtotal, discount, taxable_amount, is_interstate, cgst, sgst, igst, total_tax,
        installation_charges, transport_charges, grand_total, paid_amount, balance_amount, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    invStmt.run(
      'inv_12', 'biz_al_ameen_01', '12', 'cust_sri_kumaran', 'tax_invoice',
      '2026-10-31', '2026-11-07', '188/117, NATHAJI STREET,, ERUMAPALAYAM,SALEM, Salem, Tamil Nadu, 636015',
      123262.71, 0, 123262.71, 0, 11093.64, 11093.64, 0, 22187.29,
      0, 0, 145450, 0, 145450, 'unpaid', 'Invoice 12 - Roilng shuttar Lath'
    );

    // Sales Invoice Items
    const itemStmt = db.prepare(`
      INSERT INTO sales_invoice_items (
        id, invoice_id, product_id, description, hsn_code, width, height, measurement_unit,
        width_ft, height_ft, area_sqft, rate_per_sqft, quantity, unit_price,
        taxable_amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    itemStmt.run(
      'item_inv12_1', 'inv_12', 'p_shutter_plain', 'Roilng shuttar Lath', '7308',
      0, 0, 'KGS', 0, 0, 0, 0, 1454.5, 84.75,
      123262.71, 18, 11093.64, 11093.64, 0, 145450
    );
  });

  run();
}
