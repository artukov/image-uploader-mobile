import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: { flex: 1 },
    debugContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
      },
      debugButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
      },
      debugButtonText: {
        color: 'white',
        fontSize: 12,
      },
  });
  