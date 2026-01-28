import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Search, Phone, CreditCard, Car, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin } from 'lucide-react-native';
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

type RideDetail = {
  ride_code: string;
  fare_amount: number;
  commission_amount: number;
  pickup_address: string;
  destination_address: string;
  distance_km: number;
  created_at: string;
  booking_type: string;
};

export default function Drivers() {
  const { vendor } = useAuth();
  const [drivers, setDrivers] = useState<DriverWithAllowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalAllowance, setTotalAllowance] = useState(0);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [driverRides, setDriverRides] = useState<RideDetail[]>([]);
  const [loadingRides, setLoadingRides] = useState(false);

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

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    try {
      const { data: dailyAmounts, error } = await supabase.rpc('get_driver_daily_amounts_for_vendor', {
        p_vendor_id: vendor.vendor_id,
        p_date: dateString
      });

      if (error) throw error;

      const earningsMap = new Map<string, number>();
      let total = 0;

      (dailyAmounts || []).forEach((record: any) => {
        const amount = parseFloat(record.daily_total_owed || '0');
        earningsMap.set(record.driver_name, amount);
        total += amount;
      });

      setTotalAllowance(total);

      const updatedDrivers = drivers.map(driver => {
        const allowance = earningsMap.get(driver.name) || 0;
        return { ...driver, allowance };
      });

      setDrivers(updatedDrivers);
    } catch (error) {
      console.error('Error loading driver allowances:', error);
      setTotalAllowance(0);
    }
  };

  const loadDriverRides = async (driverName: string) => {
    if (!vendor) return;

    setLoadingRides(true);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    try {
      const { data, error } = await supabase.rpc('get_driver_rides_by_date', {
        p_vendor_id: vendor.vendor_id,
        p_driver_name: driverName,
        p_date: dateString
      });

      if (error) throw error;
      setDriverRides(data || []);
    } catch (error) {
      console.error('Error loading driver rides:', error);
      setDriverRides([]);
    } finally {
      setLoadingRides(false);
    }
  };

  const toggleDriverExpansion = async (driverName: string) => {
    if (expandedDriver === driverName) {
      setExpandedDriver(null);
      setDriverRides([]);
    } else {
      setExpandedDriver(driverName);
      await loadDriverRides(driverName);
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
            <Text style={styles.calendarFooterLabel}>Total Commission for {selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
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
        <Text style={styles.headerSubtitle}>View drivers and daily commissions</Text>
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

        {filteredDrivers.map((driver) => {
          const isExpanded = expandedDriver === driver.name;
          return (
            <View key={driver.id} style={styles.driverCard}>
              <TouchableOpacity
                onPress={() => toggleDriverExpansion(driver.name)}
                activeOpacity={0.7}
              >
                <View style={styles.driverHeader}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverNameRow}>
                      <Text style={styles.driverName}>{driver.name}</Text>
                      {isExpanded ? (
                        <ChevronUp size={20} color="#DC2626" />
                      ) : (
                        <ChevronDown size={20} color="#6B7280" />
                      )}
                    </View>
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
                        <Text style={styles.allowanceLabel}>Commission</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.noAllowanceText}>₹0.00</Text>
                        <Text style={styles.allowanceLabel}>No Commission</Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.ridesContainer}>
                  {loadingRides ? (
                    <View style={styles.loadingRidesContainer}>
                      <ActivityIndicator size="small" color="#DC2626" />
                      <Text style={styles.loadingRidesText}>Loading rides...</Text>
                    </View>
                  ) : driverRides.length > 0 ? (
                    <>
                      <View style={styles.ridesHeader}>
                        <Text style={styles.ridesHeaderText}>
                          {driverRides.length} {driverRides.length === 1 ? 'Ride' : 'Rides'} on {selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </Text>
                      </View>
                      {driverRides.map((ride, index) => (
                        <View key={ride.ride_code} style={styles.rideItem}>
                          <View style={styles.rideHeader}>
                            <Text style={styles.rideCode}>#{ride.ride_code}</Text>
                            <Text style={styles.rideFare}>
                              ₹{parseFloat(ride.commission_amount.toString()).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </Text>
                          </View>
                          <View style={styles.rideDetails}>
                            <View style={styles.rideDetailRow}>
                              <MapPin size={12} color="#10B981" />
                              <Text style={styles.rideDetailText} numberOfLines={1}>
                                {ride.pickup_address}
                              </Text>
                            </View>
                            <View style={styles.rideDetailRow}>
                              <MapPin size={12} color="#DC2626" />
                              <Text style={styles.rideDetailText} numberOfLines={1}>
                                {ride.destination_address}
                              </Text>
                            </View>
                            <View style={styles.rideMetaRow}>
                              <Text style={styles.rideMetaText}>
                                {ride.distance_km ? `${parseFloat(ride.distance_km.toString()).toFixed(1)} km` : 'N/A'}
                              </Text>
                              <Text style={styles.rideMetaDivider}>•</Text>
                              <Text style={styles.rideMetaText}>
                                {new Date(ride.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                              {ride.booking_type && (
                                <>
                                  <Text style={styles.rideMetaDivider}>•</Text>
                                  <Text style={styles.rideMetaText}>{ride.booking_type}</Text>
                                </>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </>
                  ) : (
                    <View style={styles.noRidesContainer}>
                      <Text style={styles.noRidesText}>No rides found for this date</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

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
  driverNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
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
  ridesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  loadingRidesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingRidesText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  ridesHeader: {
    marginBottom: 12,
  },
  ridesHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rideItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rideCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rideFare: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  rideDetails: {
    gap: 6,
  },
  rideDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rideDetailText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  rideMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rideMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rideMetaDivider: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 6,
  },
  noRidesContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noRidesText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
