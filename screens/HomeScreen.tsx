// screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Alert, AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/HomeScreenStyles';
import UploadStatusHeader from '../components/UploadStatusHeader';
import CameraScreen from './CameraScreen';
import { CameraCapturedPicture } from 'expo-camera';
import { checkAndProcessQueue, saveToQueue, QueuedImage, MAX_ATTEMPTS } from '../helpers/queueProcessor';
import { registerBackgroundUploadTaskAsync } from '../helpers/backgroundUploadTask';

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [photosCaptured, setPhotosCaptured] = useState<number>(0);
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [queue, setQueue] = useState<QueuedImage[]>([]);

  useEffect(() => {
    registerBackgroundUploadTaskAsync()
      .then(() => console.log('Background upload task registered'))
      .catch((error) => console.log('Error registering background task', error));

    checkAndProcessQueue().then((successCount) => {
      setUploadedCount((prev) => prev + successCount);
      updateLocalQueueState();
    });

    const netSubscription = Network.addNetworkStateListener((state) => {
      console.log('Network state changed:', state);
      if (state.isConnected) {
        checkAndProcessQueue().then((successCount) => {
          setUploadedCount((prev) => prev + successCount);
          updateLocalQueueState();
        });
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App has come to foreground');
        checkAndProcessQueue().then((successCount) => {
          setUploadedCount((prev) => prev + successCount);
          updateLocalQueueState();
        });
      }
    });

    // Additional polling every 10 seconds
    const pollingInterval = setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      console.log('Polled network state:', state);
      await checkAndProcessQueue().then((successCount) => {
        setUploadedCount((prev) => prev + successCount);
        updateLocalQueueState();
      });
    }, 10000);

    return () => {
      netSubscription && netSubscription.remove();
      appStateSubscription.remove();
      clearInterval(pollingInterval);
    };
  }, []);

  const updateLocalQueueState = async () => {
    try {
      const queueString = await AsyncStorage.getItem('uploadQueue');
      const parsedQueue: QueuedImage[] = queueString ? JSON.parse(queueString) : [];
      setQueue(parsedQueue);
      console.log('Local queue state updated. Queue length:', parsedQueue.length);
    } catch (error) {
      console.log('Local queue update error:', error);
    }
  };

  const handleCapture = async (photo: CameraCapturedPicture | undefined) => {
    try {
      setPhotosCaptured((prev) => prev + 1);
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
        let success = false;
        // Attempt immediate upload with up to MAX_ATTEMPTS
        for (let i = 0; i < MAX_ATTEMPTS && !success; i++) {
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
            if (response.ok) {
              success = true;
              const result = await response.json();
              console.log('Immediate upload result:', result);
              break;
            } else {
              console.log('Immediate upload failed:', await response.text());
            }
          } catch (err) {
            console.log('Immediate upload error:', err);
          }
        }
        setUploading(false);
        if (success) {
          setUploadedCount((prev) => prev + 1);
          console.log('Immediate upload succeeded');
          return;
        }
      }
      // If offline or immediate upload fails, add image to queue.
      await saveToQueue(imageData);
      console.log('Image queued for later upload');
      updateLocalQueueState();
    } catch (error) {
      console.log('Capture error:', error);
      Alert.alert('Error', 'An error occurred while processing the image.');
    }
  };

  return (
    <View style={styles.container}>
      <UploadStatusHeader
        // uploading={uploading}
        uploadedCount={uploadedCount}
        totalCaptured={photosCaptured}
      />
      <CameraScreen onCapture={handleCapture} />
    </View>
  );
};

export default HomeScreen;
