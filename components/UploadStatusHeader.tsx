import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/UploadStatusHeaderStyles';

interface UploadStatusHeaderProps {
  uploadedCount: number;   // Number of images successfully uploaded
  totalCaptured: number;   // Total images captured (whether uploaded or pending)
}

const UploadStatusHeader: React.FC<UploadStatusHeaderProps> = ({
  uploadedCount,
  totalCaptured,
}) => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#fff';
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const insets = useSafeAreaInsets();

  // If not all captured images are uploaded, then we’re still waiting for uploads.
  const leftText = uploadedCount < totalCaptured ? 'Uploading...' : 'Not Uploading';
  const rightText = `${uploadedCount}/${totalCaptured} images`;

  return (
    <View style={[{ backgroundColor, paddingTop: insets.top }, styles.headerContainer]}>
      <View style={styles.header}>
        <Text style={[styles.text, { color: textColor }]}>{leftText}</Text>
        <Text style={[styles.text, { color: textColor }]}>{rightText}</Text>
      </View>
    </View>
  );
};

export default UploadStatusHeader;
