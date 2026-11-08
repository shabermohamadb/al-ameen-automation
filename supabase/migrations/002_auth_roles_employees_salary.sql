-- ====================================================================
-- AL AMEEN AUTOMATION: MIGRATION 002
-- Two-Login System (Admin & Cashier), Employees, Daily Attendance,
-- Attendance-Based Salary & Payroll, Inventory Audit Tracking
-- ====================================================================

-- 1. Upgrade Users Table for Two-Login Authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Relax role constraint to allow 'admin' and 'cashier'
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'cashier', 'owner', 'manager', 'staff'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Audit Tracking on Invoices and Stock Movements
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS previous_stock NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS added_stock NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS new_stock NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS previous_price NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS new_price NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reason TEXT;

-- 3. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL DEFAULT 'biz_al_ameen_01',
    emp_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    address TEXT,
    job_role TEXT NOT NULL DEFAULT 'Worker',
    department TEXT NOT NULL DEFAULT 'Workshop',
    joining_date DATE NOT NULL,
    employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract')),
    salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    employment_status TEXT NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- 4. Attendance Records Table (Unique per employee per date)
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL DEFAULT 'biz_al_ameen_01',
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
    check_in_time TEXT,
    notes TEXT,
    marked_by_user_id TEXT NOT NULL,
    marked_by_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(employee_id, attendance_date);

-- 5. Attendance Audit Logs (For admin corrections & tamper tracking)
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    attendance_id TEXT NOT NULL,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by_user_id TEXT NOT NULL,
    changed_by_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_att_audit_emp ON attendance_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_audit_date ON attendance_audit_logs(attendance_date);

-- 6. Salary Payments Table
CREATE TABLE IF NOT EXISTS salary_payments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL DEFAULT 'biz_al_ameen_01',
    payment_number TEXT UNIQUE NOT NULL,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INT NOT NULL,
    salary_type TEXT NOT NULL DEFAULT 'monthly',
    base_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_days_in_month INT DEFAULT 30,
    days_present NUMERIC(5,2) DEFAULT 0.00,
    days_absent NUMERIC(5,2) DEFAULT 0.00,
    days_half_day NUMERIC(5,2) DEFAULT 0.00,
    days_leave NUMERIC(5,2) DEFAULT 0.00,
    earned_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    allowances NUMERIC(12,2) DEFAULT 0.00,
    bonuses NUMERIC(12,2) DEFAULT 0.00,
    deductions NUMERIC(12,2) DEFAULT 0.00,
    advance_deducted NUMERIC(12,2) DEFAULT 0.00,
    net_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_mode TEXT NOT NULL DEFAULT 'Cash',
    payment_date DATE NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    notes TEXT,
    recorded_by_user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_salary_emp_period ON salary_payments(employee_id, period_year, period_month);

-- 7. Salary Advances Table
CREATE TABLE IF NOT EXISTS salary_advances (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT NOT NULL DEFAULT 'biz_al_ameen_01',
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    advance_date DATE NOT NULL,
    recovered_amount NUMERIC(12,2) DEFAULT 0.00,
    balance_amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'recovered', 'written_off')),
    notes TEXT,
    recorded_by_user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_advances_emp ON salary_advances(employee_id, status);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_advances ENABLE ROW LEVEL SECURITY;

-- 9. Base RLS Policies
CREATE POLICY "Allow authenticated read on employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write on employees" ON employees FOR ALL USING (true);

CREATE POLICY "Allow authenticated read on attendance_records" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write on attendance_records" ON attendance_records FOR ALL USING (true);

CREATE POLICY "Allow authenticated read on attendance_audit_logs" ON attendance_audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write on attendance_audit_logs" ON attendance_audit_logs FOR ALL USING (true);

CREATE POLICY "Allow authenticated read on salary_payments" ON salary_payments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write on salary_payments" ON salary_payments FOR ALL USING (true);

CREATE POLICY "Allow authenticated read on salary_advances" ON salary_advances FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write on salary_advances" ON salary_advances FOR ALL USING (true);
