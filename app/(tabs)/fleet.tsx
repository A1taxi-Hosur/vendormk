import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Search, Plus, X, Trash2 } from 'lucide-react-native';
import { supabase, Vehicle, Driver } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function Fleet() {
  const { vendor } = useAuth();
  const [vehicles, setVehicles] = useState<(Vehicle & { driver?: Driver })[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    vehicle_number: '',
    vehicle_type: 'car' as 'car' | 'bike' | 'van' | 'truck',
    make: '',
    model: '',
    year: '',
    driver_id: '',
  });

  useEffect(() => {
    if (vendor) {
      loadVehicles();
      loadDrivers();
    } else {
      setLoading(false);
    }
  }, [vendor]);


  const loadVehicles = async () => {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          driver:drivers(*)
        `)
        .eq('vendor_id', vendor.vendor_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('vendor_id', vendor.vendor_id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const handleAddVehicle = async () => {
    if (!vendor) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    if (!formData.vehicle_number || !formData.make || !formData.model) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('vehicles')
        .insert({
          vendor_id: vendor.vendor_id,
          vehicle_number: formData.vehicle_number.toUpperCase(),
          vehicle_type: formData.vehicle_type,
          make: formData.make,
          model: formData.model,
          year: formData.year ? parseInt(formData.year) : null,
          driver_id: formData.driver_id || null,
          status: 'active',
        });

      if (error) throw error;

      Alert.alert('Success', 'Vehicle added successfully');
      setModalVisible(false);
      setFormData({ vehicle_number: '', vehicle_type: 'car', make: '', model: '', year: '', driver_id: '' });
      await loadVehicles();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this vehicle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', vehicleId);

              if (error) throw error;

              Alert.alert('Success', 'Vehicle deleted successfully');
              await loadVehicles();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const toggleVehicleStatus = async (vehicle: Vehicle) => {
    try {
      const statusOrder = ['active', 'maintenance', 'inactive'];
      const currentIndex = statusOrder.indexOf(vehicle.status);
      const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length] as 'active' | 'maintenance' | 'inactive';

      const { error } = await supabase
        .from('vehicles')
        .update({ status: newStatus })
        .eq('id', vehicle.id);

      if (error) throw error;
      await loadVehicles();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vehicle.driver && vehicle.driver.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
  const inactiveVehicles = vehicles.filter(v => v.status === 'inactive').length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fleet Management</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading vehicles...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fleet Management</Text>
        <Text style={styles.headerSubtitle}>Manage your vehicles</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vehicles"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.miniCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.miniCardNumber}>{activeVehicles}</Text>
          <Text style={styles.miniCardLabel}>Active</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.miniCardNumber}>{maintenanceVehicles}</Text>
          <Text style={styles.miniCardLabel}>Maintenance</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#EF4444' }]}>
          <Text style={styles.miniCardNumber}>{inactiveVehicles}</Text>
          <Text style={styles.miniCardLabel}>Inactive</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#DC2626' }]}>
          <Text style={styles.miniCardNumber}>{vehicles.length}</Text>
          <Text style={styles.miniCardLabel}>Total</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredVehicles.map((vehicle) => (
          <View key={vehicle.id} style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleNumber}>{vehicle.vehicle_number}</Text>
                <Text style={styles.vehicleDetails}>
                  {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
                </Text>
                <Text style={styles.vehicleType}>{vehicle.vehicle_type.toUpperCase()}</Text>
                {vehicle.driver && (
                  <Text style={styles.driverName}>Driver: {vehicle.driver.name}</Text>
                )}
                {!vehicle.driver && (
                  <Text style={styles.noDriver}>No driver assigned</Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status) }]}>
                <Text style={styles.statusText}>{vehicle.status}</Text>
              </View>
            </View>

            <View style={styles.vehicleActions}>
              <TouchableOpacity
                style={[styles.actionButton, { flex: 2 }]}
                onPress={() => toggleVehicleStatus(vehicle)}
              >
                <Text style={styles.actionText}>
                  {vehicle.status === 'active' ? 'Set Maintenance' : vehicle.status === 'maintenance' ? 'Set Inactive' : 'Set Active'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteVehicle(vehicle.id)}
              >
                <Trash2 size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredVehicles.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No vehicles found</Text>
            <Text style={styles.emptySubtext}>Add your first vehicle to get started</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.addVehicleButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={24} color="#DC2626" />
          <Text style={styles.addVehicleText}>Add New Vehicle</Text>
          <Text style={styles.addVehicleSubtext}>Expand your fleet</Text>
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
              <Text style={styles.modalTitle}>Add New Vehicle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., TN-20-AB-1234"
                  autoCapitalize="characters"
                  value={formData.vehicle_number}
                  onChangeText={(text) => setFormData({ ...formData, vehicle_number: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Type *</Text>
                <View style={styles.typeSelector}>
                  {(['car', 'bike', 'van', 'truck'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        formData.vehicle_type === type && styles.typeOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, vehicle_type: type })}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          formData.vehicle_type === type && styles.typeOptionTextSelected,
                        ]}
                      >
                        {type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Make *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Toyota, Honda"
                  value={formData.make}
                  onChangeText={(text) => setFormData({ ...formData, make: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Model *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Camry, Civic"
                  value={formData.model}
                  onChangeText={(text) => setFormData({ ...formData, model: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Year (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2020"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={formData.year}
                  onChangeText={(text) => setFormData({ ...formData, year: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign Driver (Optional)</Text>
                <View style={styles.driverSelector}>
                  <TouchableOpacity
                    style={[
                      styles.driverOption,
                      !formData.driver_id && styles.driverOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, driver_id: '' })}
                  >
                    <Text
                      style={[
                        styles.driverOptionText,
                        !formData.driver_id && styles.driverOptionTextSelected,
                      ]}
                    >
                      No Driver
                    </Text>
                  </TouchableOpacity>
                  {drivers.map((driver) => (
                    <TouchableOpacity
                      key={driver.id}
                      style={[
                        styles.driverOption,
                        formData.driver_id === driver.id && styles.driverOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, driver_id: driver.id })}
                    >
                      <Text
                        style={[
                          styles.driverOptionText,
                          formData.driver_id === driver.id && styles.driverOptionTextSelected,
                        ]}
                      >
                        {driver.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {drivers.length === 0 && (
                  <Text style={styles.noDriversText}>No active drivers available. Add drivers first.</Text>
                )}
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
                  onPress={handleAddVehicle}
                >
                  <Text style={styles.submitButtonText}>Add Vehicle</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return '#10B981';
    case 'maintenance': return '#F59E0B';
    case 'inactive': return '#EF4444';
    default: return '#6B7280';
  }
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
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  vehicleType: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  noDriver: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
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
  vehicleActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
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
  addVehicleButton: {
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
  addVehicleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 8,
  },
  addVehicleSubtext: {
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
    maxHeight: '85%',
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
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  typeOptionSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeOptionTextSelected: {
    color: '#DC2626',
  },
  driverSelector: {
    gap: 8,
  },
  driverOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  driverOptionSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  driverOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  driverOptionTextSelected: {
    color: '#DC2626',
    fontWeight: '600',
  },
  noDriversText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
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
