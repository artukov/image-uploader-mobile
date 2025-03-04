import { StyleSheet } from 'react-native';

export default StyleSheet.create({
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