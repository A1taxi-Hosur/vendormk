import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

console.log('[SUPABASE] Environment check:');
console.log('[SUPABASE] process.env.EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('[SUPABASE] Constants.expoConfig?.extra?.supabaseUrl:', Constants.expoConfig?.extra?.supabaseUrl);
console.log('[SUPABASE] Constants.expoConfig?.extra:', JSON.stringify(Constants.expoConfig?.extra));

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  '';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  '';

console.log('[SUPABASE] Final URL:', supabaseUrl);
console.log('[SUPABASE] Final Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[SUPABASE] WARNING: Missing Supabase environment variables!');
  console.warn('[SUPABASE] You need to rebuild the APK with: eas build --platform android --profile preview');
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
  driver_details: string | null;
  created_at: string;
  updated_at: string;
};

export type ParsedDriver = {
  id: string;
  name: string;
  phone: string;
  license: string;
  vehicle: string;
  vehicleDetails: string;
};

export type Commission = {
  id: string;
  vendor_id: string;
  commission_amount: string;
  commission_date: string;
  driver_allowance: string | null;
  notes: string | null;
  vendor_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
