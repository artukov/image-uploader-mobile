// screens/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { CameraCapturedPicture } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import styles from '../styles/HomeScreenStyles';
import UploadStatusHeader from '../components/UploadStatusHeader';
import CameraScreen from './CameraScreen';
import { 
  checkAndProcessQueue, 
  saveToQueue, 
  QueuedImage, 
  MAX_ATTEMPTS,
  getUploadStats,
  updateUploadStats,
  incrementCaptured,
  incrementUploaded,
  loadQueue,
  updateQueueStorage
} from '../helpers/queueProcessor';
import { 
  registerBackgroundUploadTaskAsync,
  isBackgroundTaskRegisteredAsync
} from '../helpers/backgroundUploadTask';

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [photosCaptured, setPhotosCaptured] = useState<number>(0);
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
  const [queueLength, setQueueLength] = useState<number>(0);

  // Function to update upload counts from AsyncStorage
  const updateCountsFromStorage = useCallback(async () => {
    try {
      const stats = await getUploadStats();
      setPhotosCaptured(stats.totalCaptured);
      setUploadedCount(stats.totalUploaded);
      
      // Update queue status
      const queue = await loadQueue();
      const pendingUploads = queue.filter(item => !item.uploaded).length;
      setQueueLength(pendingUploads);
      
      console.log('Counts updated from storage:', stats);
      console.log('Pending uploads in queue:', pendingUploads);
    } catch (error) {
      console.log('Error updating counts from storage:', error);
    }
  }, []);

  // Set up background processes and event listeners
  useEffect(() => {
    // Check if background task is registered, and register if not
    isBackgroundTaskRegisteredAsync().then((isRegistered) => {
      if (!isRegistered) {
        registerBackgroundUploadTaskAsync()
          .then(() => console.log('Background upload task registered'))
          .catch((error) => console.log('Error registering background task', error));
      } else {
        console.log('Background upload task already registered');
      }
    });

    // Initial counts load and reset if needed
    updateCountsFromStorage().then(() => {
      // Force a re-sync of counts if the numbers don't make sense
      if (uploadedCount > photosCaptured) {
        console.log('Detected inconsistent counts, resetting stats');
        // Reset stats to sensible values
        const fixedStats = { 
          totalCaptured: Math.max(photosCaptured, uploadedCount),
          totalUploaded: uploadedCount
        };
        updateUploadStats(fixedStats).then(() => updateCountsFromStorage());
      }
    });
    
    // Process queue on startup
    setIsProcessingQueue(true);
    checkAndProcessQueue().then(() => {
      updateCountsFromStorage();
      setIsProcessingQueue(false);
    });

    // Network state change listener
    const netSubscription = Network.addNetworkStateListener(async (state) => {
      console.log('Network state changed:', state);
      if (state.isConnected && queueLength > 0) {
        setIsProcessingQueue(true);
        await checkAndProcessQueue();
        setIsProcessingQueue(false);
        updateCountsFromStorage();
      }
    });

    // App state change listener (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App has come to foreground');
        updateCountsFromStorage();
        
        if (queueLength > 0) {
          setIsProcessingQueue(true);
          await checkAndProcessQueue();
          setIsProcessingQueue(false);
          updateCountsFromStorage();
        }
      }
    });

    // Additional polling every 15 seconds if there are pending uploads
    const pollingInterval = setInterval(async () => {
      const queue = await loadQueue();
      const pendingUploads = queue.filter(item => !item.uploaded).length;
      
      if (pendingUploads > 0) {
        const state = await Network.getNetworkStateAsync();
        console.log('Polled network state:', state);
        
        if (state.isConnected) {
          setIsProcessingQueue(true);
          await checkAndProcessQueue();
          setIsProcessingQueue(false);
          updateCountsFromStorage();
        }
      }
    }, 15000);

    // Cleanup when component unmounts
    return () => {
      netSubscription && netSubscription.remove();
      appStateSubscription.remove();
      clearInterval(pollingInterval);
    };
  }, [updateCountsFromStorage, queueLength, photosCaptured, uploadedCount]);
  
  // Update counts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      updateCountsFromStorage();
      return () => {}; // cleanup function
    }, [updateCountsFromStorage])
  );

  const handleCapture = async (photo: CameraCapturedPicture | undefined) => {
    try {
      // Set uploading state immediately when capture starts
      setUploading(true);
      
      // Increment captured count
      const newStats = await incrementCaptured();
      setPhotosCaptured(newStats.totalCaptured);
      
      console.log('Photos captured:', newStats.totalCaptured);

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
      
      // Create image data (without the ID, which will be added by saveToQueue)
      const imageData: Omit<QueuedImage, 'id'> = {
        uri: photo.uri,
        base64: photo.base64 || '',
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        attempts: 0,
        uploaded: false,
      };

      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected) {
        setUploading(true);
        let success = false;
        
        // First save to queue to generate a unique ID
        await saveToQueue(imageData);
        
        // Get the queue to find our newly added item
        const queue = await loadQueue();
        const newItem = queue[queue.length - 1]; // Last item should be our newly added image
        
        // Attempt immediate upload with up to MAX_ATTEMPTS
        for (let i = 0; i < MAX_ATTEMPTS && !success; i++) {
          try {
            const formData = new FormData();
            formData.append('image', {
              uri: newItem.uri,
              type: 'image/jpeg',
              name: `photo_${Date.now()}.jpg`,
            } as any);
            formData.append('latitude', newItem.latitude.toString());
            formData.append('longitude', newItem.longitude.toString());
            formData.append('timestamp', newItem.timestamp);
            formData.append('id', newItem.id); // Add the unique ID for duplicate detection
            
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
        
        if (success) {
          // Update the queue item as uploaded
          const updatedQueue = await loadQueue();
          const itemIndex = updatedQueue.findIndex(item => item.id === newItem.id);
          
          if (itemIndex >= 0) {
            updatedQueue[itemIndex].uploaded = true;
            await updateQueueStorage(updatedQueue);
          }
          
          // Update uploaded count
          const updatedStats = await incrementUploaded();
          setUploadedCount(updatedStats.totalUploaded);
          console.log('Immediate upload succeeded');
        }
      } else {
        // If offline, we've already added the image to the queue
        console.log('No network connection, image queued for later upload');
      }
      
      // Update queue length
      const queue = await loadQueue();
      const pendingUploads = queue.filter(item => !item.uploaded).length;
      setQueueLength(pendingUploads);
    } catch (error) {
      console.log('Capture error:', error);
      Alert.alert('Error', 'An error occurred while processing the image.');
    } finally {
      // Make sure uploading is set to false when we're done
      setUploading(false);
    }
  };

  // Calculate if we should show "uploading"
  const isCurrentlyUploading = uploading || isProcessingQueue || (photosCaptured > uploadedCount);

  return (
    <View style={styles.container}>
      <UploadStatusHeader
        uploading={isCurrentlyUploading}
        uploadedCount={uploadedCount}
        totalCaptured={photosCaptured}
        queueLength={queueLength}
      />
      <CameraScreen onCapture={handleCapture} />
    </View>
  );
};

export default HomeScreen;