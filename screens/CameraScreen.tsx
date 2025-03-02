// screens/CameraScreen.tsx
import React, { useRef, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedImage {
  uri: string;
  base64: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  attempts: number;
}

export default function CameraScreen({ navigation }: { navigation: any }) {
  // Camera facing state: 'back' or 'front'
  const [facing, setFacing] = useState<CameraType>('back');

  // Camera permissions (expo-camera)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Keep track of loading states
  const [loading, setLoading] = useState(false);

  // Ref to the CameraView component
  const cameraViewRef = useRef<React.ElementRef<typeof CameraView>>(null);

  // 1. If camera permission is still loading, show a spinner or message
  if (!cameraPermission) {
    return (
      <View style={styles.center}>
        <Text>Loading camera permissions...</Text>
      </View>
    );
  }

  // 2. If camera permission is denied, show a prompt to request it
  if (!cameraPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>
          We need your permission to use the camera
        </Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={requestCameraPermission}
        >
          <Text style={styles.text}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Flip the camera facing
  function flipCamera() {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }

  // Capture an image, get location, and handle offline/online logic
  async function handleCapture() {
    if (!cameraViewRef.current) return;

    try {
      setLoading(true);

      // 1. Capture the photo
      //    This code assumes `CameraView` has a `takePictureAsync` method
      //    similar to <Camera>. If it’s different, adjust accordingly.
      const photo = await cameraViewRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      // Optional approximate size check
      if (photo.base64 && photo.base64.length > 5 * 1024 * 1024) {
        Alert.alert('Error', 'Image exceeds 5MB');
        setLoading(false);
        return;
      }

      // 2. Request location permission if needed
      //    If you want to do this once, do it at app startup. 
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        Alert.alert('Location Permission Required', 'Cannot proceed without location.');
        setLoading(false);
        return;
      }

      // 3. Get current location
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000,
      });
      const { latitude, longitude } = locationResult.coords;

      // 4. Build image data
      const imageData: QueuedImage = {
        uri: photo.uri,
        base64: photo.base64 || '',
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        attempts: 0,
      };

      // 5. Check network connectivity
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected) {
        const success = await uploadImage(imageData);
        if (!success) {
          await saveToQueue(imageData);
        }
      } else {
        await saveToQueue(imageData);
      }

      // Done, navigate back or do something else
      navigation.goBack();
    } catch (error) {
      console.log('Capture error:', error);
      Alert.alert('Error', 'An error occurred while capturing the image.');
    } finally {
      setLoading(false);
    }
  }

  // Upload image to Nest.js backend
  async function uploadImage(imageData: QueuedImage): Promise<boolean> {
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

      // Replace localhost if on a physical device
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
  }

  // Save image offline if upload fails or offline
  async function saveToQueue(imageData: QueuedImage) {
    try {
      const queueString = await AsyncStorage.getItem('uploadQueue');
      const parsedQueue: QueuedImage[] = queueString ? JSON.parse(queueString) : [];
      parsedQueue.push(imageData);
      await AsyncStorage.setItem('uploadQueue', JSON.stringify(parsedQueue));
    } catch (error) {
      console.log('Queue save error:', error);
    }
  }

  return (
    <View style={styles.container}>
      {/* 
        Use the <CameraView> from your snippet, 
        passing the 'facing' prop for front/back camera.
      */}
      <CameraView
        ref={cameraViewRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Show a loading indicator if capturing */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </CameraView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={flipCamera}>
          <Text style={styles.buttonText}>Flip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleCapture}>
          <Text style={styles.buttonText}>Capture</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  center: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
