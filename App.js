import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NativeBaseProvider } from 'native-base';
import { StatusBar } from 'expo-status-bar';

import Home from './screens/Home';
import Search from './screens/Search';
import Profile from './screens/Profile';
import FollowingInsight from './screens/modules/FollowingInsight';
import FooterBar from './screens/modules/FooterBar';
import PostChit from './screens/modules/PostChit';
import Login from './screens/Login';
import Signup from './screens/Signup';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}  // Hide the default white header
    >
      <Stack.Screen name="ProfileScreen" component={Profile} />
      <Stack.Screen name="FollowingInsight" component={FollowingInsight} />
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NativeBaseProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Tab.Navigator
            tabBar={(props) => <FooterBar {...props} />}
            screenOptions={{ headerShown: false }}
          >
            <Tab.Screen name="Home" component={Home} />
            <Tab.Screen name="Search" component={Search} />

            {/* Label is "Profile", but it uses the stack that contains Profile screens */}
            <Tab.Screen name="Profile" component={ProfileStack} />

            {/* Hidden routes for login, signup, etc. */}
            <Tab.Screen
              name="Login"
              component={Login}
              options={{ tabBarButton: () => null }}
            />
            <Tab.Screen
              name="Signup"
              component={Signup}
              options={{ tabBarButton: () => null }}
            />
            <Tab.Screen
              name="PostChit"
              component={PostChit}
              options={{ tabBarButton: () => null }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </NativeBaseProvider>
    </GestureHandlerRootView>
  );
};

export default App;
