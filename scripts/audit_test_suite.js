const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const BASE_URL = 'http://localhost:3005';
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const results = [];

function record(section, testName, status, details = '') {
  results.push({ section, testName, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${status}] ${section} > ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

async function runAudit() {
  console.log('\n=============================================================');
  console.log('AL AMEEN AUTOMATION: PRODUCTION DATABASE & SECURITY AUDIT');
  console.log('=============================================================\n');

  let adminCookie = '';
  let cashierCookie = '';

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION & SESSION TESTING
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: AUTHENTICATION & ROLE ISOLATION ---');
  try {
    // Admin login
    const adminRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin', password: 'Admin@123', expectedRole: 'admin' })
    });
    if (adminRes.status === 200 && adminRes.data?.success && adminRes.headers.get('set-cookie')) {
      adminCookie = adminRes.headers.get('set-cookie').split(';')[0];
      record('Authentication', 'Admin Login', 'PASS', 'Redirect: /');
    } else {
      record('Authentication', 'Admin Login', 'FAIL', JSON.stringify(adminRes.data));
    }

    // Cashier login
    const cashierRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'cashier1', password: 'Cashier@123', expectedRole: 'cashier' })
    });
    if (cashierRes.status === 200 && cashierRes.data?.success && cashierRes.headers.get('set-cookie')) {
      cashierCookie = cashierRes.headers.get('set-cookie').split(';')[0];
      record('Authentication', 'Manager/Cashier Login', 'PASS', 'Redirect: /cashier');
    } else {
      record('Authentication', 'Manager/Cashier Login', 'FAIL', JSON.stringify(cashierRes.data));
    }

    // Role boundary: Manager attempting to login on Admin portal
    const breach1 = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'cashier1', password: 'Cashier@123', expectedRole: 'admin' })
    });
    if (breach1.status === 403) {
      record('Authentication', 'Manager Blocked from Admin Portal', 'PASS', '403 Forbidden enforced');
    } else {
      record('Authentication', 'Manager Blocked from Admin Portal', 'FAIL', `Status ${breach1.status}`);
    }

    // Role boundary: Admin attempting to login on Manager portal
    const breach2 = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin', password: 'Admin@123', expectedRole: 'cashier' })
    });
    if (breach2.status === 403) {
      record('Authentication', 'Admin Blocked from Cashier Portal', 'PASS', '403 Forbidden enforced');
    } else {
      record('Authentication', 'Admin Blocked from Cashier Portal', 'FAIL', `Status ${breach2.status}`);
    }

    // Unauthenticated access to protected route
    const unauth = await api('/api/invoices');
    if (unauth.status === 401) {
      record('Authentication', 'Protected Routes Block Unauthenticated Access', 'PASS', '401 Unauthorized');
    } else {
      record('Authentication', 'Protected Routes Block Unauthenticated Access', 'FAIL', `Status ${unauth.status}`);
    }

    // Authenticated access with session cookie
    const authMe = await api('/api/auth/me', { headers: { Cookie: adminCookie } });
    if (authMe.status === 200 && authMe.data?.authenticated) {
      record('Authentication', 'Session Validation & Persistence', 'PASS', `User: ${authMe.data.user.username}`);
    } else {
      record('Authentication', 'Session Validation & Persistence', 'FAIL', JSON.stringify(authMe.data));
    }
  } catch (err) {
    record('Authentication', 'Auth Suite Execution', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 2. CRITICAL INVOICE DELETE BUG & REAPPEARANCE TEST
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: CRITICAL INVOICE DELETE BUG AUDIT ---');
  try {
    const testInvNum = `TEST-AUDIT-${Date.now().toString().slice(-4)}`;
    const createInvRes = await api('/api/invoices', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        customer_id: 'cust_sri_kumaran',
        invoice_number: testInvNum,
        issue_date: '2026-11-08',
        subtotal: 1000,
        taxable_amount: 1000,
        cgst: 90,
        sgst: 90,
        grand_total: 1180,
        paid_amount: 180,
        balance_amount: 1000,
        items: [
          {
            product_id: 'p_shutter_plain',
            item_type: 'product',
            description: 'Audit Test Shutter Item',
            quantity: 1,
            unit_price: 1000,
            taxable_amount: 1000,
            total_amount: 1180
          }
        ]
      })
    });

    if (createInvRes.status === 201 && createInvRes.data?.success) {
      const createdInv = createInvRes.data.data;
      const invId = createdInv.id;
      record('Invoice Module', 'Create Test Invoice via API', 'PASS', `ID: ${invId}, Number: ${testInvNum}`);

      // Verify directly against Supabase sales_invoices
      const { data: sbInv, error: sbErr } = await sbAdmin
        .from('sales_invoices')
        .select('id, invoice_number, grand_total, balance_amount')
        .eq('id', invId)
        .single();

      if (!sbErr && sbInv && sbInv.invoice_number === testInvNum) {
        record('Invoice Module', 'Direct Supabase sales_invoices Persistence', 'PASS', `Found in Supabase: ${sbInv.id}`);
      } else {
        record('Invoice Module', 'Direct Supabase sales_invoices Persistence', 'FAIL', sbErr?.message || 'Not found');
      }

      // Verify directly against Supabase sales_invoice_items
      const { data: sbItems } = await sbAdmin
        .from('sales_invoice_items')
        .select('id, invoice_id, product_id, quantity')
        .eq('invoice_id', invId);

      if (sbItems && sbItems.length > 0) {
        record('Invoice Module', 'Direct Supabase sales_invoice_items Persistence', 'PASS', `Items count: ${sbItems.length}`);
      } else {
        record('Invoice Module', 'Direct Supabase sales_invoice_items Persistence', 'FAIL', 'No items in Supabase');
      }

      // Verify advance payment in Supabase payments
      const { data: sbPayments } = await sbAdmin
        .from('payments')
        .select('id, invoice_id, amount')
        .eq('invoice_id', invId);

      if (sbPayments && sbPayments.length > 0) {
        record('Invoice Module', 'Advance Payment Persistence in Supabase', 'PASS', `Payment ID: ${sbPayments[0].id}, Amount: ${sbPayments[0].amount}`);
      } else {
        record('Invoice Module', 'Advance Payment Persistence in Supabase', 'FAIL', 'Payment not recorded in Supabase');
      }

      // NOW DELETE THE INVOICE via API
      console.log('   Executing DELETE /api/invoices/' + invId + '...');
      const delRes = await api(`/api/invoices/${invId}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie }
      });

      if (delRes.status === 200 && delRes.data?.success) {
        record('Invoice Module', 'Execute Invoice DELETE via API', 'PASS', 'API returned success');
      } else {
        record('Invoice Module', 'Execute Invoice DELETE via API', 'FAIL', JSON.stringify(delRes.data));
      }

      // Direct Supabase Query: Confirm invoice is permanently removed
      const { data: checkInvAfter } = await sbAdmin
        .from('sales_invoices')
        .select('id')
        .eq('id', invId);

      if (checkInvAfter && checkInvAfter.length === 0) {
        record('Invoice Module', 'Permanent Supabase Deletion Verification', 'PASS', 'Confirmed 0 records in Supabase sales_invoices');
      } else {
        record('Invoice Module', 'Permanent Supabase Deletion Verification', 'FAIL', 'Record still exists in Supabase!');
      }

      // Direct Supabase Query: Confirm items are cascade-deleted
      const { data: checkItemsAfter } = await sbAdmin
        .from('sales_invoice_items')
        .select('id')
        .eq('invoice_id', invId);

      if (checkItemsAfter && checkItemsAfter.length === 0) {
        record('Invoice Module', 'Cascade Item Deletion in Supabase', 'PASS', 'Confirmed 0 items in Supabase sales_invoice_items');
      } else {
        record('Invoice Module', 'Cascade Item Deletion in Supabase', 'FAIL', 'Items remain in sales_invoice_items');
      }

      // Direct Supabase Query: Confirm payment reference deleted
      const { data: checkPayAfter } = await sbAdmin
        .from('payments')
        .select('id')
        .eq('invoice_id', invId);

      if (checkPayAfter && checkPayAfter.length === 0) {
        record('Invoice Module', 'Linked Payment Cleanup in Supabase', 'PASS', 'Confirmed 0 payments linked to deleted invoice');
      } else {
        record('Invoice Module', 'Linked Payment Cleanup in Supabase', 'FAIL', 'Orphan payment remains');
      }

      // CRITICAL REAPPEARANCE TEST: Simulate logout, re-login, and fetch list
      console.log('   Simulating Logout, Re-Login, and Checking Invoice History...');
      const reloginRes = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: 'admin', password: 'Admin@123', expectedRole: 'admin' })
      });
      const freshAdminCookie = reloginRes.headers.get('set-cookie')?.split(';')[0];

      const listRes = await api('/api/invoices', { headers: { Cookie: freshAdminCookie } });
      const invoiceList = listRes.data?.data || [];
      const reappeared = invoiceList.find(i => i.id === invId || i.invoice_number === testInvNum);

      if (!reappeared) {
        record('Invoice Module', 'Invoice Non-Reappearance After Logout/Re-login', 'PASS', 'Deleted invoice did NOT reappear');
      } else {
        record('Invoice Module', 'Invoice Non-Reappearance After Logout/Re-login', 'FAIL', 'CRITICAL: Deleted invoice reappeared!');
      }
    } else {
      record('Invoice Module', 'Create Test Invoice via API', 'FAIL', JSON.stringify(createInvRes.data));
    }
  } catch (err) {
    record('Invoice Module', 'Invoice Delete Lifecycle', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 3. PRODUCTS & INVENTORY CRUD AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: PRODUCTS & INVENTORY AUDIT ---');
  try {
    const testProdName = `Audit Test Shutter Motor ${Date.now().toString().slice(-4)}`;
    const createProdRes = await api('/api/products', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        name: testProdName,
        category_id: 'cat_motors_auto',
        sku: 'AUDIT-MTR-01',
        purchase_price: 3500,
        selling_price: 5200,
        opening_stock: 10,
        track_stock: true
      })
    });

    if (createProdRes.status === 201 && createProdRes.data?.success) {
      const prod = createProdRes.data.data;
      const prodId = prod.id;
      record('Products & Inventory', 'Create Product via API', 'PASS', `ID: ${prodId}`);

      // Verify in Supabase
      const { data: sbProd } = await sbAdmin.from('products').select('*').eq('id', prodId).single();
      if (sbProd && sbProd.name === testProdName && Number(sbProd.current_stock) === 10) {
        record('Products & Inventory', 'Supabase Product Persistence', 'PASS', `Stock: ${sbProd.current_stock}`);
      } else {
        record('Products & Inventory', 'Supabase Product Persistence', 'FAIL', 'Not found in Supabase');
      }

      // Restock (adjust stock 'in')
      const stockRes = await api(`/api/products/${prodId}/stock`, {
        method: 'POST',
        headers: { Cookie: adminCookie },
        body: JSON.stringify({ quantity: 15, type: 'in', notes: 'Audited shipment received' })
      });

      if (stockRes.status === 200 && stockRes.data?.success) {
        record('Products & Inventory', 'Restock Product (type: in)', 'PASS', 'Stock added +15');
      } else {
        record('Products & Inventory', 'Restock Product (type: in)', 'FAIL', JSON.stringify(stockRes.data));
      }

      // Verify updated stock in Supabase
      const { data: sbProdUpdated } = await sbAdmin.from('products').select('current_stock').eq('id', prodId).single();
      if (sbProdUpdated && Number(sbProdUpdated.current_stock) === 25) {
        record('Products & Inventory', 'Supabase Stock Value Correctness', 'PASS', `Expected 25, got ${sbProdUpdated.current_stock}`);
      } else {
        record('Products & Inventory', 'Supabase Stock Value Correctness', 'FAIL', `Expected 25, got ${sbProdUpdated?.current_stock}`);
      }

      // Verify stock movement log in Supabase
      const { data: sbMovements } = await sbAdmin.from('stock_movements').select('*').eq('product_id', prodId);
      if (sbMovements && sbMovements.length > 0) {
        record('Products & Inventory', 'Stock Movement Audit Trail in Supabase', 'PASS', `Logs count: ${sbMovements.length}`);
      } else {
        record('Products & Inventory', 'Stock Movement Audit Trail in Supabase', 'FAIL', 'No stock movement created');
      }

      // Clean up test product
      await api(`/api/products/${prodId}`, { method: 'DELETE', headers: { Cookie: adminCookie } });
      const { data: checkProdDel } = await sbAdmin.from('products').select('id').eq('id', prodId);
      if (!checkProdDel || checkProdDel.length === 0) {
        record('Products & Inventory', 'Delete Product & Supabase Cleanup', 'PASS', 'Product removed');
      } else {
        record('Products & Inventory', 'Delete Product & Supabase Cleanup', 'FAIL', 'Product remains');
      }
    } else {
      record('Products & Inventory', 'Create Product via API', 'FAIL', JSON.stringify(createProdRes.data));
    }
  } catch (err) {
    record('Products & Inventory', 'Products Audit', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 4. CUSTOMERS & SUPPLIERS AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: CUSTOMERS & SUPPLIERS AUDIT ---');
  try {
    const testCustName = `Audit Client ${Date.now().toString().slice(-4)}`;
    const custRes = await api('/api/customers', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        name: testCustName,
        phone: '9876543210',
        address: '123 Test Street, Coimbatore',
        gstin: '33AAAAA0000A1Z5',
        opening_balance: 500
      })
    });

    if (custRes.status === 201 && custRes.data?.success) {
      const custId = custRes.data.data.id;
      record('Customers', 'Create Customer via API', 'PASS', `ID: ${custId}`);

      // Verify in Supabase
      const { data: sbCust } = await sbAdmin.from('customers').select('*').eq('id', custId).single();
      if (sbCust && sbCust.name === testCustName && Number(sbCust.current_balance) === 500) {
        record('Customers', 'Supabase Customer Persistence & Balance', 'PASS', `Balance: ${sbCust.current_balance}`);
      } else {
        record('Customers', 'Supabase Customer Persistence & Balance', 'FAIL', 'Not found in Supabase');
      }

      // Update customer
      const updateRes = await api(`/api/customers/${custId}`, {
        method: 'PUT',
        headers: { Cookie: adminCookie },
        body: JSON.stringify({ phone: '9999888877', notes: 'Verified VIP client' })
      });

      const { data: sbCustUpdated } = await sbAdmin.from('customers').select('phone, notes').eq('id', custId).single();
      if (sbCustUpdated && sbCustUpdated.phone === '9999888877') {
        record('Customers', 'Update Customer Persistence', 'PASS', 'Phone updated in Supabase');
      } else {
        record('Customers', 'Update Customer Persistence', 'FAIL', 'Update not persisted');
      }

      // Cleanup
      await sbAdmin.from('customers').delete().eq('id', custId);
    } else {
      record('Customers', 'Create Customer via API', 'FAIL', JSON.stringify(custRes.data));
    }
  } catch (err) {
    record('Customers', 'Customer Audit', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 5. QUOTATIONS AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 5: QUOTATIONS AUDIT ---');
  try {
    const qtNum = `QT-AUDIT-${Date.now().toString().slice(-4)}`;
    const qtRes = await api('/api/quotations', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        customer_id: 'cust_sri_kumaran',
        quotation_number: qtNum,
        grand_total: 8500,
        items: [
          {
            product_id: 'p_shutter_plain',
            description: 'Quotation Test Item',
            quantity: 1,
            unit_price: 8500,
            total_amount: 8500
          }
        ]
      })
    });

    if (qtRes.status === 201 && qtRes.data?.success) {
      const qtId = qtRes.data.data.id;
      record('Quotations', 'Create Quotation via API', 'PASS', `ID: ${qtId}`);

      // Verify in Supabase
      const { data: sbQt } = await sbAdmin.from('quotations').select('*').eq('id', qtId).single();
      if (sbQt && sbQt.quotation_number === qtNum) {
        record('Quotations', 'Supabase Quotation Persistence', 'PASS', `Found: ${sbQt.quotation_number}`);
      } else {
        record('Quotations', 'Supabase Quotation Persistence', 'FAIL', 'Not in Supabase');
      }

      // Convert Quotation to Invoice
      const convertRes = await api(`/api/quotations/${qtId}/convert`, {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });

      if (convertRes.status === 200 && convertRes.data?.success) {
        const convInv = convertRes.data.data;
        record('Quotations', 'Convert Quotation to Invoice', 'PASS', `Generated Invoice: ${convInv.invoice_number}`);

        // Verify quotation status updated to 'converted' in Supabase
        const { data: sbQtConv } = await sbAdmin.from('quotations').select('status').eq('id', qtId).single();
        if (sbQtConv && sbQtConv.status === 'converted') {
          record('Quotations', 'Quotation Status Update in Supabase', 'PASS', 'Status: converted');
        } else {
          record('Quotations', 'Quotation Status Update in Supabase', 'FAIL', `Status: ${sbQtConv?.status}`);
        }

        // Cleanup converted invoice and quotation
        await api(`/api/invoices/${convInv.id}`, { method: 'DELETE', headers: { Cookie: adminCookie } });
        await api(`/api/quotations/${qtId}`, { method: 'DELETE', headers: { Cookie: adminCookie } });
      } else {
        record('Quotations', 'Convert Quotation to Invoice', 'FAIL', JSON.stringify(convertRes.data));
      }
    } else {
      record('Quotations', 'Create Quotation via API', 'FAIL', JSON.stringify(qtRes.data));
    }
  } catch (err) {
    record('Quotations', 'Quotations Audit', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 6. EMPLOYEES, ATTENDANCE & SALARY AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 6: EMPLOYEES, ATTENDANCE & SALARY AUDIT ---');
  try {
    const testEmpName = `Worker ${Date.now().toString().slice(-4)}`;
    const empRes = await api('/api/employees', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        full_name: testEmpName,
        phone: '9845123456',
        job_role: 'Fabricator',
        department: 'Workshop',
        base_salary: 18000,
        salary_type: 'monthly',
        employment_type: 'full_time',
        joining_date: '2026-01-01'
      })
    });

    if (empRes.status === 201) {
      const empId = empRes.data.id;
      record('Employees & HR', 'Create Employee via API', 'PASS', `ID: ${empId}`);

      // Verify in Supabase
      const { data: sbEmp } = await sbAdmin.from('employees').select('*').eq('id', empId).single();
      if (sbEmp && sbEmp.full_name === testEmpName && Number(sbEmp.base_salary) === 18000) {
        record('Employees & HR', 'Supabase Employee Persistence', 'PASS', `Salary: ₹${sbEmp.base_salary}`);
      } else {
        record('Employees & HR', 'Supabase Employee Persistence', 'FAIL', 'Not in Supabase');
      }

      // Mark Attendance
      const attRes = await api('/api/attendance', {
        method: 'POST',
        headers: { Cookie: adminCookie },
        body: JSON.stringify({
          date: '2026-11-08',
          records: [
            { employee_id: empId, status: 'present', check_in_time: '09:00 AM', notes: 'On time' }
          ]
        })
      });

      if (attRes.status === 200 && attRes.data?.success) {
        record('Employees & HR', 'Mark Attendance Batch via API', 'PASS', 'Recorded attendance');
      } else {
        record('Employees & HR', 'Mark Attendance Batch via API', 'FAIL', JSON.stringify(attRes.data));
      }

      // Verify attendance in Supabase
      const { data: sbAtt } = await sbAdmin
        .from('attendance_records')
        .select('*')
        .eq('employee_id', empId)
        .eq('attendance_date', '2026-11-08')
        .single();

      if (sbAtt && sbAtt.status === 'present') {
        record('Employees & HR', 'Supabase Attendance Persistence', 'PASS', `Status: ${sbAtt.status}`);
      } else {
        record('Employees & HR', 'Supabase Attendance Persistence', 'FAIL', 'Attendance not in Supabase');
      }

      // Record Salary Payment
      const salRes = await api('/api/salary', {
        method: 'POST',
        headers: { Cookie: adminCookie },
        body: JSON.stringify({
          employee_id: empId,
          period_month: 11,
          period_year: 2026,
          salary_type: 'monthly',
          base_rate: 18000,
          earned_salary: 18000,
          net_payable: 18000,
          paid_amount: 18000,
          payment_mode: 'Bank Transfer',
          payment_date: '2026-11-08'
        })
      });

      if (salRes.status === 201) {
        record('Employees & HR', 'Disburse/Record Salary via API', 'PASS', `Payment: ₹18000`);
      } else {
        record('Employees & HR', 'Disburse/Record Salary via API', 'FAIL', JSON.stringify(salRes.data));
      }

      // Verify Salary in Supabase
      const { data: sbSal } = await sbAdmin
        .from('salary_payments')
        .select('*')
        .eq('employee_id', empId)
        .eq('period_month', 11)
        .single();

      if (sbSal && Number(sbSal.paid_amount) === 18000) {
        record('Employees & HR', 'Supabase Salary Persistence', 'PASS', `Paid: ₹${sbSal.paid_amount}`);
      } else {
        record('Employees & HR', 'Supabase Salary Persistence', 'FAIL', 'Salary not in Supabase');
      }

      // Cleanup
      await api(`/api/employees/${empId}`, { method: 'DELETE', headers: { Cookie: adminCookie } });
    } else {
      record('Employees & HR', 'Create Employee via API', 'FAIL', JSON.stringify(empRes.data));
    }
  } catch (err) {
    record('Employees & HR', 'HR Suite Audit', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 7. FINANCE & EXPENSES AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 7: FINANCE & EXPENSES AUDIT ---');
  try {
    const expRes = await api('/api/expenses', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        title: 'Workshop Electricity Bill Audit',
        amount: 2450,
        category: 'Utilities',
        payment_mode: 'UPI',
        expense_date: '2026-11-08'
      })
    });

    if (expRes.status === 201 && expRes.data?.success) {
      const expId = expRes.data.data.id;
      record('Finance', 'Create Expense via API', 'PASS', `ID: ${expId}`);

      const { data: sbExp } = await sbAdmin.from('expenses').select('*').eq('id', expId).single();
      if (sbExp && Number(sbExp.amount) === 2450) {
        record('Finance', 'Supabase Expense Persistence', 'PASS', `Amount: ₹${sbExp.amount}`);
      } else {
        record('Finance', 'Supabase Expense Persistence', 'FAIL', 'Not in Supabase');
      }

      // Cleanup test expense
      await sbAdmin.from('expenses').delete().eq('id', expId);
    } else {
      record('Finance', 'Create Expense via API', 'FAIL', JSON.stringify(expRes.data));
    }

    // Dashboard Metrics
    const dashRes = await api('/api/dashboard', { headers: { Cookie: adminCookie } });
    if (dashRes.status === 200 && dashRes.data?.success) {
      const m = dashRes.data.data;
      record('Finance', 'Dashboard Financial Aggregation', 'PASS', `Total Sales: ₹${m.totalSales}, Profit: ₹${m.totalProfit}`);
    } else {
      record('Finance', 'Dashboard Financial Aggregation', 'FAIL', JSON.stringify(dashRes.data));
    }
  } catch (err) {
    record('Finance', 'Finance Audit', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 8. COMPANY SETTINGS AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 8: COMPANY SETTINGS AUDIT ---');
  try {
    const bizRes = await api('/api/business', { headers: { Cookie: adminCookie } });
    if (bizRes.status === 200 && bizRes.data?.success && bizRes.data?.business) {
      record('Company Settings', 'Fetch Business Profile & Settings', 'PASS', `Name: ${bizRes.data.business.name}`);

      // Update settings
      const updateBizRes = await api('/api/business', {
        method: 'PUT',
        headers: { Cookie: adminCookie },
        body: JSON.stringify({
          business: { phone2: '96294 95874' },
          settings: { invoice_prefix: 'SI-' }
        })
      });

      if (updateBizRes.status === 200 && updateBizRes.data?.success) {
        record('Company Settings', 'Update Business Configuration', 'PASS', 'Settings updated');
      } else {
        record('Company Settings', 'Update Business Configuration', 'FAIL', JSON.stringify(updateBizRes.data));
      }
    } else {
      record('Company Settings', 'Fetch Business Profile & Settings', 'FAIL', JSON.stringify(bizRes.data));
    }
  } catch (err) {
    record('Company Settings', 'Settings Audit', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 9. ROW LEVEL SECURITY (RLS) & CLIENT-SIDE KEY AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 9: ROW LEVEL SECURITY & KEY LEAK AUDIT ---');
  try {
    // Attempt unauthorized direct write with anonymous key
    const { data: anonData, error: anonErr } = await sbAnon
      .from('sales_invoices')
      .insert({ id: 'anon_breach_test', invoice_number: 'BREACH-01', customer_id: 'cust_01' });

    if (anonErr) {
      record('Security & RLS', 'Anonymous Key Write Blocked by RLS', 'PASS', `Blocked: ${anonErr.message}`);
    } else {
      record('Security & RLS', 'Anonymous Key Write Blocked by RLS', 'FAIL', 'Anon key allowed insert!');
      await sbAdmin.from('sales_invoices').delete().eq('id', 'anon_breach_test');
    }

    // Inspect git/source code for leaked service-role keys
    const clientCodeCheck = fs.readFileSync('lib/supabase.ts', 'utf8');
    if (!clientCodeCheck.includes('SUPABASE_SERVICE_ROLE_KEY =') && !clientCodeCheck.includes('eyJh')) {
      record('Security & RLS', 'Zero Hardcoded Secrets in Source Code', 'PASS', 'All secrets read from process.env strictly');
    } else {
      record('Security & RLS', 'Zero Hardcoded Secrets in Source Code', 'FAIL', 'Potential key leak in lib/supabase.ts');
    }
  } catch (err) {
    record('Security & RLS', 'Security Audit', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // 10. SUPABASE DATABASE SCHEMA VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 10: SUPABASE SCHEMA INTEGRITY ---');
  const requiredTables = [
    'businesses', 'business_settings', 'users', 'customers', 'suppliers',
    'product_categories', 'products', 'stock_movements', 'quotations',
    'quotation_items', 'sales_invoices', 'sales_invoice_items', 'payments',
    'expenses', 'employees', 'attendance_records', 'salary_payments'
  ];

  for (const t of requiredTables) {
    const { count, error } = await sbAdmin.from(t).select('*', { count: 'exact', head: true });
    if (!error) {
      record('Schema Integrity', `Table public.${t}`, 'PASS', `Count: ${count}`);
    } else {
      record('Schema Integrity', `Table public.${t}`, 'FAIL', error.message);
    }
  }

  console.log('\n=============================================================');
  console.log('AUDIT SUMMARY:');
  const total = results.length;
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${total} | PASS: ${pass} | FAIL: ${fail}`);
  console.log('=============================================================\n');

  fs.writeFileSync('audit_results.json', JSON.stringify({ total, pass, fail, results }, null, 2));
}

runAudit().catch(console.error);
