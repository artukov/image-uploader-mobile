import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 10,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between', // important for left/right alignment
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
  },
});
