import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Car, Users, Wallet, TrendingUp, LogOut } from 'lucide-react-native';
import { supabase, Driver, Vehicle, Wallet as WalletType } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function Dashboard() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setVendorId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [wallet, setWallet] = useState<WalletType | null>(null);

  const handleSignOut = async () => {
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
              router.replace('/auth');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    initializeAndLoadData();
  }, []);

  const initializeAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      let { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendor) {
        const { data: newVendor, error } = await supabase
          .from('vendors')
          .insert({
            user_id: user.id,
            name: user.email?.split('@')[0] || 'Vendor',
            email: user.email || '',
          })
          .select()
          .single();

        if (error) throw error;
        vendor = newVendor;
      }

      if (vendor) {
        setVendorId(vendor.id);
        await loadAllData(vendor.id);
      }
    } catch (error) {
      console.error('Error initializing:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAllData = async (vId: string) => {
    try {
      const [driversData, vehiclesData, walletData] = await Promise.all([
        supabase.from('drivers').select('*').eq('vendor_id', vId),
        supabase.from('vehicles').select('*').eq('vendor_id', vId),
        supabase.from('wallets').select('*').eq('vendor_id', vId).maybeSingle(),
      ]);

      if (driversData.data) setDrivers(driversData.data);
      if (vehiclesData.data) setVehicles(vehiclesData.data);
      if (walletData.data) setWallet(walletData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeAndLoadData();
  };

  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const vehiclesInMaintenance = vehicles.filter(v => v.status === 'maintenance').length;

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
          <Text style={styles.headerTitle}>Vendor Dashboard</Text>
          <Text style={styles.headerSubtitle}>Fleet Management System</Text>
          {user?.email && <Text style={styles.headerEmail}>{user.email}</Text>}
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
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
            style={[styles.statCard, styles.primaryCard]}
            onPress={() => router.push('/fleet')}
          >
            <Car size={28} color="#FFFFFF" />
            <Text style={styles.statNumber}>{vehicles.length}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
            <Text style={styles.statSubLabel}>{activeVehicles} Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, styles.successCard]}
            onPress={() => router.push('/drivers')}
          >
            <Users size={28} color="#FFFFFF" />
            <Text style={styles.statNumber}>{drivers.length}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
            <Text style={styles.statSubLabel}>{activeDrivers} Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, styles.walletCard]}
            onPress={() => router.push('/wallet')}
          >
            <Wallet size={28} color="#FFFFFF" />
            <Text style={styles.statNumber}>
              ₹{parseFloat(wallet?.balance || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.statLabel}>Wallet Balance</Text>
            <Text style={styles.statSubLabel}>Available funds</Text>
          </TouchableOpacity>

          <View style={[styles.statCard, styles.infoCard]}>
            <TrendingUp size={28} color="#FFFFFF" />
            <Text style={styles.statNumber}>
              ₹{parseFloat(wallet?.total_debited || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.statLabel}>Total Commissions</Text>
            <Text style={styles.statSubLabel}>Lifetime paid</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fleet Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Active Vehicles</Text>
                <Text style={[styles.overviewValue, { color: '#10B981' }]}>{activeVehicles}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Maintenance</Text>
                <Text style={[styles.overviewValue, { color: '#F59E0B' }]}>{vehiclesInMaintenance}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Inactive</Text>
                <Text style={[styles.overviewValue, { color: '#EF4444' }]}>
                  {vehicles.filter(v => v.status === 'inactive').length}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Active Drivers</Text>
                <Text style={[styles.overviewValue, { color: '#10B981' }]}>{activeDrivers}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Inactive Drivers</Text>
                <Text style={[styles.overviewValue, { color: '#EF4444' }]}>
                  {drivers.filter(d => d.status === 'inactive').length}
                </Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Vehicles/Driver</Text>
                <Text style={[styles.overviewValue, { color: '#DC2626' }]}>
                  {drivers.length > 0 ? (vehicles.length / drivers.length).toFixed(1) : '0'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/drivers')}
            >
              <Users size={24} color="#DC2626" />
              <Text style={styles.actionText}>Add Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/fleet')}
            >
              <Car size={24} color="#DC2626" />
              <Text style={styles.actionText}>Add Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/wallet')}
            >
              <Wallet size={24} color="#DC2626" />
              <Text style={styles.actionText}>Add Credit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Summary</Text>
          <View style={styles.walletSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Credited</Text>
              <Text style={styles.summaryValue}>
                ₹{parseFloat(wallet?.total_credited || '0').toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Debited</Text>
              <Text style={styles.summaryValue}>
                ₹{parseFloat(wallet?.total_debited || '0').toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: '700', color: '#111827' }]}>Current Balance</Text>
              <Text style={[styles.summaryValue, { fontWeight: '700', color: '#DC2626', fontSize: 18 }]}>
                ₹{parseFloat(wallet?.balance || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {drivers.length === 0 && vehicles.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Get Started</Text>
            <Text style={styles.emptyText}>
              Add your first driver and vehicle to start managing your fleet.
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
  primaryCard: {
    backgroundColor: '#DC2626',
  },
  successCard: {
    backgroundColor: '#10B981',
  },
  walletCard: {
    backgroundColor: '#F59E0B',
  },
  infoCard: {
    backgroundColor: '#3B82F6',
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
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 8,
    fontWeight: '600',
  },
  walletSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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
