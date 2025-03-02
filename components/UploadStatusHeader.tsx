// components/UploadStatusHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UploadStatusHeaderProps {
  uploading: boolean;
  queueCount: number;
}

const UploadStatusHeader: React.FC<UploadStatusHeaderProps> = ({ uploading, queueCount }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.text}>{uploading ? 'Uploading...' : 'Not Uploading'}</Text>
      <Text style={styles.text}>Queue: {queueCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 10,
    backgroundColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  text: { fontSize: 16 },
});

export default UploadStatusHeader;
