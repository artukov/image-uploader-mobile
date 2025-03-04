// UploadStatusHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/UploadStatusHeaderStyles'

interface UploadStatusHeaderProps {
  uploading: boolean;
  uploadedCount: number;
  totalCount: number;
}

const UploadStatusHeader: React.FC<UploadStatusHeaderProps> = ({
  uploading,
  uploadedCount,
  totalCount,
}) => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#fff';
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';

  // Get the safe area insets
  const insets = useSafeAreaInsets();

  return (
    <View style={[{ backgroundColor, paddingTop: insets.top }, styles.headerContainer]}>
      <View style={styles.header}>
        <Text style={[styles.text, { color: textColor }]}>
          {uploading ? 'Uploading...' : 'Not Uploading'}
        </Text>
        <Text style={[styles.text, { color: textColor }]}>
          {uploadedCount}/{totalCount} images
        </Text>
      </View>
    </View>
  );
};

export default UploadStatusHeader;
