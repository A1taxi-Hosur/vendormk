import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TrendingUp, IndianRupee, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type DailyEarning = {
  date: string;
  displayDate: string;
  dayName: string;
  totalFares: number;
  rideCount: number;
  commissionAmount: number;
};

type RideData = {
  fare_amount: string;
  created_at: string;
};

export default function Commissions() {
  const { vendor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);

  useEffect(() => {
    if (vendor) {
      loadRideCommissions();
    } else {
      setLoading(false);
    }
  }, [vendor]);

  const loadRideCommissions = async () => {
    if (!vendor) return;

    try {
      const { data: drivers } = await supabase
        .from('drivers')
        .select('id')
        .eq('vendor_id', vendor.vendor_id);

      if (!drivers || drivers.length === 0) {
        setDailyEarnings([]);
        setLoading(false);
        return;
      }

      const driverIds = drivers.map(d => d.id);

      const { data: rides, error } = await supabase
        .from('rides')
        .select('fare_amount, created_at')
        .in('driver_id', driverIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      processRideEarnings(rides || []);
    } catch (error) {
      console.error('Error loading ride commissions:', error);
      setDailyEarnings([]);
    } finally {
      setLoading(false);
    }
  };

  const processRideEarnings = (rides: RideData[]) => {
    const dailyMap = new Map<string, { totalFares: number; rideCount: number }>();

    rides.forEach(ride => {
      const date = new Date(ride.created_at);
      const dateKey = date.toISOString().split('T')[0];
      const fare = parseFloat(ride.fare_amount || '0');

      if (dailyMap.has(dateKey)) {
        const existing = dailyMap.get(dateKey)!;
        dailyMap.set(dateKey, {
          totalFares: existing.totalFares + fare,
          rideCount: existing.rideCount + 1,
        });
      } else {
        dailyMap.set(dateKey, { totalFares: fare, rideCount: 1 });
      }
    });

    const earnings: DailyEarning[] = Array.from(dailyMap.entries())
      .map(([dateStr, data]) => {
        const date = new Date(dateStr);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const commission = data.totalFares * 0.11;

        return {
          date: dateStr,
          displayDate: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          dayName: dayNames[date.getDay()],
          totalFares: data.totalFares,
          rideCount: data.rideCount,
          commissionAmount: commission,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setDailyEarnings(earnings);
  };

  const calculateTotals = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const todayEarning = dailyEarnings.find(e => e.date === today);
    const yesterdayEarning = dailyEarnings.find(e => e.date === yesterday);

    const last7Days = dailyEarnings.slice(0, 7);
    const thisWeek = last7Days.reduce((sum, e) => sum + e.commissionAmount, 0);

    const currentMonth = new Date().getMonth();
    const thisMonth = dailyEarnings
      .filter(e => new Date(e.date).getMonth() === currentMonth)
      .reduce((sum, e) => sum + e.commissionAmount, 0);

    const totalCommission = dailyEarnings.reduce((sum, e) => sum + e.commissionAmount, 0);
    const totalFares = dailyEarnings.reduce((sum, e) => sum + e.totalFares, 0);
    const totalRides = dailyEarnings.reduce((sum, e) => sum + e.rideCount, 0);

    return {
      today: todayEarning?.commissionAmount || 0,
      yesterday: yesterdayEarning?.commissionAmount || 0,
      thisWeek,
      thisMonth,
      totalCommission,
      totalFares,
      totalRides,
      recordCount: dailyEarnings.length,
    };
  };

  const totals = calculateTotals();

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return '0.0';
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  const todayChange = getPercentageChange(totals.today, totals.yesterday);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Commissions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading commissions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Commissions</Text>
          <Text style={styles.headerSubtitle}>11% commission from completed rides</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.overviewContainer}>
          <View style={[styles.overviewCard, styles.primaryCard]}>
            <View style={styles.cardHeader}>
              <IndianRupee size={24} color="#FFFFFF" />
              {parseFloat(todayChange) !== 0 && (
                <View style={styles.changeIndicator}>
                  <TrendingUp size={16} color="#FFFFFF" />
                  <Text style={styles.changeText}>
                    {parseFloat(todayChange) > 0 ? '+' : ''}{todayChange}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.cardAmount}>₹{totals.today.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
            <Text style={styles.cardLabel}>Today&apos;s Commission</Text>
            <Text style={styles.cardSubLabel}>₹{totals.yesterday.toLocaleString('en-IN', { maximumFractionDigits: 2 })} yesterday</Text>
          </View>

          <View style={[styles.overviewCard, styles.successCard]}>
            <IndianRupee size={24} color="#FFFFFF" />
            <Text style={styles.cardAmount}>₹{totals.thisWeek.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
            <Text style={styles.cardLabel}>Last 7 Days</Text>
            <Text style={styles.cardSubLabel}>Commission earned</Text>
          </View>

          <View style={[styles.overviewCard, styles.infoCard]}>
            <IndianRupee size={24} color="#FFFFFF" />
            <Text style={styles.cardAmount}>₹{totals.thisMonth.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
            <Text style={styles.cardLabel}>This Month</Text>
            <Text style={styles.cardSubLabel}>Commission earned</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Commission</Text>
              <Text style={styles.summaryAmount}>₹{totals.totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              <Text style={styles.summaryPeriod}>All Time</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Rides</Text>
              <Text style={styles.summaryAmount}>{totals.totalRides}</Text>
              <Text style={styles.summaryPeriod}>Completed</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            <Text style={styles.sectionSubtitle}>{dailyEarnings.length} records</Text>
          </View>

          {dailyEarnings.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No commission data</Text>
              <Text style={styles.emptySubtext}>Complete rides to earn commissions</Text>
            </View>
          ) : (
            dailyEarnings.map((day, index) => (
              <View key={index} style={styles.dailyCard}>
                <View style={styles.dailyHeader}>
                  <View style={styles.dailyDateInfo}>
                    <Text style={styles.dayName}>{day.dayName}</Text>
                    <Text style={styles.dayDate}>{day.displayDate}</Text>
                  </View>
                  <View style={styles.dailyAmountInfo}>
                    <Text style={styles.dailyAmount}>₹{day.commissionAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                    <Text style={styles.dailyLabel}>Commission (11%)</Text>
                  </View>
                </View>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>{day.rideCount} rides • ₹{day.totalFares.toLocaleString('en-IN', { maximumFractionDigits: 2 })} total fares</Text>
                  <Text style={styles.commissionValue}>₹{(day.totalFares - day.commissionAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })} to driver</Text>
                </View>
                <View style={styles.dailyBar}>
                  <View
                    style={[
                      styles.dailyFill,
                      { width: `${Math.min((day.commissionAmount / Math.max(...dailyEarnings.map(e => e.commissionAmount))) * 100, 100)}%` }
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  overviewContainer: {
    marginTop: 16,
    gap: 12,
  },
  overviewCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  primaryCard: {
    backgroundColor: '#DC2626',
  },
  successCard: {
    backgroundColor: '#EF4444',
  },
  infoCard: {
    backgroundColor: '#B91C1C',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cardSubLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  summaryPeriod: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  dailyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyDateInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dayDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  dailyAmountInfo: {
    alignItems: 'flex-end',
  },
  dailyAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  dailyLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  commissionLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commissionValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  dailyBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  dailyFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});
