import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, Car, MapPin, Clock, Battery, Settings } from 'lucide-react-native';

export default function Fleet() {
  const vehicles = [
    { id: 1, number: 'TN-20-AB-1234', driver: 'Rajesh Kumar', status: 'active', location: 'Hosur Market', battery: 85, lastUpdate: '2 min ago' },
    { id: 2, number: 'TN-20-AC-5678', driver: 'Suresh M', status: 'active', location: 'Bus Stand', battery: 92, lastUpdate: '1 min ago' },
    { id: 3, number: 'TN-20-AD-9012', driver: 'Mohan S', status: 'idle', location: 'Railway Station', battery: 78, lastUpdate: '5 min ago' },
    { id: 4, number: 'TN-20-AE-3456', driver: 'Kumar R', status: 'offline', location: 'Unknown', battery: 45, lastUpdate: '2 hours ago' },
    { id: 5, number: 'TN-20-AF-7890', driver: 'Ravi Kumar', status: 'active', location: 'SIPCOT', battery: 88, lastUpdate: '3 min ago' },
    { id: 6, number: 'TN-20-AG-2345', driver: 'Santhosh P', status: 'maintenance', location: 'Workshop', battery: 0, lastUpdate: '1 day ago' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#DC2626';
      case 'idle': return '#EF4444';
      case 'offline': return '#B91C1C';
      case 'maintenance': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'On Trip';
      case 'idle': return 'Available';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Maintenance';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fleet Management</Text>
        <Text style={styles.headerSubtitle}>Track and manage your vehicles</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vehicle number or driver name"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Fleet Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.miniCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.miniCardNumber}>{vehicles.filter(v => v.status === 'active').length}</Text>
          <Text style={styles.miniCardLabel}>Active</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.miniCardNumber}>{vehicles.filter(v => v.status === 'idle').length}</Text>
          <Text style={styles.miniCardLabel}>Available</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#EF4444' }]}>
          <Text style={styles.miniCardNumber}>{vehicles.filter(v => v.status === 'offline').length}</Text>
          <Text style={styles.miniCardLabel}>Offline</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#6B7280' }]}>
          <Text style={styles.miniCardNumber}>{vehicles.filter(v => v.status === 'maintenance').length}</Text>
          <Text style={styles.miniCardLabel}>Maintenance</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {vehicles.map((vehicle) => (
          <TouchableOpacity key={vehicle.id} style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleNumber}>{vehicle.number}</Text>
                <Text style={styles.driverName}>{vehicle.driver}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status) }]}>
                <Text style={styles.statusText}>{getStatusText(vehicle.status)}</Text>
              </View>
            </View>

            <View style={styles.vehicleDetails}>
              <View style={styles.detailRow}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.detailText}>{vehicle.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Clock size={16} color="#6B7280" />
                <Text style={styles.detailText}>Last update: {vehicle.lastUpdate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Battery size={16} color="#6B7280" />
                <Text style={styles.detailText}>Battery: {vehicle.battery}%</Text>
                <View style={styles.batteryBar}>
                  <View style={[styles.batteryFill, { width: `${vehicle.battery}%` }]} />
                </View>
              </View>
            </View>

            <View style={styles.vehicleActions}>
              <TouchableOpacity style={styles.actionButton}>
                <MapPin size={16} color="#1E40AF" />
                <Text style={styles.actionText}>Track</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Settings size={16} color="#1E40AF" />
                <Text style={styles.actionText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
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
    color: '#E0E7FF',
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
  vehicleCard: {
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
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  driverName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  vehicleDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  batteryBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginLeft: 8,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 2,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
    marginLeft: 6,
  },
});