// helpers/backgroundUploadTask.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Network from 'expo-network';
import { checkAndProcessQueue } from './queueProcessor';

export const BACKGROUND_UPLOAD_TASK = 'background-upload-task';

TaskManager.defineTask(BACKGROUND_UPLOAD_TASK, async () => {
  try {
    console.log('Background upload task running');
    const networkState = await Network.getNetworkStateAsync();
    
    if (!networkState.isConnected) {
      console.log('No network connection, background task postponed');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    const uploadCount = await checkAndProcessQueue();
    
    if (uploadCount > 0) {
      console.log(`Background task uploaded ${uploadCount} images`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('Background task completed with no new uploads');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.log('Background upload task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundUploadTaskAsync() {
  // Unregister any existing task first to avoid duplicates
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_UPLOAD_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_UPLOAD_TASK);
    }
  } catch (error) {
    console.log('Error checking task registration:', error);
  }
  
  // Now register the task
  return BackgroundFetch.registerTaskAsync(BACKGROUND_UPLOAD_TASK, {
    minimumInterval: 15, // Run every 15 seconds if possible
    stopOnTerminate: false, // Keep running after app is terminated
    startOnBoot: true, // Run on device reboot
  });
}

// Function to check if the background task is registered
export async function isBackgroundTaskRegisteredAsync(): Promise<boolean> {
  return await TaskManager.isTaskRegisteredAsync(BACKGROUND_UPLOAD_TASK);
}