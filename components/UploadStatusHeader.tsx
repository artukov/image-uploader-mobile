import React from 'react';
import { View, Text, useColorScheme, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/UploadStatusHeaderStyles';

interface UploadStatusHeaderProps {
  uploading: boolean;       // Whether uploads are in progress or pending
  uploadedCount: number;    // Number of images successfully uploaded
  totalCaptured: number;    // Total images captured (whether uploaded or pending)
  queueLength?: number;     // Number of images in queue (optional)
}

const UploadStatusHeader: React.FC<UploadStatusHeaderProps> = ({
  uploading,
  uploadedCount,
  totalCaptured,
  queueLength = 0,
}) => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#fff';
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const insets = useSafeAreaInsets();

  let statusText = 'Ready';
  if (uploading) {
    if (queueLength > 0) {
      statusText = `Uploading ${queueLength} image${queueLength !== 1 ? 's' : ''}...`;
    } else {
      statusText = 'Uploading...';
    }
  } else if (totalCaptured > 0 && uploadedCount < totalCaptured) {
    statusText = 'Waiting for connection...';
  }
  
  const sanitizedUploaded = Math.min(uploadedCount, totalCaptured);
  const statsText = `${sanitizedUploaded}/${totalCaptured} images`;

  return (
    <View style={[{ backgroundColor, paddingTop: insets.top }, styles.headerContainer]}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          {uploading && <ActivityIndicator size="small" color={textColor} style={styles.spinner} />}
          <Text style={[styles.text, { color: textColor }]}>{statusText}</Text>
        </View>
        <Text style={[styles.text, { color: textColor }]}>{statsText}</Text>
      </View>
    </View>
  );
};

export default UploadStatusHeader;