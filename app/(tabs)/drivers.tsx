import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, Phone, CreditCard, Car, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { supabase, DriverDailyAllowance } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type DriverWithAllowance = {
  id: string;
  name: string;
  phone: string;
  license: string;
  vehicle: string;
  vehicleDetails: string;
  allowance?: number;
};

export default function Drivers() {
  const { vendor } = useAuth();
  const [drivers, setDrivers] = useState<DriverWithAllowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalAllowance, setTotalAllowance] = useState(0);

  useEffect(() => {
    if (vendor) {
      loadDriversFromVendorDetails();
    } else {
      setLoading(false);
    }
  }, [vendor]);

  useEffect(() => {
    if (vendor && drivers.length > 0) {
      loadDriverAllowancesForDate(selectedDate);
    }
  }, [selectedDate, drivers, vendor]);

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

  const loadDriverAllowancesForDate = async (date: Date) => {
    if (!vendor) return;

    const istDate = new Date(date);
    istDate.setHours(0, 0, 0, 0);

    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const utcStartOfDay = new Date(istDate.getTime() - IST_OFFSET);
    const utcEndOfDay = new Date(istDate.getTime() + (24 * 60 * 60 * 1000) - IST_OFFSET - 1);

    try {
      const { data: driversFromDB, error: driversError } = await supabase
        .from('drivers')
        .select('id, name, phone_number, license_number, vendor_id')
        .eq('vendor_id', vendor.vendor_id);

      if (driversError) throw driversError;

      if (!driversFromDB || driversFromDB.length === 0) {
        setTotalAllowance(0);
        return;
      }

      const driverIds = driversFromDB.map(d => d.id);
      const earningsMap = new Map<string, number>();

      const [
        { data: tripCompletions },
        { data: rentalTrips },
        { data: outstationTrips },
        { data: airportTrips }
      ] = await Promise.all([
        supabase
          .from('trip_completions')
          .select('driver_id, total_amount_owed')
          .in('driver_id', driverIds)
          .gte('completed_at', utcStartOfDay.toISOString())
          .lte('completed_at', utcEndOfDay.toISOString()),
        supabase
          .from('rental_trip_completions')
          .select('driver_id, total_amount_owed')
          .in('driver_id', driverIds)
          .gte('completed_at', utcStartOfDay.toISOString())
          .lte('completed_at', utcEndOfDay.toISOString()),
        supabase
          .from('outstation_trip_completions')
          .select('driver_id, total_amount_owed')
          .in('driver_id', driverIds)
          .gte('completed_at', utcStartOfDay.toISOString())
          .lte('completed_at', utcEndOfDay.toISOString()),
        supabase
          .from('airport_trip_completions')
          .select('driver_id, total_amount_owed')
          .in('driver_id', driverIds)
          .gte('completed_at', utcStartOfDay.toISOString())
          .lte('completed_at', utcEndOfDay.toISOString())
      ]);

      const allTrips = [
        ...(tripCompletions || []),
        ...(rentalTrips || []),
        ...(outstationTrips || []),
        ...(airportTrips || [])
      ];

      let total = 0;
      allTrips.forEach((trip: any) => {
        const amount = parseFloat(trip.total_amount_owed || '0');
        const current = earningsMap.get(trip.driver_id) || 0;
        earningsMap.set(trip.driver_id, current + amount);
        total += amount;
      });

      setTotalAllowance(total);

      const updatedDrivers = drivers.map(driver => {
        const dbDriver = driversFromDB?.find(
          d => d.name.toLowerCase() === driver.name.toLowerCase() ||
               d.phone_number === driver.phone
        );

        const driverId = dbDriver?.id || driver.id;
        const allowance = earningsMap.get(driverId) || 0;

        return {
          ...driver,
          id: driverId,
          allowance
        };
      });

      setDrivers(updatedDrivers);
    } catch (error) {
      console.error('Error loading driver allowances:', error);
      setTotalAllowance(0);
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.phone.includes(searchQuery) ||
    driver.license.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.vehicle.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedDate);
    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const today = isToday(day);
      const selected = isSelectedDay(day);
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            today && styles.calendarDayToday,
            selected && styles.calendarDaySelected,
          ]}
          onPress={() => selectDate(day)}
        >
          <Text
            style={[
              styles.calendarDayText,
              (today || selected) && styles.calendarDayTextActive,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarNavButton}>
            <ChevronLeft size={20} color="#DC2626" />
          </TouchableOpacity>
          <Text style={styles.calendarMonth}>{formatMonthYear(selectedDate)}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarNavButton}>
            <ChevronRight size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarWeekDays}>
          {weekDays.map(day => (
            <View key={day} style={styles.calendarWeekDay}>
              <Text style={styles.calendarWeekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarDaysGrid}>{days}</View>

        {totalAllowance > 0 && (
          <View style={styles.calendarFooter}>
            <Text style={styles.calendarFooterLabel}>Total Allowance for {selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
            <Text style={styles.calendarFooterAmount}>₹{totalAllowance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
          </View>
        )}
      </View>
    );
  };

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
        <Text style={styles.headerSubtitle}>View drivers and daily allowances</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCalendar()}

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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Drivers for {selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        </View>

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
              <View style={styles.allowanceContainer}>
                {driver.allowance !== undefined && driver.allowance > 0 ? (
                  <>
                    <Text style={styles.allowanceAmount}>
                      ₹{driver.allowance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.allowanceLabel}>Earned</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.noAllowanceText}>₹0.00</Text>
                    <Text style={styles.allowanceLabel}>No Earnings</Text>
                  </>
                )}
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
  content: {
    flex: 1,
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
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarNavButton: {
    padding: 4,
  },
  calendarMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calendarWeekDayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calendarDayToday: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  calendarDaySelected: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
  },
  calendarDayText: {
    fontSize: 12,
    color: '#111827',
  },
  calendarDayTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  calendarFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  calendarFooterLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  calendarFooterAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
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
    marginTop: 16,
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
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
  allowanceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  allowanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 2,
  },
  allowanceLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  noAllowanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
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
