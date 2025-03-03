// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import PermissionHandler from './components/PermissionHandler';
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <PermissionHandler>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PermissionHandler>
  );
};

export default App;
