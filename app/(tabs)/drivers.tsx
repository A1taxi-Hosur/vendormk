import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Search, Phone, Mail, CreditCard } from 'lucide-react-native';
import { supabase, Driver } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function Drivers() {
  const { vendor } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (vendor) {
      loadDrivers();
    } else {
      setLoading(false);
    }
  }, [vendor]);

  const loadDrivers = async () => {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('vendor_id', vendor.vendor_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  };



  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.phone.includes(searchQuery) ||
    driver.license_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const inactiveDrivers = drivers.filter(d => d.status === 'inactive').length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Management</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading drivers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Management</Text>
        <Text style={styles.headerSubtitle}>Manage your fleet drivers</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drivers"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.miniCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.miniCardNumber}>{activeDrivers}</Text>
          <Text style={styles.miniCardLabel}>Active</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#EF4444' }]}>
          <Text style={styles.miniCardNumber}>{inactiveDrivers}</Text>
          <Text style={styles.miniCardLabel}>Inactive</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#DC2626' }]}>
          <Text style={styles.miniCardNumber}>{drivers.length}</Text>
          <Text style={styles.miniCardLabel}>Total</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredDrivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.detailRow}>
                  <Phone size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{driver.phone}</Text>
                </View>
                {driver.email && (
                  <View style={styles.detailRow}>
                    <Mail size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{driver.email}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <CreditCard size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{driver.license_number}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: driver.status === 'active' ? '#10B981' : '#EF4444' }]}>
                <Text style={styles.statusText}>{driver.status}</Text>
              </View>
            </View>

          </View>
        ))}

        {filteredDrivers.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No drivers found</Text>
            <Text style={styles.emptySubtext}>Contact support to add drivers</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  miniCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  miniCardNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  miniCardLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
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
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    height: 32,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
});
