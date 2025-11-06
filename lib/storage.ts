import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class Storage {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error getting item from localStorage:', error);
        return null;
      }
    } else {
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.error('Error getting item from AsyncStorage:', error);
        return null;
      }
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error setting item in localStorage:', error);
      }
    } else {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        console.error('Error setting item in AsyncStorage:', error);
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing item from localStorage:', error);
      }
    } else {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing item from AsyncStorage:', error);
      }
    }
  }
}

export const storage = new Storage();
