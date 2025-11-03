import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TrendingUp, IndianRupee, Download } from 'lucide-react-native';

export default function Earnings() {
  const earningsData = {
    today: 15420,
    yesterday: 13780,
    thisWeek: 98560,
    thisMonth: 425000,
    totalCommissionPaid: 46750,
    pendingCommission: 2890,
  };

  const dailyEarnings = [
    { day: 'Mon', amount: 12500, trips: 45 },
    { day: 'Tue', amount: 13200, trips: 48 },
    { day: 'Wed', amount: 11800, trips: 42 },
    { day: 'Thu', amount: 14500, trips: 52 },
    { day: 'Fri', amount: 15420, trips: 55 },
    { day: 'Sat', amount: 18900, trips: 67 },
    { day: 'Sun', amount: 16200, trips: 58 },
  ];

  const commissionBreakdown = {
    grossEarnings: 98560,
    companyCommission: 10842, // 11%
    convenienceFee: 985,
    netEarnings: 86733,
  };

  const getPercentageChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  const todayChange = getPercentageChange(earningsData.today, earningsData.yesterday);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your revenue and commission</Text>
        <TouchableOpacity style={styles.downloadButton}>
          <Download size={16} color="#FFFFFF" />
          <Text style={styles.downloadText}>Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Earnings Overview */}
        <View style={styles.overviewContainer}>
          <View style={[styles.overviewCard, styles.primaryCard]}>
            <View style={styles.cardHeader}>
              <IndianRupee size={24} color="#FFFFFF" />
              <View style={styles.changeIndicator}>
                <TrendingUp size={16} color="#FFFFFF" />
                <Text style={styles.changeText}>+{todayChange}%</Text>
              </View>
            </View>
            <Text style={styles.cardAmount}>₹{earningsData.today.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>Today&apos;s Earnings</Text>
            <Text style={styles.cardSubLabel}>₹{earningsData.yesterday.toLocaleString()} yesterday</Text>
          </View>

          <View style={[styles.overviewCard, styles.successCard]}>
            <IndianRupee size={24} color="#FFFFFF" />
            <Text style={styles.cardAmount}>₹{earningsData.thisWeek.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>This Week</Text>
            <Text style={styles.cardSubLabel}>367 total trips</Text>
          </View>

          <View style={[styles.overviewCard, styles.infoCard]}>
            <IndianRupee size={24} color="#FFFFFF" />
            <Text style={styles.cardAmount}>₹{earningsData.thisMonth.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>This Month</Text>
            <Text style={styles.cardSubLabel}>1,540 total trips</Text>
          </View>
        </View>

        {/* Commission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission Status</Text>
          <View style={styles.commissionCard}>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Gross Earnings (This Week)</Text>
              <Text style={styles.commissionAmount}>₹{commissionBreakdown.grossEarnings.toLocaleString()}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>A1 Commission (11%)</Text>
              <Text style={[styles.commissionAmount, styles.deductionAmount]}>-₹{commissionBreakdown.companyCommission.toLocaleString()}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Convenience Fee</Text>
              <Text style={[styles.commissionAmount, styles.deductionAmount]}>-₹{commissionBreakdown.convenienceFee.toLocaleString()}</Text>
            </View>
            <View style={[styles.commissionRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Net Earnings</Text>
              <Text style={styles.totalAmount}>₹{commissionBreakdown.netEarnings.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.pendingCommission}>
            <Text style={styles.pendingLabel}>Pending Commission Payment</Text>
            <Text style={styles.pendingAmount}>₹{earningsData.pendingCommission.toLocaleString()}</Text>
            <TouchableOpacity style={styles.payCommissionButton}>
              <Text style={styles.payCommissionText}>Pay from Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Breakdown (This Week)</Text>
          {dailyEarnings.map((day, index) => (
            <View key={index} style={styles.dailyCard}>
              <View style={styles.dailyHeader}>
                <Text style={styles.dayName}>{day.day}</Text>
                <Text style={styles.dailyAmount}>₹{day.amount.toLocaleString()}</Text>
              </View>
              <Text style={styles.tripsCount}>{day.trips} trips completed</Text>
              <View style={styles.dailyBar}>
                <View style={[styles.dailyFill, { width: `${(day.amount / 20000) * 100}%` }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Commission Paid</Text>
              <Text style={styles.summaryAmount}>₹{earningsData.totalCommissionPaid.toLocaleString()}</Text>
              <Text style={styles.summaryPeriod}>This Month</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Commission Rate</Text>
              <Text style={styles.summaryAmount}>11%</Text>
              <Text style={styles.summaryPeriod}>Standard Rate</Text>
            </View>
          </View>
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
    color: '#E0E7FF',
    marginTop: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  commissionCard: {
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
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  commissionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deductionAmount: {
    color: '#EF4444',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
  },
  pendingCommission: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  pendingLabel: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 4,
  },
  pendingAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 12,
  },
  payCommissionButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  payCommissionText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    marginBottom: 4,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dailyAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  tripsCount: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  dailyBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  dailyFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 2,
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
});