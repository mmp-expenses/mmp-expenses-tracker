export type Role = 'admin' | 'accountant';
export type ExpenseStatus = 'draft' | 'completed';
export type PaymentMode = 'Cash' | 'Bank' | 'Cheque' | 'Transfer';

export interface Project {
  id: string;
  name: string;
  code: string;
}

export interface Expense {
  id: string;
  created_by: string;
  project_id: string;
  date: string;
  category: string;
  sub_category?: string;
  description?: string;
  amount: number;
  payment_mode?: PaymentMode;
  reference_no?: string;
  remarks?: string;
  status: ExpenseStatus;
  created_at: string;
  // Join fields for UI
  project_name?: string;
  creator_email?: string;
}

export const CATEGORIES = [
  'SCA Payments',
  'Other Invoices',
  'Payroll Salaries',
  'Rent Premises',
  'Cash Transactions',
  'Travel & Accomodation',
  'Rent A Car WSO',
  'Enumerators Wages',
  'Stamp Duty',
  'Utilities',
  'Insurance'
] as const;