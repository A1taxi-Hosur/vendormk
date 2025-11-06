import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { storage } from './storage';

type VendorSession = {
  vendor_id: string;
  name: string;
  email: string;
  phone: string | null;
};

type AuthContextType = {
  vendor: VendorSession | null;
  user: VendorSession | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, name: string, email: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VENDOR_STORAGE_KEY = 'vendor_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [vendor, setVendor] = useState<VendorSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendorSession();
  }, []);

  const loadVendorSession = async () => {
    try {
      const storedVendor = await storage.getItem(VENDOR_STORAGE_KEY);
      if (storedVendor) {
        const vendorData = JSON.parse(storedVendor);
        setVendor(vendorData);
      }
    } catch (error) {
      console.error('Error loading vendor session:', error);
      await storage.removeItem(VENDOR_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      console.log('[AUTH] Starting login for username:', username);
      console.log('[AUTH] Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);

      const { data, error } = await supabase.rpc('verify_vendor_login', {
        p_username: username,
        p_password: password,
      });

      console.log('[AUTH] RPC Response - Data:', data);
      console.log('[AUTH] RPC Response - Error:', error);

      if (error) {
        console.error('[AUTH] Supabase error:', JSON.stringify(error));
        throw new Error(`Login failed: ${error.message || 'Invalid username or password'}`);
      }

      if (!data || data.length === 0) {
        console.error('[AUTH] No data returned from verify_vendor_login');
        throw new Error('Invalid username or password');
      }

      const vendorData = data[0];
      console.log('[AUTH] Login successful, vendor data:', vendorData);

      setVendor(vendorData);
      await storage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(vendorData));
      console.log('[AUTH] Session saved to storage');
    } catch (err: any) {
      console.error('[AUTH] Sign in error:', err);
      throw err;
    }
  };

  const signUp = async (username: string, password: string, name: string, email: string, phone?: string) => {
    const { data, error } = await supabase.rpc('create_vendor', {
      p_username: username,
      p_password: password,
      p_company_name: name,
      p_license_number: 'TEMP',
      p_address: 'N/A',
    });

    if (error) {
      if (error.message.includes('duplicate key')) {
        throw new Error('Username already exists');
      }
      throw error;
    }

    if (!data) throw new Error('Failed to create account');
  };

  const signOut = async () => {
    setVendor(null);
    await storage.removeItem(VENDOR_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ vendor, user: vendor, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
