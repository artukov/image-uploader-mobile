import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/UploadStatusHeaderStyles';

interface UploadStatusHeaderProps {
  uploading: boolean;
  uploadedCount: number;
  totalCaptured: number;
}

const UploadStatusHeader: React.FC<UploadStatusHeaderProps> = ({
  uploading,
  uploadedCount,
  totalCaptured,
}) => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#fff';
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const insets = useSafeAreaInsets();

  const leftText = uploading ? 'Uploading...' : 'Not Uploading';
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
