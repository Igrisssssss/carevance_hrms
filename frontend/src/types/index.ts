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
