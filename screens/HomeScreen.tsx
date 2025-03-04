import React, { useState, useEffect } from 'react';
import { View, Alert, AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/HomeScreenStyles';
import UploadStatusHeader from '../components/UploadStatusHeader';
import CameraScreen from './CameraScreen';
import { CameraCapturedPicture } from 'expo-camera';

interface QueuedImage {
  uri: string;
  base64: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  attempts: number;
}

const MAX_ATTEMPTS = 5;

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  // Explicitly type the number state variables
  const [photosCaptured, setPhotosCaptured] = useState<number>(0);
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [queue, setQueue] = useState<QueuedImage[]>([]);

  useEffect(() => {
    loadQueue().then(() => {
      checkAndProcessQueue();
    });
    
    const netSubscription = Network.addNetworkStateListener((state) => {
      console.log('Network state changed:', state);
      if (state.isConnected) {
        checkAndProcessQueue();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App has come to foreground');
        checkAndProcessQueue();
      }
    });

    return () => {
      netSubscription && netSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const loadQueue = async (): Promise<QueuedImage[]> => {
    try {
      const queueString = await AsyncStorage.getItem('uploadQueue');
      const parsedQueue: QueuedImage[] = queueString ? JSON.parse(queueString) : [];
      setQueue(parsedQueue);
      return parsedQueue;
    } catch (error) {
      console.log('Queue load error:', error);
      return [];
    }
  };

  const updateQueueStorage = async (newQueue: QueuedImage[]) => {
    try {
      await AsyncStorage.setItem('uploadQueue', JSON.stringify(newQueue));
      setQueue(newQueue);
      console.log('Queue updated. New length:', newQueue.length);
    } catch (error) {
      console.log('Queue update error:', error);
    }
  };

  const saveToQueue = async (imageData: QueuedImage) => {
    try {
      const queueString = await AsyncStorage.getItem('uploadQueue');
      const parsedQueue: QueuedImage[] = queueString ? JSON.parse(queueString) : [];
      imageData.attempts = 0; // Reset attempts for new image
      parsedQueue.push(imageData);
      await AsyncStorage.setItem('uploadQueue', JSON.stringify(parsedQueue));
      setQueue(parsedQueue);
      console.log('Image queued. Queue length:', parsedQueue.length);
    } catch (error) {
      console.log('Queue save error:', error);
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

      const response = await fetch('http://192.168.0.30:3000/upload', {
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

  const attemptUpload = async (imageData: QueuedImage, maxAttempts: number): Promise<{ success: boolean; attempts: number }> => {
    let attempts = 0;
    let success = false;
    while (attempts < maxAttempts && !success) {
      success = await uploadImage(imageData);
      attempts++;
    }
    return { success, attempts };
  };

  const processQueue = async () => {
    const currentQueue = await loadQueue();
    if (currentQueue.length === 0) {
      setUploading(false);
      return;
    }
    
    setUploading(true);
    let newUploadedCount = uploadedCount;
    const remainingQueue: QueuedImage[] = [];

    for (const item of currentQueue) {
      const { success } = await attemptUpload(item, MAX_ATTEMPTS);
      // Reset attempts for the next processing run
      item.attempts = 0;
      if (success) {
        newUploadedCount++;
        console.log('Queued image uploaded successfully');
      } else {
        remainingQueue.push(item);
        console.log('Image remains queued after attempts');
      }
    }

    setUploadedCount(newUploadedCount);
    await updateQueueStorage(remainingQueue);
    setUploading(false);
  };

  const checkAndProcessQueue = async () => {
    const networkState = await Network.getNetworkStateAsync();
    console.log('checkAndProcessQueue. isConnected:', networkState.isConnected);
    const loadedQueue = await loadQueue();
    console.log('Queue length:', loadedQueue.length);
    if (networkState.isConnected && loadedQueue.length > 0) {
      processQueue();
    }
  };

  const handleCapture = async (photo: CameraCapturedPicture | undefined) => {
    try {
      // Increase total captured count
      setPhotosCaptured(prev => prev + 1);
      console.log('Photos captured:', photosCaptured + 1);

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        Alert.alert('Location Permission Required', 'Cannot proceed without location.');
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = locationResult.coords;

      if (!photo) {
        Alert.alert('Error', 'No photo was captured. Please try again.');
        return;
      }

      const imageData: QueuedImage = {
        uri: photo.uri,
        base64: photo.base64 || '',
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        attempts: 0,
      };

      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected) {
        setUploading(true);
        const { success } = await attemptUpload(imageData, MAX_ATTEMPTS);
        if (success) {
          setUploadedCount(prev => prev + 1);
          console.log('Immediate upload succeeded');
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      // If offline or immediate upload fails, queue the image.
      await saveToQueue(imageData);
      console.log('Image queued for later upload');
    } catch (error) {
      console.log('Capture error:', error);
      Alert.alert('Error', 'An error occurred while processing the image.');
    }
  };

  return (
    <View style={styles.container}>
      <UploadStatusHeader
        uploading={uploading}
        uploadedCount={uploadedCount}
        totalCaptured={photosCaptured}
      />
      <CameraScreen onCapture={handleCapture} />
    </View>
  );
};

export default HomeScreen;
