-- ORO HR 이식용 스키마 (Supabase SQL Editor에서 실행)
-- 표 15개 생성 + RLS 잠금. 자세한 설명은 docs/ORO_HR_타사이식_가이드.md 참고.

CREATE TABLE public.employees (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  department text, position text,
  employee_no text,
  monthly_wage numeric DEFAULT 0,
  hire_date date NOT NULL,
  resign_date date,
  accrual_basis text NOT NULL DEFAULT 'hire',
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  login_email text,
  status text NOT NULL DEFAULT '재직',
  phone text, personal_email text, address text,
  birth_date date, gender text,
  emergency_name text, emergency_relation text, emergency_phone text,
  bank_name text, bank_account text,
  contract_type text, contract_start date, contract_end date,
  card_no text,
  attendance_uid text
);

CREATE TABLE public.leave_types (
  code text PRIMARY KEY,
  label text NOT NULL,
  deduct_days numeric NOT NULL,
  is_deductible boolean NOT NULL DEFAULT true
);

CREATE TABLE public.leave_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  applied_year int NOT NULL,
  leave_type_code text NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  exclude_holiday boolean NOT NULL DEFAULT true,
  used_days numeric NOT NULL,
  reason text, note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.leave_adjustments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  applied_year int NOT NULL,
  add_days numeric NOT NULL DEFAULT 0,
  deduct_days numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.leave_allowances (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  applied_year int NOT NULL,
  hourly_wage numeric,
  deduct_days numeric NOT NULL DEFAULT 0,
  paid_amount numeric, paid_date date, note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.holidays (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  holiday_date date NOT NULL,
  name text NOT NULL,
  year int GENERATED ALWAYS AS (EXTRACT(YEAR FROM holiday_date)) STORED
);

CREATE TABLE public.app_admins (
  email text PRIMARY KEY,
  role text NOT NULL DEFAULT 'admin',
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.role_permissions (
  role text NOT NULL,
  perm_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (role, perm_key)
);

CREATE TABLE public.menu_groups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE TABLE public.menu_tabs (
  tab_key text PRIMARY KEY,
  group_id bigint REFERENCES public.menu_groups(id) ON DELETE SET NULL,
  label text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE public.employee_profile_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text, detail text,
  date_from date, date_to date, note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.leave_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  applied_year int NOT NULL,
  leave_type_code text NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  exclude_holiday boolean DEFAULT true,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  decided_by text, decided_at timestamptz, decision_note text,
  leave_record_id bigint,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.attendance_days (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint REFERENCES public.employees(id) ON DELETE SET NULL,
  user_ext_id text, name_raw text,
  work_date date NOT NULL, day_name text,
  clock_in text, clock_out text,
  basic_min int, overtime_min int, total_min int, recognized_min int,
  source text NOT NULL DEFAULT 'excel',
  dedup_key text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.attendance_punches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint REFERENCES public.employees(id) ON DELETE SET NULL,
  card_no text,
  punch_time timestamptz NOT NULL, punch_type text,
  source text NOT NULL DEFAULT 'adt_caps',
  raw jsonb, dedup_key text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.integration_tokens (
  name text PRIMARY KEY,
  token text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_attendance_days_emp ON public.attendance_days(employee_id, work_date);
CREATE INDEX idx_attendance_days_date ON public.attendance_days(work_date);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status, applied_year);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profile_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;
