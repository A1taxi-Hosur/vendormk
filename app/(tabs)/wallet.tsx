import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Linking } from 'react-native';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { supabase, Wallet as WalletType, WalletTransaction, Commission } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Constants from 'expo-constants';

export default function WalletScreen() {
  const { vendor } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalDeducted, setTotalDeducted] = useState(0);

  useEffect(() => {
    if (vendor) {
      loadWallet();
      loadCommissions();
      loadTransactions();
    } else {
      setLoading(false);
    }
  }, [vendor]);

  useEffect(() => {
    if (vendor) {
      calculateBalanceForDate(selectedDate);
    }
  }, [selectedDate, vendor]);

  const calculateBalanceForDate = async (date: Date) => {
    if (!vendor) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    try {
      const { data, error } = await supabase.rpc('get_cumulative_wallet_balance', {
        p_vendor_id: vendor.vendor_id,
        p_date: dateString
      });

      if (error) throw error;

      const selectedDayData = data?.find((d: any) => d.balance_date === dateString);

      if (selectedDayData) {
        setTotalAllocated(parseFloat(selectedDayData.admin_credit || '0'));
        setTotalDeducted(parseFloat(selectedDayData.driver_commission || '0'));
        setCalculatedBalance(parseFloat(selectedDayData.cumulative_balance || '0'));
      } else {
        setTotalAllocated(0);
        setTotalDeducted(0);
        setCalculatedBalance(0);
      }
    } catch (error) {
      console.error('Error calculating balance:', error);
      setTotalAllocated(0);
      setCalculatedBalance(0);
      setTotalDeducted(0);
    }
  };

  const loadWallet = async () => {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('vendor_id', vendor.vendor_id)
        .maybeSingle();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('vendor_id', vendor.vendor_id)
        .order('commission_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCommissions(data || []);
    } catch (error) {
      console.error('Error loading commissions:', error);
    }
  };

  const loadTransactions = async () => {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('vendor_id', vendor.vendor_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleAddCredit = async () => {
    if (!vendor || !wallet) {
      Alert.alert('Error', 'Wallet not initialized');
      return;
    }

    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/initiate-zoho-payment`;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(creditAmount),
          description: description,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Payment initiation failed');
      }

      setModalVisible(false);
      setCreditAmount('');
      setDescription('');

      if (result.payment_url) {
        const supported = await Linking.canOpenURL(result.payment_url);
        if (supported) {
          await Linking.openURL(result.payment_url);
          Alert.alert(
            'Payment Initiated',
            'Please complete the payment in your browser. Your wallet will be credited automatically after successful payment.',
            [
              {
                text: 'OK',
                onPress: () => {
                  loadWallet();
                  loadTransactions();
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', 'Cannot open payment URL');
        }
      } else {
        Alert.alert('Error', 'Payment URL not received from gateway');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Payment initiation failed');
    }
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setSelectedDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDay = (day: number) => {
    const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    return (
      day === selectedDate.getDate() &&
      checkDate.getMonth() === selectedDate.getMonth()
    );
  };

  const selectDate = (day: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day, 12, 0, 0);
    setSelectedDate(newDate);
  };

  const renderCompactCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedDate);
    const days = [];
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.compactCalendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const today = isToday(day);
      const selected = isSelectedDay(day);
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.compactCalendarDay,
            today && styles.compactCalendarDayToday,
            selected && styles.compactCalendarDaySelected,
          ]}
          onPress={() => selectDate(day)}
        >
          <Text
            style={[
              styles.compactCalendarDayText,
              (today || selected) && styles.compactCalendarDayTextActive,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.compactCalendarCard}>
        <View style={styles.compactCalendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.compactCalendarNavButton}>
            <ChevronLeft size={16} color="#DC2626" />
          </TouchableOpacity>
          <Text style={styles.compactCalendarMonth}>{formatMonthYear(selectedDate)}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.compactCalendarNavButton}>
            <ChevronRight size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View style={styles.compactCalendarWeekDays}>
          {weekDays.map((day, idx) => (
            <View key={idx} style={styles.compactCalendarWeekDay}>
              <Text style={styles.compactCalendarWeekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.compactCalendarDaysGrid}>{days}</View>
      </View>
    );
  };

  const quickAmounts = [1000, 5000, 10000, 25000];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wallet</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>Daily balance tracker</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Wallet size={24} color="#DC2626" />
              <TouchableOpacity
                style={styles.rechargeButton}
                onPress={() => setModalVisible(true)}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.rechargeButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              ₹{calculatedBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.balanceLabel}>Balance on {selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>

            <View style={styles.miniStatsRow}>
              <View style={styles.miniStatItem}>
                <Text style={styles.miniStatLabel}>Allocated</Text>
                <Text style={styles.miniStatValue}>₹{totalAllocated.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.miniStatItem}>
                <Text style={styles.miniStatLabel}>Deducted</Text>
                <Text style={[styles.miniStatValue, { color: '#EF4444' }]}>₹{totalDeducted.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              </View>
            </View>
          </View>

          {renderCompactCalendar()}
        </View>

        <View style={styles.infoCard}>
          <Calendar size={16} color="#1E40AF" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Wallet Calculation</Text>
            <Text style={styles.infoText}>
              Balance = Admin Commission Credit - Driver Allowances for selected date
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission Credits from Admin</Text>
          {commissions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No commissions yet</Text>
              <Text style={styles.emptySubtext}>Admin will add commission credits</Text>
            </View>
          )}

          {commissions.map((commission) => (
            <View key={commission.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: '#D1FAE5' }
                  ]}
                >
                  <ArrowDownLeft size={20} color="#10B981" />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>
                    {commission.notes || 'Commission Credit'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(commission.commission_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    style={[
                      styles.transactionAmountText,
                      { color: '#10B981' }
                    ]}
                  >
                    +₹{parseFloat(commission.commission_amount).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Transactions will appear here</Text>
            </View>
          )}

          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.transaction_type === 'credit' ? '#D1FAE5' : '#FEE2E2' }
                  ]}
                >
                  {transaction.transaction_type === 'credit' ? (
                    <ArrowDownLeft size={20} color="#10B981" />
                  ) : (
                    <ArrowUpRight size={20} color="#EF4444" />
                  )}
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    style={[
                      styles.transactionAmountText,
                      { color: transaction.transaction_type === 'credit' ? '#10B981' : '#EF4444' }
                    ]}
                  >
                    {transaction.transaction_type === 'credit' ? '+' : '-'}₹
                    {parseFloat(transaction.amount).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Credit</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quick Select</Text>
                <View style={styles.quickAmounts}>
                  {quickAmounts.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickAmountButton,
                        creditAmount === amount.toString() && styles.quickAmountButtonSelected,
                      ]}
                      onPress={() => {
                        setCreditAmount(amount.toString());
                        setDescription(`Admin daily credit - ₹${amount}`);
                      }}
                    >
                      <Text
                        style={[
                          styles.quickAmountText,
                          creditAmount === amount.toString() && styles.quickAmountTextSelected,
                        ]}
                      >
                        ₹{amount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={creditAmount}
                  onChangeText={setCreditAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g., Admin daily credit"
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleAddCredit}
                >
                  <Text style={styles.submitButtonText}>Add Credit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  topRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rechargeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  miniStatItem: {
    flex: 1,
  },
  miniStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  miniStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  compactCalendarCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactCalendarNavButton: {
    padding: 4,
  },
  compactCalendarMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  compactCalendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  compactCalendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  compactCalendarWeekDayText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
  },
  compactCalendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  compactCalendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  compactCalendarDayToday: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
  },
  compactCalendarDaySelected: {
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
  compactCalendarDayText: {
    fontSize: 10,
    color: '#111827',
  },
  compactCalendarDayTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
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
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  quickAmountButtonSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  quickAmountTextSelected: {
    color: '#DC2626',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#DC2626',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
