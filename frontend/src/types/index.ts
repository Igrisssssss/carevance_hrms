// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee' | 'client';
  organization_id: number | null;
  invited_by?: number | null;
  avatar?: string | null;
  hourly_rate?: number;
  is_active: boolean;
  is_working?: boolean;
  current_duration?: number;
  current_project?: string | null;
  total_duration?: number;
  total_elapsed_duration?: number;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Organization Types
export interface Organization {
  id: number;
  name: string;
  slug: string;
  owner_user_id?: number | null;
  plan_code?: string | null;
  billing_cycle?: 'monthly' | 'yearly' | null;
  subscription_status?: 'trial' | 'active' | 'inactive' | 'past_due' | 'cancelled' | 'expired';
  subscription_intent?: 'trial' | 'paid' | null;
  trial_starts_at?: string | null;
  trial_ends_at?: string;
  max_users?: number;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Project Types
export interface Project {
  id: number;
  organization_id: number;
  name: string;
  description?: string;
  color: string;
  budget?: number;
  budget_type?: 'hours' | 'amount';
  hourly_rate?: number;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  deadline?: string;
  client_name?: string;
  client_email?: string;
  created_at: string;
  updated_at: string;
}

// Task Types
export interface Task {
  id: number;
  project_id: number;
  assignee_id?: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_time?: number;
  created_at: string;
  updated_at: string;
  project?: Project;
  assignee?: User;
}

// Time Entry Types
export interface TimeEntry {
  id: number;
  user_id: number;
  organization_id: number;
  project_id?: number;
  task_id?: number;
  timer_slot?: 'primary' | 'secondary';
  start_time: string;
  end_time?: string;
  duration: number;
  description?: string;
  billable: boolean;
  is_manual: boolean;
  activity_level?: number;
  created_at: string;
  updated_at: string;
  user?: User;
  project?: Project;
  task?: Task;
}

// Screenshot Types
export interface Screenshot {
  id: number;
  time_entry_id: number;
  user_id: number;
  filename: string;
  thumbnail?: string;
  path: string;
  recorded_at: string;
  user?: User;
  time_entry?: TimeEntry;
}

// Activity Types
export interface Activity {
  id: number;
  user_id: number;
  time_entry_id?: number;
  type: 'app' | 'url' | 'idle';
  name: string;
  duration: number;
  recorded_at: string;
  user?: User;
  time_entry?: TimeEntry;
}

// Invoice Types
export interface Invoice {
  id: number;
  organization_id: number;
  user_id: number;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  organization?: Organization;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  time_entry_id?: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Report Types
export interface DailyReport {
  date: string;
  total_time: number;
  by_user: ReportByUser[];
  by_project: ReportByProject[];
  entries: TimeEntry[];
}

export interface ReportByUser {
  user: User;
  total_time: number;
  entries?: TimeEntry[];
}

export interface ReportByProject {
  project: Project | null;
  total_time: number;
  entries?: TimeEntry[];
}

export interface WeeklyReport {
  start_date: string;
  end_date: string;
  total_time: number;
  working_time?: number;
  billable_time: number;
  by_day: ReportByDay[];
  by_user: ReportByUser[];
  by_project: ReportByProject[];
}

export interface ReportByDay {
  date: string;
  total_time: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: 'admin' | 'employee';
  organization_name?: string;
}

export interface OwnerSignupRequest {
  company_name: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  plan_code: string;
  signup_mode: 'trial' | 'paid';
  billing_cycle?: 'monthly' | 'yearly';
  terms_accepted?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  organization?: Organization;
}

export interface InvitationSummary {
  id: number;
  email: string;
  role: User['role'];
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  delivery_method: 'email' | 'link';
  invite_url?: string | null;
  email_sent_at?: string | null;
  expires_at?: string | null;
  accepted_at?: string | null;
  mail_delivery?: 'sent' | 'failed' | 'not_requested';
  can_accept?: boolean;
  organization?: Pick<Organization, 'id' | 'name' | 'slug'>;
  metadata?: {
    group_ids?: number[];
    project_ids?: number[];
  };
}

export interface InvitationListResponse {
  invitations: InvitationSummary[];
}

export interface InvitationCreateResponse {
  invitations: InvitationSummary[];
  failed: Array<{ email: string; message: string }>;
  invited_count: number;
}

export interface InviteValidationResponse {
  valid: boolean;
  email?: string;
  role?: string | null;
  expires_at?: string | null;
  message?: string;
}

export interface BillingSnapshot {
  plan: {
    code?: string | null;
    name: string;
    description?: string | null;
    status: string;
    billing_cycle?: 'monthly' | 'yearly' | null;
    subscription_intent?: 'trial' | 'paid' | null;
    is_trial?: boolean;
    trial_end_date?: string | null;
    renewal_date?: string | null;
    contact_sales_only?: boolean;
  } | null;
  workspace?: {
    id: number;
    name: string;
    slug: string;
    owner_user_id?: number | null;
  } | null;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ChatConversation {
  id: number;
  type?: 'direct';
  other_user: {
    id: number;
    name: string;
    email: string;
    last_seen_at?: string | null;
    is_online?: boolean;
  };
  last_message?: ChatMessage;
  unread_count?: number;
  updated_at?: string;
}

export interface ChatGroup {
  id: number;
  type?: 'group';
  name: string;
  member_count?: number;
  members?: Array<{
    id: number;
    name: string;
    email: string;
    last_seen_at?: string | null;
    is_online?: boolean;
  }>;
  last_message?: ChatGroupMessage;
  unread_count?: number;
  updated_at?: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  has_attachment?: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  sender?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ChatGroupMessage {
  id: number;
  group_id: number;
  sender_id: number;
  body: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  has_attachment?: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ChatTypingUser {
  id: number;
  name: string;
  email: string;
}

export interface ChatUnreadSummary {
  unread_messages: number;
  unread_conversations: number;
  unread_senders: number;
}

export interface PayrollComponent {
  id?: number;
  name: string;
  calculation_type: 'fixed' | 'percentage';
  amount?: number;
  value?: number;
  computed_amount?: number;
}

export interface PayrollStructure {
  id: number;
  user_id: number;
  organization_id: number;
  basic_salary: number;
  currency: string;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  user?: User;
  allowances: PayrollComponent[];
  deductions: PayrollComponent[];
}

export interface Payslip {
  id: number;
  organization_id: number;
  user_id: number;
  payroll_structure_id?: number | null;
  period_month: string;
  currency: string;
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  net_salary: number;
  payment_status?: 'pending' | 'paid';
  allowances: PayrollComponent[];
  deductions: PayrollComponent[];
  generated_by?: number | null;
  generated_at?: string | null;
  paid_at?: string | null;
  paid_by?: number | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface PayrollRecord {
  id: number;
  organization_id: number;
  user_id: number;
  payroll_month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  tax: number;
  net_salary: number;
  payroll_status: 'draft' | 'processed' | 'paid';
  payout_method: 'mock' | 'stripe';
  payout_status: 'pending' | 'success' | 'failed';
  generated_by?: number | null;
  updated_by?: number | null;
  processed_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  transactions?: PayrollTransaction[];
}

export interface PayrollTransaction {
  id: number;
  payroll_id: number;
  provider: 'mock' | 'stripe';
  transaction_id?: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  raw_response?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollWorkspaceOverview {
  month: string;
  summary: {
    gross_payroll: number;
    net_payroll: number;
    employees_in_current_run: number;
    pending_approvals: number;
    paid_count: number;
    failed_or_pending_payouts: number;
    total_overtime_value: number;
    reimbursements_pending: number;
  };
  current_pay_run: PayrollRun | null;
  missing_profiles: PayrollReadinessWarning[];
  recent_transactions: Array<{
    id: number;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    created_at: string;
    employee?: Pick<User, 'id' | 'name' | 'email'> | null;
  }>;
  pending_actions: {
    leave_requests: number;
    attendance_time_edits: number;
    payroll_adjustments: number;
  };
  status_distribution: Record<string, number>;
  quick_links: Record<string, number>;
  readiness_warnings: PayrollReadinessWarning[];
}

export interface PayrollReadinessWarning {
  user_id: number;
  name: string;
  email: string;
  warnings: string[];
}

export interface PayrollRun {
  id: number;
  run_code: string;
  payroll_month: string;
  status: string;
  currency: string;
  items_count?: number;
  gross_payroll?: number;
  net_payroll?: number;
  paid_count?: number;
  failed_payouts?: number;
  warnings_count?: number;
  generated_at?: string | null;
  locked_at?: string | null;
  items?: PayrollRunItem[];
  summary?: Record<string, any>;
  warnings?: Array<{ user_id: number; warnings: string[] }>;
}

export interface PayrollRunItem {
  id: number;
  pay_run_id: number;
  organization_id: number;
  user_id: number;
  payroll_id?: number | null;
  payroll_profile_id?: number | null;
  payable_days: number;
  worked_seconds: number;
  overtime_seconds: number;
  approved_leave_days: number;
  approved_time_edit_seconds: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  payout_status: string;
  salary_breakdown?: Record<string, any> | null;
  attendance_summary?: Record<string, any> | null;
  warnings?: string[] | null;
  user?: User;
  payroll?: PayrollRecord;
  payroll_profile?: PayrollProfile | null;
}

export interface PayrollProfile {
  id: number;
  organization_id: number;
  user_id: number;
  salary_template_id?: number | null;
  currency: string;
  payout_method: string;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc_swift?: string | null;
  payment_email?: string | null;
  tax_identifier?: string | null;
  payroll_eligible: boolean;
  reimbursements_eligible: boolean;
  is_active: boolean;
  earning_components?: Array<Record<string, any>> | null;
  deduction_components?: Array<Record<string, any>> | null;
  bonus_amount: number;
  tax_amount: number;
  meta?: Record<string, any> | null;
  user?: User;
  salary_template?: SalaryTemplate | null;
}

export interface SalaryComponentMaster {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  category: 'basic' | 'allowance' | 'overtime' | 'bonus' | 'reimbursement' | 'penalty' | 'tax' | 'deduction' | 'other';
  value_type: 'fixed' | 'percentage';
  default_value: number;
  is_taxable: boolean;
  is_active: boolean;
  meta?: Record<string, any> | null;
}

export interface SalaryTemplateComponentItem {
  id: number;
  salary_template_id: number;
  salary_component_id: number;
  value_type: 'fixed' | 'percentage';
  value: number;
  sort_order: number;
  is_enabled: boolean;
  component?: SalaryComponentMaster;
}

export interface SalaryTemplate {
  id: number;
  organization_id: number;
  name: string;
  description?: string | null;
  currency: string;
  is_active: boolean;
  components: SalaryTemplateComponentItem[];
}

export interface PayrollAdjustment {
  id: number;
  organization_id: number;
  user_id: number;
  payroll_profile_id?: number | null;
  reimbursement_id?: number | null;
  title: string;
  description?: string | null;
  kind: 'reimbursement' | 'bonus' | 'manual_deduction' | 'penalty' | 'one_time_adjustment';
  effective_month: string;
  amount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'applied';
  approval_note?: string | null;
  approved_at?: string | null;
  applied_at?: string | null;
  user?: User;
  reimbursement?: ReimbursementClaim | null;
}

export interface ReimbursementClaim {
  id: number;
  organization_id: number;
  user_id: number;
  title: string;
  description?: string | null;
  expense_date?: string | null;
  amount: number;
  currency: string;
  status: string;
  approved_at?: string | null;
  user?: User;
}

export interface PayrollReportsPayload {
  monthly_summary: Record<string, any>;
  employee_payroll_sheet: Array<Record<string, any>>;
  department_payroll_cost: Array<Record<string, any>>;
  deductions_report: Array<Record<string, any>>;
  payout_status_report: Array<Record<string, any>>;
  attendance_vs_payable_days: Array<Record<string, any>>;
  overtime_summary: Array<Record<string, any>>;
}

export interface PayrollSettingsPayload {
  id: number;
  organization_id: number;
  payroll_calendar?: Record<string, any> | null;
  default_payout_method?: Record<string, any> | null;
  overtime_rules?: Record<string, any> | null;
  late_deduction_rules?: Record<string, any> | null;
  leave_mapping?: Record<string, any> | null;
  approval_workflow?: Record<string, any> | null;
  payslip_branding?: Record<string, any> | null;
}

export interface AppNotificationItem {
  id: number;
  type: 'announcement' | 'news' | 'salary_credited' | string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: number;
    name: string;
    email: string;
  } | null;
  meta?: Record<string, any> | null;
}

export interface UserProfile360 {
  user: User;
  range: {
    start_date: string;
    end_date: string;
  };
  summary: {
    entries_count: number;
    total_duration: number;
    working_duration?: number;
    working_hours?: number;
    billable_duration: number;
    non_billable_duration: number;
    idle_duration?: number;
    attendance_days: number;
    present_days: number;
    approved_leave_days: number;
    approved_time_edit_seconds: number;
    payslips_count: number;
  };
  status: {
    is_working: boolean;
    current_project?: string | null;
    current_timer_started_at?: string | null;
    last_seen_at?: string | null;
    latest_attendance?: {
      attendance_date: string;
      status: string;
      worked_seconds: number;
      late_minutes: number;
      check_in_at?: string | null;
      check_out_at?: string | null;
    } | null;
    latest_notification?: AppNotificationItem | null;
  };
  recent_time_entries: TimeEntry[];
  attendance_records: Array<{
    id: number;
    attendance_date: string;
    status: string;
    worked_seconds: number;
    late_minutes: number;
    check_in_at?: string | null;
    check_out_at?: string | null;
  }>;
  leave_requests: Array<{
    id: number;
    start_date: string;
    end_date: string;
    reason?: string | null;
    status: string;
    revoke_status?: string | null;
    created_at: string;
  }>;
  time_edit_requests: Array<{
    id: number;
    attendance_date: string;
    extra_seconds: number;
    message?: string | null;
    status: string;
    created_at: string;
  }>;
  payslips: Array<{
    id: number;
    period_month: string;
    currency: string;
    net_salary: number;
    payment_status?: 'pending' | 'paid';
    generated_at?: string | null;
    paid_at?: string | null;
  }>;
}
