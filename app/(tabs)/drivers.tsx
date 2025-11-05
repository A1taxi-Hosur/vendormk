import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Search, Phone, Mail, CreditCard, Car } from 'lucide-react-native';
import { supabase, ParsedDriver } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function Drivers() {
  const { vendor } = useAuth();
  const [drivers, setDrivers] = useState<ParsedDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (vendor) {
      loadDriversFromVendorDetails();
    } else {
      setLoading(false);
    }
  }, [vendor]);

  const parseDriverDetails = (driverDetailsText: string): ParsedDriver[] => {
    if (!driverDetailsText || driverDetailsText.trim() === '' || driverDetailsText === 'EMPTY') {
      return [];
    }

    const lines = driverDetailsText.split('\n').filter(line => line.trim() !== '');
    const parsedDrivers: ParsedDriver[] = [];

    lines.forEach((line, index) => {
      const driverMatch = line.match(/Driver:\s*([^|]+)/);
      const phoneMatch = line.match(/Phone:\s*([^|]+)/);
      const licenseMatch = line.match(/License:\s*([^|]+)/);
      const vehicleMatch = line.match(/Vehicle:\s*([^(]+)/);
      const vehicleDetailsMatch = line.match(/\(([^)]+)\)/);

      if (driverMatch) {
        parsedDrivers.push({
          id: `driver-${index}`,
          name: driverMatch[1].trim(),
          phone: phoneMatch ? phoneMatch[1].trim() : 'N/A',
          license: licenseMatch ? licenseMatch[1].trim() : 'N/A',
          vehicle: vehicleMatch ? vehicleMatch[1].trim() : 'N/A',
          vehicleDetails: vehicleDetailsMatch ? vehicleDetailsMatch[1].trim() : '',
        });
      }
    });

    return parsedDrivers;
  };

  const loadDriversFromVendorDetails = async () => {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('driver_details')
        .eq('id', vendor.vendor_id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.driver_details) {
        const parsedDrivers = parseDriverDetails(data.driver_details);
        setDrivers(parsedDrivers);
      } else {
        setDrivers([]);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.phone.includes(searchQuery) ||
    driver.license.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.vehicle.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Text style={styles.headerSubtitle}>View your fleet drivers</Text>
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
        <View style={[styles.miniCard, { backgroundColor: '#DC2626' }]}>
          <Text style={styles.miniCardNumber}>{drivers.length}</Text>
          <Text style={styles.miniCardLabel}>Total Drivers</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.miniCardNumber}>{filteredDrivers.length}</Text>
          <Text style={styles.miniCardLabel}>Showing</Text>
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
                <View style={styles.detailRow}>
                  <CreditCard size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{driver.license}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Car size={14} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {driver.vehicle}
                    {driver.vehicleDetails && ` (${driver.vehicleDetails})`}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.statusText}>active</Text>
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
    flex: 1,
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
