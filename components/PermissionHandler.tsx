import React, { useEffect, useState } from 'react';
import { Alert, Linking, View, Text, StyleSheet } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { useForegroundPermissions } from 'expo-location';
import type { ReactNode } from 'react';

interface PermissionHandlerProps {
  children: ReactNode;
}

const PermissionHandler: React.FC<PermissionHandlerProps> = ({ children }) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = useForegroundPermissions();
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  useEffect(() => {
    (async () => {
      // Request camera permission if not determined
      if (!cameraPermission || cameraPermission.status === 'undetermined') {
        await requestCameraPermission();
      }
      // Request location permission if not determined
      if (!locationPermission || locationPermission.status === 'undetermined') {
        await requestLocationPermission();
      }
      setIsCheckingPermissions(false);
    })();
  }, [cameraPermission, locationPermission]);

  // While permissions are still being checked, wait without showing alert.
  if (isCheckingPermissions) {
    return (
      <View style={styles.center}>
        <Text>Checking permissions...</Text>
      </View>
    );
  }

  // If permissions are defined but not granted, show an alert.
  if (
    cameraPermission?.status !== 'granted' ||
    locationPermission?.status !== 'granted'
  ) {
    Alert.alert(
      'Permissions Required',
      'Camera and Location permissions are required. Please enable them in Settings.',
      [
        {
          text: 'Open Settings',
          onPress: () =>
            Linking.openSettings().catch(() => console.warn('Cannot open settings')),
        },
      ],
      { cancelable: false }
    );
    return (
      <View style={styles.center}>
        <Text>Permissions not granted.</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PermissionHandler;