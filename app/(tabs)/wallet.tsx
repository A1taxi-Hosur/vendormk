import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, History, IndianRupee } from 'lucide-react-native';

export default function WalletScreen() {
  const walletData = {
    balance: 45000,
    pendingCommission: 2890,
    lastRecharge: 10000,
    totalCommissionPaid: 46750,
  };

  const transactions = [
    { id: 1, type: 'debit', amount: 1250, description: 'Commission Payment - Week 3', date: '2025-01-15 10:30 AM', status: 'completed' },
    { id: 2, type: 'credit', amount: 10000, description: 'Wallet Recharge', date: '2025-01-14 02:15 PM', status: 'completed' },
    { id: 3, type: 'debit', amount: 1180, description: 'Commission Payment - Week 2', date: '2025-01-08 11:45 AM', status: 'completed' },
    { id: 4, type: 'credit', amount: 15000, description: 'Wallet Recharge', date: '2025-01-05 09:20 AM', status: 'completed' },
    { id: 5, type: 'debit', amount: 1340, description: 'Commission Payment - Week 1', date: '2025-01-01 10:00 AM', status: 'completed' },
  ];

  const quickRechargeAmounts = [5000, 10000, 15000, 25000];

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? 
      <ArrowDownLeft size={16} color="#10B981" /> : 
      <ArrowUpRight size={16} color="#EF4444" />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>Manage commission payments</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Wallet size={32} color="#1E40AF" />
            <TouchableOpacity style={styles.rechargeButton}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.rechargeButtonText}>Recharge</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>₹{walletData.balance.toLocaleString()}</Text>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceSubtext}>Last recharged: ₹{walletData.lastRecharge.toLocaleString()}</Text>
        </View>

        {/* Quick Recharge */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Recharge</Text>
          <View style={styles.rechargeGrid}>
            {quickRechargeAmounts.map((amount) => (
              <TouchableOpacity key={amount} style={styles.rechargeOption}>
                <IndianRupee size={16} color="#1E40AF" />
                <Text style={styles.rechargeAmount}>{amount.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.customRechargeButton}>
            <CreditCard size={20} color="#1E40AF" />
            <Text style={styles.customRechargeText}>Enter Custom Amount</Text>
          </TouchableOpacity>
        </View>

        {/* Commission Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryAmount}>₹{walletData.totalCommissionPaid.toLocaleString()}</Text>
              <Text style={styles.summarySubtext}>Commission Paid</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Commission Rate</Text>
              <Text style={styles.summaryAmount}>11%</Text>
              <Text style={styles.summarySubtext}>A1 Taxi Standard</Text>
            </View>
          </View>
          <View style={styles.autoPayCard}>
            <Text style={styles.autoPayTitle}>Auto-Pay Commission</Text>
            <Text style={styles.autoPayDesc}>Automatically deduct commission from wallet</Text>
            <TouchableOpacity style={styles.enableAutoPayButton}>
              <Text style={styles.enableAutoPayText}>Enable Auto-Pay</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <History size={20} color="#1E40AF" />
            </TouchableOpacity>
          </View>
          
          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionIcon}>
                  {getTransactionIcon(transaction.type)}
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>{transaction.date}</Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.transactionAmountText,
                    { color: transaction.type === 'credit' ? '#10B981' : '#EF4444' }
                  ]}>
                    {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.transactionStatus}>Completed</Text>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Transactions</Text>
          </TouchableOpacity>
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
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rechargeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
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
  rechargeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  rechargeOption: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rechargeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 4,
  },
  customRechargeButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FECACA',
    borderStyle: 'dashed',
  },
  customRechargeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626',
    marginLeft: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  autoPayCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  autoPayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  autoPayDesc: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 12,
  },
  enableAutoPayButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  enableAutoPayText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '500',
  },
  viewAllButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626',
  },
});