import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Driver = {
  id: string;
  vendor_id: string;
  name: string;
  email: string | null;
  phone: string;
  license_number: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  vendor_id: string;
  driver_id: string | null;
  vehicle_number: string;
  vehicle_type: 'car' | 'bike' | 'van' | 'truck';
  make: string;
  model: string;
  year: number | null;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type Wallet = {
  id: string;
  vendor_id: string;
  balance: string;
  total_credited: string;
  total_debited: string;
  created_at: string;
  updated_at: string;
};

export type WalletTransaction = {
  id: string;
  wallet_id: string;
  vendor_id: string;
  driver_id: string | null;
  transaction_type: 'credit' | 'debit';
  amount: string;
  description: string;
  reference: string | null;
  transaction_date: string;
  created_at: string;
};

export type Vendor = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Commission = {
  id: string;
  vendor_id: string;
  commission_amount: string;
  commission_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
