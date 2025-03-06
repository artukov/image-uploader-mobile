import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

export interface QueuedImage {
  uri: string;
  base64: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  attempts: number;
  uploaded: boolean;
  id: string; // Unique ID for duplicate detection
}

export const MAX_ATTEMPTS = 5;
export const UPLOAD_QUEUE_KEY = 'uploadQueue';
export const UPLOAD_STATS_KEY = 'uploadStats';

// Stats to maintain accurate counts across app sessions
export interface UploadStats {
  totalCaptured: number;
  totalUploaded: number;
}

export const getUploadStats = async (): Promise<UploadStats> => {
  try {
    const statsString = await AsyncStorage.getItem(UPLOAD_STATS_KEY);
    if (!statsString) {
      // Initialize with zeros if no stats exist
      const initialStats = { totalCaptured: 0, totalUploaded: 0 };
      await AsyncStorage.setItem(UPLOAD_STATS_KEY, JSON.stringify(initialStats));
      return initialStats;
    }
    return JSON.parse(statsString);
  } catch (error) {
    console.log('Stats load error:', error);
    return { totalCaptured: 0, totalUploaded: 0 };
  }
};

export const updateUploadStats = async (
  stats: Partial<UploadStats>
): Promise<UploadStats> => {
  try {
    const currentStats = await getUploadStats();
    const newStats = {
      totalCaptured: stats.totalCaptured !== undefined 
        ? stats.totalCaptured 
        : currentStats.totalCaptured,
      totalUploaded: stats.totalUploaded !== undefined 
        ? stats.totalUploaded 
        : currentStats.totalUploaded,
    };
    
    await AsyncStorage.setItem(UPLOAD_STATS_KEY, JSON.stringify(newStats));
    return newStats;
  } catch (error) {
    console.log('Stats update error:', error);
    return await getUploadStats();
  }
};

export const incrementCaptured = async (): Promise<UploadStats> => {
  const stats = await getUploadStats();
  return updateUploadStats({ totalCaptured: stats.totalCaptured + 1 });
};

export const incrementUploaded = async (): Promise<UploadStats> => {
  const stats = await getUploadStats();
  return updateUploadStats({ totalUploaded: stats.totalUploaded + 1 });
};

export const loadQueue = async (): Promise<QueuedImage[]> => {
  try {
    const queueString = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    return queueString ? JSON.parse(queueString) : [];
  } catch (error) {
    console.log('Queue load error:', error);
    return [];
  }
};

export const updateQueueStorage = async (newQueue: QueuedImage[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(newQueue));
  } catch (error) {
    console.log('Queue update error:', error);
  }
};

export const saveToQueue = async (imageData: Omit<QueuedImage, 'id'>): Promise<QueuedImage> => {
  try {
    const queue = await loadQueue();
    
    // Generate a unique ID for this image
    const uniqueId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const newImageData: QueuedImage = {
      ...imageData,
      attempts: 0,
      uploaded: false,
      id: uniqueId
    };
    
    queue.push(newImageData);
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
    console.log('Image queued. New queue:', queue);
    
    return newImageData;
  } catch (error) {
    console.log('Queue save error:', error);
    throw error;
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
    formData.append('id', imageData.id); // Add the unique ID to detect duplicates
    formData.append('retryCount', imageData.attempts.toString()); // Add retry count for tracking
    
    console.log(`Attempting upload for image ${imageData.id}, attempt #${imageData.attempts + 1}`);

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
    
    // Check if this was a duplicate (already uploaded)
    if (result.duplicate) {
      console.log('Image was already uploaded (duplicate detected)');
    }
    
    // Even if it's a duplicate, we count it as a success
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
  
  // Reset attempts counter for this processing run
  const originalAttempts = imageData.attempts;
  imageData.attempts = 0;
  
  while (attempts < maxAttempts && !success) {
    imageData.attempts++; // Increment attempts for this run
    success = await uploadImage(imageData);
    attempts++;
  }
  
  // If failed, restore original attempts count plus what we just tried
  if (!success) {
    imageData.attempts = originalAttempts + attempts;
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
    // Skip already uploaded items
    if (item.uploaded) {
      remainingQueue.push(item);
      continue;
    }
    
    // For each queue processing run, we try up to MAX_ATTEMPTS times
    // regardless of how many times it was tried before
    const { success, attempts } = await attemptUpload(item, MAX_ATTEMPTS);
    
    if (success) {
      // Mark as uploaded but keep in queue for state tracking
      item.uploaded = true;
      remainingQueue.push(item);
      successCount++;
      console.log(`Queued image uploaded successfully: ${item.id} after ${attempts} attempts in this run`);
      
      // Update the stats to increment uploaded count
      await incrementUploaded();
    } else {
      // Keep in queue for future attempts - it will get another MAX_ATTEMPTS next time
      remainingQueue.push(item);
      console.log(`Image remains queued after ${attempts} attempts in this run: ${item.id}, total lifetime attempts: ${item.attempts}`);
    }
  }
  
  // Cleanup - remove uploaded images older than 1 hour to prevent queue growth
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const cleanedQueue = remainingQueue.filter(item => {
    if (item.uploaded) {
      const itemDate = new Date(item.timestamp);
      return itemDate > oneHourAgo;
    }
    return true;
  });
  
  await updateQueueStorage(cleanedQueue);
  return successCount;
};

// Check connectivity and process the queue. Returns number of successful uploads.
export const checkAndProcessQueue = async (): Promise<number> => {
  const networkState = await Network.getNetworkStateAsync();
  const currentQueue = await loadQueue();
  const pendingUploads = currentQueue.filter(item => !item.uploaded).length;
  
  console.log('checkAndProcessQueue fired. isConnected:', networkState.isConnected, 
    'Queue length:', currentQueue.length, 'Pending uploads:', pendingUploads);
    
  if (networkState.isConnected && pendingUploads > 0) {
    const successCount = await processQueue();
    return successCount;
  }
  return 0;
};