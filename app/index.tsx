import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)" : "/auth"} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
