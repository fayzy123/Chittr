import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Header = ({ title }) => {
  const navigation = useNavigation();
  const route = useRoute(); // Get the current route

  // Track login state and user ID in this component
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);

  // useFocusEffect to track login state
  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          const storedUserId = await AsyncStorage.getItem('user_id');
          setIsLoggedIn(!!token);
          setUserId(storedUserId);
        } catch (error) {
          console.error('header.js: error reading token/user_id:', error);
        }
      };
      checkAuth();
    }, [])
  );

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user_id');

      // Immediately read them back to confirm removal
      const testToken = await AsyncStorage.getItem('token');
      console.log('Token after sign out:', testToken); // should be null

      // Log the userId for debugging
      console.log(`User ${userId} has successfully signed out.`);

      setIsLoggedIn(false);
      setUserId(null);

      alert('You have successfully signed out!');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle navigation to PostChit screen
  const handlePostChit = () => {
    navigation.navigate('PostChit');
  };

  return (
    <View style={styles.header}>
      {/* Title aligned to the left now */}
      <Text style={styles.headerText}>{title}</Text>

      {/* Right-hand side buttons */}
      <View style={styles.rightButtons}>
        {isLoggedIn ? (
          // Show "Post Chit" and "Sign Out" if user is logged in
          <>
            {route.name !== 'PostChit' && (
              // Only show "Post Chit" if we're not already on the PostChit screen
              <TouchableOpacity style={styles.btn} onPress={handlePostChit}>
                <Text style={styles.btnText}>Post Chit</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, { marginLeft: 10 }]}
              onPress={handleSignOut}
            >
              <Text style={styles.btnText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Otherwise show Log In and Sign Up
          <>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.btnText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { marginLeft: 10 }]}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.btnText}>Sign Up</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'space-between', // Title on the left, buttons on the right
    paddingHorizontal: 15,          // Add some horizontal padding
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,  // This is the default anyway
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnText: {
    color: '#2ecc71',
    fontWeight: 'bold',
  },
});
