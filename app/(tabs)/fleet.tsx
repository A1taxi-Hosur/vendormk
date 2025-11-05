import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Car, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type DriverVehicle = {
  driver_name: string;
  vehicle_number: string;
  vehicle_type: string;
};

export default function Fleet() {
  const { vendor } = useAuth();
  const [driverVehicles, setDriverVehicles] = useState<DriverVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vendor) {
      loadFleet();
    } else {
      setLoading(false);
    }
  }, [vendor]);

  const loadFleet = async () => {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('driver_details')
        .eq('vendor_id', vendor.vendor_id)
        .maybeSingle();

      if (error) throw error;

      if (data?.driver_details && Array.isArray(data.driver_details)) {
        setDriverVehicles(data.driver_details as DriverVehicle[]);
      } else {
        setDriverVehicles([]);
      }
    } catch (error) {
      console.error('Error loading fleet:', error);
      setDriverVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fleet</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading fleet...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fleet</Text>
        <Text style={styles.headerSubtitle}>Drivers and vehicles</Text>
      </View>

      <View style={styles.statsCard}>
        <Car size={24} color="#DC2626" />
        <View style={styles.statsInfo}>
          <Text style={styles.statsNumber}>{driverVehicles.length}</Text>
          <Text style={styles.statsLabel}>Total Drivers with Vehicles</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {driverVehicles.length === 0 && (
          <View style={styles.emptyState}>
            <Car size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No drivers found</Text>
            <Text style={styles.emptySubtext}>Driver details will appear here</Text>
          </View>
        )}

        {driverVehicles.map((item, index) => (
          <View key={index} style={styles.driverCard}>
            <View style={styles.iconContainer}>
              <User size={24} color="#DC2626" />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{item.driver_name}</Text>
              <View style={styles.vehicleRow}>
                <Car size={16} color="#6B7280" />
                <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
              </View>
              <Text style={styles.vehicleType}>{item.vehicle_type.toUpperCase()}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 20 }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsInfo: {
    marginLeft: 16,
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#DC2626',
  },
  statsLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  driverCard: {
    flexDirection: 'row',
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  vehicleType: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
});
