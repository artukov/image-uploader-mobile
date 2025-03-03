import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

import UploadStatusHeader from '../components/UploadStatusHeader';
import CameraScreen from './CameraScreen';

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
  const [uploadedCount, setUploadedCount] = useState(0);
  const [queue, setQueue] = useState<QueuedImage[]>([]);

  // Load the queue from AsyncStorage on mount
  useEffect(() => {
    loadQueue();
  }, []);

  // Helper to load queue from AsyncStorage
  const loadQueue = async () => {
    try {
      const queueString = await AsyncStorage.getItem('uploadQueue');
      const parsedQueue: QueuedImage[] = queueString ? JSON.parse(queueString) : [];
      setQueue(parsedQueue);
    } catch (error) {
      console.log('Queue load error:', error);
    }
  };

  // The total images = already uploaded + those still in queue
  const totalCount = uploadedCount + queue.length;

  // Called when user captures an image
  const handleCapture = async (photo: { uri: string; base64: string }) => {
    try {
      // 1. Ask for location permission
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        Alert.alert('Location Permission Required', 'Cannot proceed without location.');
        return;
      }

      // 2. Get current location
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000,
      });
      const { latitude, longitude } = locationResult.coords;

      // 3. Build the image data object
      const imageData: QueuedImage = {
        uri: photo.uri,
        base64: photo.base64 || '',
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        attempts: 0,
      };

      // 4. Check network connectivity
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected) {
        // Try uploading immediately
        setUploading(true);
        const success = await uploadImage(imageData);
        setUploading(false);

        if (success) {
          // If upload succeeded, increment the uploaded count
          setUploadedCount((prev) => prev + 1);
          return; // We’re done with this image
        }
      }

      // If not connected OR upload fails, save to queue
      await saveToQueue(imageData);
      // Reload queue to update the local state
      loadQueue();
    } catch (error) {
      console.log('Capture error:', error);
      Alert.alert('Error', 'An error occurred while capturing the image.');
    }
  };

  // Actually upload the image to your backend
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
    } catch (err) {
      console.log('Upload error:', err);
      return false;
    }
  };

  // Save the image to AsyncStorage queue
  const saveToQueue = async (imageData: QueuedImage) => {
    try {
      const queueString = await AsyncStorage.getItem('uploadQueue');
      const parsedQueue: QueuedImage[] = queueString ? JSON.parse(queueString) : [];
      parsedQueue.push(imageData);
      await AsyncStorage.setItem('uploadQueue', JSON.stringify(parsedQueue));
    } catch (error) {
      console.log('Queue save error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* 
        Header:
          - uploading? -> "Uploading..." or "Not Uploading"
          - uploadedCount/totalCount -> e.g. "10/12 images"
      */}
      <UploadStatusHeader
        uploading={uploading}
        uploadedCount={uploadedCount}
        totalCount={totalCount}
      />

      {/* Camera Screen for capturing images */}
      <CameraScreen onCapture={handleCapture} />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
