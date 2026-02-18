import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Users, Wallet, LogOut } from 'lucide-react-native';
import { supabase, Driver, Wallet as WalletType } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useFocusEffect } from '@react-navigation/native';

export default function Dashboard() {
  const router = useRouter();
  const { signOut, vendor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalDeducted, setTotalDeducted] = useState(0);

  const handleSignOut = async () => {
    console.log('Logout button clicked');
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        try {
          console.log('Calling signOut...');
          await signOut();
          console.log('SignOut completed');
        } catch (error: any) {
          console.error('SignOut error:', error);
          window.alert('Error: ' + error.message);
        }
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut();
              } catch (error: any) {
                Alert.alert('Error', error.message);
              }
            },
          },
        ]
      );
    }
  };

  useEffect(() => {
    if (vendor) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [vendor]);

  useFocusEffect(
    useCallback(() => {
      if (vendor) {
        loadAllData();
      }
    }, [vendor])
  );

  useEffect(() => {
    if (!vendor) return;

    const driversChannel = supabase
      .channel('drivers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers',
          filter: `vendor_id=eq.${vendor.vendor_id}`
        },
        () => {
          loadAllData();
        }
      )
      .subscribe();

    const walletTransactionsChannel = supabase
      .channel('dashboard-wallet-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `vendor_id=eq.${vendor.vendor_id}`
        },
        () => {
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(walletTransactionsChannel);
    };
  }, [vendor]);

  const loadAllData = async () => {
    if (!vendor) return;

    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;

      const [driversData, walletData, cumulativeBalanceData] = await Promise.all([
        supabase.from('drivers').select('*').eq('vendor_id', vendor.vendor_id),
        supabase.from('wallets').select('*').eq('vendor_id', vendor.vendor_id).maybeSingle(),
        supabase.rpc('get_cumulative_wallet_balance', {
          p_vendor_id: vendor.vendor_id,
          p_date: todayString
        })
      ]);

      if (driversData.error) console.error('Error loading drivers:', driversData.error);
      if (walletData.error) console.error('Error loading wallet:', walletData.error);

      setDrivers(driversData.data || []);
      if (walletData.data) setWallet(walletData.data);

      const todayData = cumulativeBalanceData.data?.find((d: any) => d.balance_date === todayString);

      if (todayData) {
        setTotalAllocated(parseFloat(todayData.admin_credit || '0'));
        setTotalDeducted(parseFloat(todayData.driver_commission || '0'));
        setCalculatedBalance(parseFloat(todayData.cumulative_balance || '0'));
      } else {
        setTotalAllocated(0);
        setTotalDeducted(0);
        setCalculatedBalance(0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Vendor Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>A1 Vendor</Text>
          <Text style={styles.headerSubtitle}>Fleet Management System</Text>
          {vendor?.name && <Text style={styles.headerEmail}>{vendor.name}</Text>}
        </View>
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LogOut size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[styles.statCard, styles.successCard]}
            onPress={() => router.push('/drivers')}
          >
            <Users size={28} color="#FFFFFF" />
            <Text style={styles.statNumber}>{drivers.length}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, styles.walletCard]}
            onPress={() => router.push('/wallet')}
          >
            <Wallet size={28} color="#FFFFFF" />
            <Text style={styles.statNumber}>
              ₹{calculatedBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.statLabel}>Today's Balance</Text>
            <Text style={styles.statSubLabel}>Admin - Driver Commission</Text>
          </TouchableOpacity>
        </View>

        {drivers.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Get Started</Text>
            <Text style={styles.emptyText}>
              Add your first driver to start managing your fleet.
            </Text>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => router.push('/drivers')}
            >
              <Text style={styles.getStartedText}>Add Your First Driver</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#DC2626',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 4,
  },
  headerEmail: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 2,
    opacity: 0.9,
  },
  signOutButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    zIndex: 10,
    elevation: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  successCard: {
    backgroundColor: '#10B981',
  },
  walletCard: {
    backgroundColor: '#F59E0B',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
    marginTop: 4,
  },
  statSubLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  getStartedButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
