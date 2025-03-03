import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
// Import Ionicons
import { Ionicons } from '@expo/vector-icons';

interface CameraScreenProps {
  onCapture: (photo: { uri: string; base64: string }) => void;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ onCapture }) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraViewRef = useRef<React.ElementRef<typeof CameraView>>(null);

  // Capture an image
  const handleCapture = async () => {
    if (!cameraViewRef.current) return;
    try {
      setLoading(true);
      const photo = await cameraViewRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      if (photo.base64 && photo.base64.length > 5 * 1024 * 1024) {
        Alert.alert('Error', 'Image exceeds 5MB');
        return;
      }
      onCapture(photo);
    } catch (error) {
      console.log('Capture error:', error);
      Alert.alert('Error', 'An error occurred while capturing the image.');
    } finally {
      setLoading(false);
    }
  };

  // If camera permission is not granted, show a prompt
  if (!cameraPermission || !cameraPermission.granted) {
    return (
      <View style={styles.center}>
        <Text>We need your permission to use the camera.</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <CameraView ref={cameraViewRef} style={styles.camera}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </CameraView>

      {/* Capture Button */}
      <View style={styles.captureButtonContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <Ionicons name="camera" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  camera: { 
    flex: 1 
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonContainer: {
    position: 'absolute',
    bottom: 32,
    right: 32,          // Put it on the right side
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#8C1E2F',  // Maroon-ish color
    justifyContent: 'center',
    alignItems: 'center',
    // Optional border to mimic a ring
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.7)',
  },
});
