// helpers/backgroundUploadTask.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { checkAndProcessQueue } from './queueProcessor';

const BACKGROUND_UPLOAD_TASK = 'background-upload-task';

TaskManager.defineTask(BACKGROUND_UPLOAD_TASK, async () => {
  try {
    console.log('Background upload task running');
    await checkAndProcessQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.log('Background upload task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundUploadTaskAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_UPLOAD_TASK, {
    minimumInterval: 60, // seconds; adjust as needed
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
