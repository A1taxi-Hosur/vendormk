import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Car, TrendingUp, Users, IndianRupee, Clock, MapPin, Wallet } from 'lucide-react-native';

export default function Dashboard() {
  const dashboardStats = {
    totalVehicles: 25,
    activeVehicles: 18,
    todayEarnings: 15420,
    totalDrivers: 32,
    walletBalance: 45000,
    pendingCommission: 2890
  };

  const recentTrips = [
    { id: 1, driver: 'Rajesh Kumar', vehicle: 'TN-20-AB-1234', amount: 380, time: '2 mins ago', status: 'completed' },
    { id: 2, driver: 'Suresh M', vehicle: 'TN-20-AC-5678', amount: 250, time: '8 mins ago', status: 'completed' },
    { id: 3, driver: 'Mohan S', vehicle: 'TN-20-AD-9012', amount: 150, time: '15 mins ago', status: 'completed' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>A1 Call Taxi</Text>
        <Text style={styles.headerSubtitle}>Vendor Dashboard - Hosur</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <Car size={24} color="#FFFFFF" />
            <Text style={styles.statNumber}>{dashboardStats.totalVehicles}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
            <Text style={styles.statSubLabel}>{dashboardStats.activeVehicles} Active</Text>
          </View>

          <View style={[styles.statCard, styles.successCard]}>
            <IndianRupee size={24} color="#FFFFFF" />
            <Text style={styles.statNumber}>₹{dashboardStats.todayEarnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={styles.statSubLabel}>+12% from yesterday</Text>
          </View>

          <View style={[styles.statCard, styles.warningCard]}>
            <Users size={24} color="#FFFFFF" />
            <Text style={styles.statNumber}>{dashboardStats.totalDrivers}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
            <Text style={styles.statSubLabel}>28 Online now</Text>
          </View>

          <View style={[styles.statCard, styles.infoCard]}>
            <Wallet size={24} color="#FFFFFF" />
            <Text style={styles.statNumber}>₹{dashboardStats.walletBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Wallet Balance</Text>
            <Text style={styles.statSubLabel}>Commission ready</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Car size={20} color="#1E40AF" />
              <Text style={styles.actionText}>Add Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Users size={20} color="#1E40AF" />
              <Text style={styles.actionText}>Add Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IndianRupee size={20} color="#1E40AF" />
              <Text style={styles.actionText}>Recharge Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Trips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          {recentTrips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.driverName}>{trip.driver}</Text>
                <Text style={styles.tripAmount}>₹{trip.amount}</Text>
              </View>
              <Text style={styles.vehicleNumber}>{trip.vehicle}</Text>
              <View style={styles.tripFooter}>
                <Text style={styles.tripTime}>
                  <Clock size={12} color="#6B7280" /> {trip.time}
                </Text>
                <View style={[styles.statusBadge, styles.completedBadge]}>
                  <Text style={styles.statusText}>Completed</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#DC2626',
  },
  successCard: {
    backgroundColor: '#EF4444',
  },
  warningCard: {
    backgroundColor: '#B91C1C',
  },
  infoCard: {
    backgroundColor: '#991B1B',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  statSubLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
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
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tripAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  vehicleNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  tripTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#991B1B',
  },
});