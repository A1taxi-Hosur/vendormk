import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Car, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type ParsedDriver = {
  id: string;
  name: string;
  phone: string;
  license: string;
  vehicle: string;
  vehicleDetails: string;
};

export default function Fleet() {
  const { vendor } = useAuth();
  const [drivers, setDrivers] = useState<ParsedDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vendor) {
      loadFleet();
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

  const loadFleet = async () => {
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
      console.error('Error loading fleet:', error);
      setDrivers([]);
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
          <Text style={styles.statsNumber}>{drivers.length}</Text>
          <Text style={styles.statsLabel}>Total Drivers with Vehicles</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {drivers.length === 0 && (
          <View style={styles.emptyState}>
            <Car size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No drivers found</Text>
            <Text style={styles.emptySubtext}>Driver details will appear here</Text>
          </View>
        )}

        {drivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
            <View style={styles.iconContainer}>
              <User size={24} color="#DC2626" />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.vehicleRow}>
                <Car size={16} color="#6B7280" />
                <Text style={styles.vehicleNumber}>{driver.vehicle}</Text>
              </View>
              {driver.vehicleDetails && (
                <Text style={styles.vehicleType}>{driver.vehicleDetails.toUpperCase()}</Text>
              )}
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
