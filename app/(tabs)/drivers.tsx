import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Search, Plus, X, Phone, Mail, CreditCard } from 'lucide-react-native';
import { supabase, Driver } from '@/lib/supabase';

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: '',
  });

  useEffect(() => {
    initializeVendorAndLoadDrivers();
  }, []);

  const initializeVendorAndLoadDrivers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      let { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendor) {
        const { data: newVendor, error } = await supabase
          .from('vendors')
          .insert({
            user_id: user.id,
            name: user.email?.split('@')[0] || 'Vendor',
            email: user.email || '',
          })
          .select()
          .single();

        if (error) throw error;
        vendor = newVendor;
      }

      if (vendor) {
        setVendorId(vendor.id);
        await loadDrivers(vendor.id);
      }
    } catch (error) {
      console.error('Error initializing:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async (vId: string) => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('vendor_id', vId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const handleAddDriver = async () => {
    if (!vendorId) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    if (!formData.name || !formData.phone || !formData.license_number) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('drivers')
        .insert({
          vendor_id: vendorId,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone,
          license_number: formData.license_number,
          status: 'active',
        });

      if (error) throw error;

      Alert.alert('Success', 'Driver added successfully');
      setModalVisible(false);
      setFormData({ name: '', email: '', phone: '', license_number: '' });
      await loadDrivers(vendorId);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('drivers')
                .delete()
                .eq('id', driverId);

              if (error) throw error;

              Alert.alert('Success', 'Driver deleted successfully');
              if (vendorId) await loadDrivers(vendorId);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const toggleDriverStatus = async (driver: Driver) => {
    try {
      const newStatus = driver.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('drivers')
        .update({ status: newStatus })
        .eq('id', driver.id);

      if (error) throw error;
      if (vendorId) await loadDrivers(vendorId);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.phone.includes(searchQuery) ||
    driver.license_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const inactiveDrivers = drivers.filter(d => d.status === 'inactive').length;

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
        <Text style={styles.headerSubtitle}>Manage your fleet drivers</Text>
      </View>

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
        <View style={[styles.miniCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.miniCardNumber}>{activeDrivers}</Text>
          <Text style={styles.miniCardLabel}>Active</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#EF4444' }]}>
          <Text style={styles.miniCardNumber}>{inactiveDrivers}</Text>
          <Text style={styles.miniCardLabel}>Inactive</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#DC2626' }]}>
          <Text style={styles.miniCardNumber}>{drivers.length}</Text>
          <Text style={styles.miniCardLabel}>Total</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredDrivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.detailRow}>
                  <Phone size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{driver.phone}</Text>
                </View>
                {driver.email && (
                  <View style={styles.detailRow}>
                    <Mail size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{driver.email}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <CreditCard size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{driver.license_number}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: driver.status === 'active' ? '#10B981' : '#EF4444' }]}>
                <Text style={styles.statusText}>{driver.status}</Text>
              </View>
            </View>

            <View style={styles.driverActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: driver.status === 'active' ? '#FEE2E2' : '#D1FAE5' }]}
                onPress={() => toggleDriverStatus(driver)}
              >
                <Text style={[styles.actionText, { color: driver.status === 'active' ? '#DC2626' : '#10B981' }]}>
                  {driver.status === 'active' ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
                onPress={() => handleDeleteDriver(driver.id)}
              >
                <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredDrivers.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No drivers found</Text>
            <Text style={styles.emptySubtext}>Add your first driver to get started</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.addDriverButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={24} color="#DC2626" />
          <Text style={styles.addDriverText}>Add New Driver</Text>
          <Text style={styles.addDriverSubtext}>Expand your fleet team</Text>
        </TouchableOpacity>
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
              <Text style={styles.modalTitle}>Add New Driver</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter driver name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>License Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter license number"
                  autoCapitalize="characters"
                  value={formData.license_number}
                  onChangeText={(text) => setFormData({ ...formData, license_number: text })}
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
                  onPress={handleAddDriver}
                >
                  <Text style={styles.submitButtonText}>Add Driver</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
    marginBottom: 12,
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
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    height: 32,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
  addDriverButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FEE2E2',
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
