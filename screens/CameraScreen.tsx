import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import styles from '../styles/CameraScreenStyles'
import { Ionicons } from '@expo/vector-icons';

interface CameraScreenProps {
  onCapture: (photo: CameraCapturedPicture | undefined) => void;
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

      if (photo?.base64 && photo.base64.length > 5 * 1024 * 1024) {
        Alert.alert('Error', 'Image exceeds 5MB');
        return;
      }
      photo && onCapture(photo);
      
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
