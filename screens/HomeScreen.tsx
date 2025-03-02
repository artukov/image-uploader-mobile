// screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UploadStatusHeader from '../components/UploadStatusHeader';

interface QueuedImage {
  uri: string;
  base64: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  attempts: number;
}

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [uploading, setUploading] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const checkNetworkAndProcess = async () => {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected) {
        processQueue();
      }
      loadQueueCount();
    };
    checkNetworkAndProcess();
  }, []);

  const loadQueueCount = async () => {
    try {
      const queue = await AsyncStorage.getItem('uploadQueue');
      const parsedQueue: QueuedImage[] = queue ? JSON.parse(queue) : [];
      setQueueCount(parsedQueue.length);
    } catch (error) {
      console.log(error);
    }
  };

  const processQueue = async () => {
    try {
      const queueString = await AsyncStorage.getItem('uploadQueue');
      const parsedQueue: QueuedImage[] = queueString ? JSON.parse(queueString) : [];
      if (parsedQueue.length > 0) {
        setUploading(true);
        const updatedQueue: QueuedImage[] = [];
        for (const item of parsedQueue) {
          const success = await uploadImage(item);
          if (!success && item.attempts < 5) {
            updatedQueue.push({ ...item, attempts: item.attempts + 1 });
          }
        }
        await AsyncStorage.setItem('uploadQueue', JSON.stringify(updatedQueue));
        setQueueCount(updatedQueue.length);
        setUploading(false);
      }
    } catch (error) {
      console.log(error);
      setUploading(false);
    }
  };

  const uploadImage = async (imageData: QueuedImage): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageData.uri,
        type: 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
      } as any);
      formData.append('latitude', imageData.latitude.toString());
      formData.append('longitude', imageData.longitude.toString());
      formData.append('timestamp', imageData.timestamp);
      // Replace with your Nest.js backend URL
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.ok) {
        console.log('Upload failed:', await response.text());
        return false;
      }
      const result = await response.json();
      console.log('Upload result:', result);
      return true;
    } catch (error) {
      console.log('Upload error:', error);
      return false;
    }
  };

  return (
    <View style={styles.container}>
      <UploadStatusHeader uploading={uploading} queueCount={queueCount} />
      <View style={styles.preview}>
        <Text>Camera preview goes here</Text>
      </View>
      <Button title="Take Picture" onPress={() => navigation.navigate('Camera')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  preview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 16,
  },
});

export default HomeScreen;
