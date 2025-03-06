import { StyleSheet } from 'react-native';

export default StyleSheet.create({
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
      right: 32,     
    },
    captureButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#8C1E2F',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: 'rgba(255,255,255,0.7)',
    },
  });