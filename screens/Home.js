import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  View,
  RefreshControl,
} from 'react-native';
import { NativeBaseProvider, Box } from 'native-base';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useFocusEffect } from '@react-navigation/native'; // <-- ADDED useRoute & useFocusEffect

import HeaderBar from './modules/HeaderBar';
import NavBar from './modules/NavBar';
import ChitCard from './modules/ChitCard';
import URL from './asset/URL';

const Home = ({ navigation }) => {
  // List of chits to display (global or followed)
  const [chits, setChits] = useState([]);

  // Whether we are currently fetching data (for the initial load)
  const [loading, setLoading] = useState(true);

  // Whether the user is logged in (token present)
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  // The user’s ID (for calling /api/user/:user_id/feed)
  const [userId, setUserId] = useState(null);

  // State for pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // We’ll read route params here
  const route = useRoute();

  /**
   * 1. On component mount, check AsyncStorage for 'token' and 'user_id'.
   *    - If token is found, user is considered logged in.
   *    - If not, user is logged out (will see global feed).
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const tokenVal = await AsyncStorage.getItem('token');
        const userIdVal = await AsyncStorage.getItem('user_id');
        setIsLoggedIn(!!tokenVal);  // true if tokenVal is not null
        setUserId(userIdVal);
      } catch (error) {
        console.error('Home.js: Error reading token/user_id:', error);
      }
    };
    checkAuth();
  }, []);

  /**
   * 2. Function to fetch chits from either:
   *    - /api/chits (if not logged in)
   *    - /api/user/:user_id/feed (if logged in)
   */
  const fetchChitsOrFeed = async () => {
    setLoading(true);
    try {
      if (!isLoggedIn) {
        // Not logged in => fetch global chits
        const response = await axios.get(`${URL}/api/chits`);
        setChits(response.data.chits || []);
      } else {
        // Logged in => fetch user’s feed
        const tokenVal = await AsyncStorage.getItem('token');
        const response = await axios.get(`${URL}/api/user/${userId}/feed`, {
          headers: { 'X-Authorization': tokenVal },
        });
        // If your server returns { feed: [...] }, do:
        setChits(response.data.feed || []);
      }
    } catch (error) {
      console.error('Home.js: Error fetching feed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2.1 - useFocusEffect so that whenever Home screen is focused,
  //   we re-fetch the chits => newly deleted chits won't show up.
  useFocusEffect(
    useCallback(() => {
      fetchChitsOrFeed();
      // No dependencies => run on every focus
    }, [])
  );

  /**
   * 3. Pull-to-refresh handler.
   *    - Called when user swipes down on the FlatList.
   *    - We set refreshing to true, fetch the feed, then set refreshing to false.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChitsOrFeed();
    setRefreshing(false);
  };

  /**
   * 4. Once we know isLoggedIn (it’s no longer null),
   *    we fetch the feed for the correct user or global feed.
   */
  useEffect(() => {
    if (isLoggedIn !== null) {
      fetchChitsOrFeed();
    }
  }, [isLoggedIn]);

  /**
   * 5. If the user navigates back from PostChit with refreshOnPost=true,
   *    we fetch chits automatically so user sees the newly posted chit.
   */
  useEffect(() => {
    if (route.params?.refreshOnPost) {
      // Refresh the feed
      fetchChitsOrFeed();
      // Optionally reset the param so it doesn't keep re-firing
      navigation.setParams({ refreshOnPost: false });
    }
  }, [route.params?.refreshOnPost]);

  /**
   * 6. Optional: useFocusEffect to also refresh if you want
   *    every time the screen is focused.
   */
  useFocusEffect(
    useCallback(() => {
      // If you prefer, also re-fetch on focus:
      // fetchChitsOrFeed();
    }, [])
  );

  /**
   * 7. If we’re still loading the initial data, show a spinner.
   */
  if (loading) {
    return (
      <NativeBaseProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </SafeAreaView>
      </NativeBaseProvider>
    );
  }

  /**
   * 8. Render the Home screen once data is loaded.
   *    - NavBar at the top, then HeaderBar (handles sign-out if logged in).
   *    - A FlatList with a RefreshControl to let users pull-to-refresh.
   */
  return (
    <NativeBaseProvider>
      <NavBar />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        {/* Our custom header that shows "Sign Out" or "Log In / Sign Up" */}
        <HeaderBar title="Chittr" />

        <Box style={styles.container}>
          <FlatList
            data={chits}
            keyExtractor={(item) => item.chit_id}
            renderItem={({ item }) => <ChitCard chit={item} />}
            // Pull-to-refresh logic
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2ecc71']} // The loading spinner color on Android
              />
            }
          />
        </Box>
      </SafeAreaView>
    </NativeBaseProvider>
  );
};

const styles = StyleSheet.create({
  // The SafeArea background (green behind the notch)
  safeArea: {
    flex: 1,
    backgroundColor: '#2ecc71',
    paddingTop: 8,
  },
  // The main content area (white background for the feed)
  container: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: '#f4f9f4',
  },
  // Style for the loading spinner view
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Home;
