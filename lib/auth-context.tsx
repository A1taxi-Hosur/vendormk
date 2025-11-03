import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

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
      const storedVendor = localStorage.getItem(VENDOR_STORAGE_KEY);
      if (storedVendor) {
        const vendorData = JSON.parse(storedVendor);
        await supabase.rpc('set_vendor_context', { vendor_id: vendorData.vendor_id });
        setVendor(vendorData);
      }
    } catch (error) {
      console.error('Error loading vendor session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    const { data, error } = await supabase.rpc('verify_vendor_login', {
      p_username: username,
      p_password: password,
    });

    if (error) throw new Error('Invalid username or password');
    if (!data || data.length === 0) throw new Error('Invalid username or password');

    const vendorData = data[0];

    await supabase.rpc('set_vendor_context', { vendor_id: vendorData.vendor_id });

    setVendor(vendorData);
    localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(vendorData));
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
    localStorage.removeItem(VENDOR_STORAGE_KEY);
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
