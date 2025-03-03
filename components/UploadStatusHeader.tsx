// UploadStatusHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const styles = StyleSheet.create({
  headerContainer: {
    // This container adds padding on the top equal to the safe area inset,
    // ensuring the content is below the notch.
    paddingHorizontal: 10,
  },
  header: {
    height: 44, // typical height for a header bar
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
  },
});
