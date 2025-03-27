import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import NavBar from './NavBar';
import HeaderBar from './HeaderBar';
import URL from '../asset/URL';

const FollowingInsight = ({ route, navigation }) => {
  // The user_id we want to view followers/following for
  const { user_id } = route.params || {};

  // Arrays for followers and following
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user_id) {
          Alert.alert('Error', 'No user ID provided to FollowingInsight.');
          setLoading(false);
          return;
        }
        const token = await AsyncStorage.getItem('token');
        const headers = { 'X-Authorization': token };

        // Fetch followers
        const followersRes = await axios.get(`${URL}/api/user/${user_id}/followers`, { headers });
        // Fetch following
        const followingRes = await axios.get(`${URL}/api/user/${user_id}/following`, { headers });

        setFollowers(followersRes.data.followers || []);
        setFollowing(followingRes.data.following || []);
      } catch (error) {
        console.error('FollowingInsight: Error fetching data:', error);
        Alert.alert('Error', 'Failed to load followers/following. Check logs.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user_id]);

  // Navigate to tapped user’s profile
  const goToUserProfile = (theirUserId) => {
    navigation.navigate('Profile', {
      screen: 'ProfileScreen',
      params: { otherUserId: theirUserId },
    });
  };

  // Render a single user row
  const renderUserItem = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => goToUserProfile(item.user_id)}>
      <Text style={styles.userName}>
        {item.firstName} {item.lastName}
      </Text>
      <Text style={styles.userEmail}>{item.email}</Text>
    </TouchableOpacity>
  );

  // If loading, show a spinner
  if (loading) {
    return (
      <>
        {/* 1) Green top area with NavBar & HeaderBar */}
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <NavBar />
          <HeaderBar title="Followers / Following" />
        </SafeAreaView>

        {/* 2) White main area with spinner */}
        <View style={styles.mainContainer}>
          <ActivityIndicator size="large" color="#2ecc71" style={styles.spinner} />
        </View>
      </>
    );
  }

  return (
    <>
      {/* 1) Green top area with NavBar & HeaderBar */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <NavBar />
        <HeaderBar title="Followers / Following" />
      </SafeAreaView>

      {/* 2) White main area with the lists */}
      <View style={styles.mainContainer}>
        <Text style={styles.sectionTitle}>Followers</Text>
        {followers.length === 0 ? (
          <Text style={styles.emptyText}>No followers found.</Text>
        ) : (
          <FlatList
            data={followers}
            keyExtractor={(item) => item.user_id}
            renderItem={renderUserItem}
            style={styles.list}
          />
        )}

        <Text style={styles.sectionTitle}>Following</Text>
        {following.length === 0 ? (
          <Text style={styles.emptyText}>Not following anyone.</Text>
        ) : (
          <FlatList
            data={following}
            keyExtractor={(item) => item.user_id}
            renderItem={renderUserItem}
            style={styles.list}
          />
        )}
      </View>
    </>
  );
};

export default FollowingInsight;

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  safeAreaTop: {
    backgroundColor: '#2ecc71',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f4f9f4',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  spinner: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 10,
    marginTop: 5,
  },
  list: {
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  userItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
});
