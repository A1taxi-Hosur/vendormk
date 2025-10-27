import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, Phone, MapPin, Star, TrendingUp, Clock, User } from 'lucide-react-native';

export default function Drivers() {
  const drivers = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      phone: '+91 9876543210',
      vehicle: 'TN-20-AB-1234',
      status: 'online',
      rating: 4.8,
      totalTrips: 1256,
      todayTrips: 12,
      location: 'Hosur Market',
      earnings: 2450,
      joinDate: '2023-01-15'
    },
    {
      id: 2,
      name: 'Suresh M',
      phone: '+91 9876543211',
      vehicle: 'TN-20-AC-5678',
      status: 'online',
      rating: 4.6,
      totalTrips: 890,
      todayTrips: 8,
      location: 'Bus Stand',
      earnings: 1890,
      joinDate: '2023-03-22'
    },
    {
      id: 3,
      name: 'Mohan S',
      phone: '+91 9876543212',
      vehicle: 'TN-20-AD-9012',
      status: 'offline',
      rating: 4.7,
      totalTrips: 1024,
      todayTrips: 0,
      location: 'Railway Station',
      earnings: 0,
      joinDate: '2023-02-10'
    },
    {
      id: 4,
      name: 'Kumar R',
      phone: '+91 9876543213',
      vehicle: 'TN-20-AE-3456',
      status: 'busy',
      rating: 4.9,
      totalTrips: 1456,
      todayTrips: 15,
      location: 'SIPCOT',
      earnings: 3200,
      joinDate: '2022-11-05'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#DC2626';
      case 'busy': return '#EF4444';
      case 'offline': return '#B91C1C';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Available';
      case 'busy': return 'On Trip';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Management</Text>
        <Text style={styles.headerSubtitle}>Monitor driver performance</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drivers by name or phone"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Driver Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.miniCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.miniCardNumber}>{drivers.filter(d => d.status === 'online').length}</Text>
          <Text style={styles.miniCardLabel}>Online</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.miniCardNumber}>{drivers.filter(d => d.status === 'busy').length}</Text>
          <Text style={styles.miniCardLabel}>On Trip</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#EF4444' }]}>
          <Text style={styles.miniCardNumber}>{drivers.filter(d => d.status === 'offline').length}</Text>
          <Text style={styles.miniCardLabel}>Offline</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#1E40AF' }]}>
          <Text style={styles.miniCardNumber}>{drivers.reduce((sum, d) => sum + d.todayTrips, 0)}</Text>
          <Text style={styles.miniCardLabel}>Today's Trips</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {drivers.map((driver) => (
          <TouchableOpacity key={driver.id} style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.vehicleNumber}>{driver.vehicle}</Text>
                <View style={styles.ratingContainer}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.rating}>{driver.rating}</Text>
                  <Text style={styles.totalTrips}>({driver.totalTrips} trips)</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driver.status) }]}>
                <Text style={styles.statusText}>{getStatusText(driver.status)}</Text>
              </View>
            </View>

            <View style={styles.driverStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{driver.todayTrips}</Text>
                <Text style={styles.statLabel}>Today's Trips</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>₹{driver.earnings}</Text>
                <Text style={styles.statLabel}>Today's Earnings</Text>
              </View>
              <View style={styles.statItem}>
                <MapPin size={12} color="#6B7280" />
                <Text style={styles.locationText}>{driver.location}</Text>
              </View>
            </View>

            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Phone size={16} color="#1E40AF" />
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <MapPin size={16} color="#1E40AF" />
                <Text style={styles.actionText}>Track</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <TrendingUp size={16} color="#1E40AF" />
                <Text style={styles.actionText}>Performance</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Add Driver Button */}
        <TouchableOpacity style={styles.addDriverButton}>
          <User size={24} color="#1E40AF" />
          <Text style={styles.addDriverText}>Add New Driver</Text>
          <Text style={styles.addDriverSubtext}>Expand your fleet team</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  vehicleNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 4,
  },
  totalTrips: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
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
  driverStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    textAlign: 'center',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 8,
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
  addDriverButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    borderStyle: 'dashed',
  },
  addDriverText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 8,
  },
  addDriverSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});