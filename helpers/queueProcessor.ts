// helpers/queueProcessor.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

export interface QueuedImage {
  uri: string;
  base64: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  attempts: number;
}

export const MAX_ATTEMPTS = 5;

export const loadQueue = async (): Promise<QueuedImage[]> => {
  try {
    const queueString = await AsyncStorage.getItem('uploadQueue');
    return queueString ? JSON.parse(queueString) : [];
  } catch (error) {
    console.log('Queue load error:', error);
    return [];
  }
};

export const updateQueueStorage = async (newQueue: QueuedImage[]): Promise<void> => {
  try {
    await AsyncStorage.setItem('uploadQueue', JSON.stringify(newQueue));
  } catch (error) {
    console.log('Queue update error:', error);
  }
};

export const saveToQueue = async (imageData: QueuedImage): Promise<void> => {
  try {
    const queue = await loadQueue();
    // Reset attempts for a fresh processing run
    imageData.attempts = 0;
    queue.push(imageData);
    await AsyncStorage.setItem('uploadQueue', JSON.stringify(queue));
    console.log('Image queued. New queue:', queue);
  } catch (error) {
    console.log('Queue save error:', error);
  }
};

export const uploadImage = async (imageData: QueuedImage): Promise<boolean> => {
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

    // Use your correct backend URL
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

// Attempt to upload an image up to maxAttempts times in this processing run.
export const attemptUpload = async (
  imageData: QueuedImage,
  maxAttempts: number
): Promise<{ success: boolean; attempts: number }> => {
  let attempts = 0;
  let success = false;
  while (attempts < maxAttempts && !success) {
    success = await uploadImage(imageData);
    attempts++;
  }
  return { success, attempts };
};

// Process the entire queue, retrying each image up to MAX_ATTEMPTS.
// Returns the number of images that uploaded successfully in this run.
export const processQueue = async (): Promise<number> => {
  const currentQueue = await loadQueue();
  if (currentQueue.length === 0) return 0;

  let successCount = 0;
  const remainingQueue: QueuedImage[] = [];
  for (const item of currentQueue) {
    const { success, attempts } = await attemptUpload(item, MAX_ATTEMPTS);
    // Reset attempts for the next processing run.
    item.attempts = 0;
    if (success) {
      successCount++;
      console.log('Queued image uploaded successfully:', item.uri);
    } else {
      remainingQueue.push(item);
      console.log('Image remains queued after', attempts, 'attempts:', item.uri);
    }
  }
  await updateQueueStorage(remainingQueue);
  return successCount;
};

// Check connectivity and process the queue. Returns number of successful uploads.
export const checkAndProcessQueue = async (): Promise<number> => {
  const networkState = await Network.getNetworkStateAsync();
  const currentQueue = await loadQueue();
  console.log('checkAndProcessQueue fired. isConnected:', networkState.isConnected, 'Queue length:', currentQueue.length);
  if (networkState.isConnected && currentQueue.length > 0) {
    const successCount = await processQueue();
    return successCount;
  }
  return 0;
};
