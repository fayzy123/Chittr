import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { app } from '../firebaseConfig'; // For uploading profile images
import HeaderBar from './modules/HeaderBar';
import NavBar from './modules/NavBar';
import ChitCard from './modules/ChitCard';
import URL from './asset/URL';

const Profile = ({ navigation }) => {
  const route = useRoute();
  // If we navigated with params: { otherUserId }, read it:
  const otherUserId = route.params?.otherUserId || null;

  // States
  const [user, setUser] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [chits, setChits] = useState([]);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageCacheBust, setImageCacheBust] = useState(Date.now());

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // The logged-in user's following list
  const [myFollowing, setMyFollowing] = useState([]);

  /**
   * Re-check auth and fetch all profile data
   * - Called on focus and when refreshing
   */
  const reCheckAuth = async () => {
    setLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUserId = await AsyncStorage.getItem('user_id');

      if (!storedToken || !storedUserId) {
        // Not logged in
        setToken(null);
        setUserId(null);
        setUser(null);
        setFollowersCount(0);
        setFollowingCount(0);
        setChits([]);
        setMyFollowing([]);
        setLoading(false);
      } else {
        // Logged in => read user data
        setToken(storedToken);
        setUserId(storedUserId);

        // Decide whose profile we are viewing
        const actualId =
          otherUserId && String(otherUserId) !== String(storedUserId)
            ? otherUserId
            : storedUserId;

        // Fetch everything in parallel
        await Promise.all([
          fetchProfile(storedToken, actualId),
          fetchFollowers(storedToken, actualId),
          fetchFollowing(storedToken, actualId),
          fetchUserChits(storedToken, actualId),
          fetchMyFollowing(storedToken, storedUserId),
        ]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error re-checking auth in Profile:', error);
      setLoading(false);
    }
  };

  // Fetch user info
  const fetchProfile = async (storedToken, targetId) => {
    try {
      const response = await axios.get(`${URL}/api/user/${targetId}`, {
        headers: { 'X-Authorization': storedToken },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch followers
  const fetchFollowers = async (storedToken, targetId) => {
    try {
      const response = await axios.get(`${URL}/api/user/${targetId}/followers`, {
        headers: { 'X-Authorization': storedToken },
      });
      setFollowersCount(response.data.followers?.length || 0);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  // Fetch following
  const fetchFollowing = async (storedToken, targetId) => {
    try {
      const response = await axios.get(`${URL}/api/user/${targetId}/following`, {
        headers: { 'X-Authorization': storedToken },
      });
      setFollowingCount(response.data.following?.length || 0);
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  // Fetch user's chits
  const fetchUserChits = async (storedToken, targetId) => {
    try {
      const response = await axios.get(`${URL}/api/user/${targetId}/chits`, {
        headers: { 'X-Authorization': storedToken },
      });
      setChits(response.data.chits || []);
    } catch (error) {
      console.error('Error fetching user chits:', error);
    }
  };

  // Fetch MY following list (the logged-in user)
  const fetchMyFollowing = async (storedToken, myUid) => {
    try {
      const res = await axios.get(`${URL}/api/user/${myUid}/following`, {
        headers: { 'X-Authorization': storedToken },
      });
      setMyFollowing(res.data.following || []);
    } catch (error) {
      console.error('Error fetching MY following list:', error);
    }
  };

  // Follow
  const followUser = async (theirId) => {
    try {
      const me = await AsyncStorage.getItem('user_id');
      const myToken = await AsyncStorage.getItem('token');
      await axios.post(
        `${URL}/api/user/${theirId}/follow`,
        { follower_id: me },
        { headers: { 'X-Authorization': myToken } }
      );
      Alert.alert('Success', 'You are now following this user.');
      reCheckAuth();
    } catch (error) {
      console.error('Follow error:', error);
      Alert.alert('Error', 'Could not follow user.');
    }
  };

  // Unfollow
  const unFollowUser = async (theirId) => {
    try {
      const me = await AsyncStorage.getItem('user_id');
      const myToken = await AsyncStorage.getItem('token');
      await axios.delete(`${URL}/api/user/${theirId}/follow`, {
        data: { follower_id: me },
        headers: { 'X-Authorization': myToken },
      });
      Alert.alert('Success', 'You have unfollowed this user.');
      reCheckAuth();
    } catch (error) {
      console.error('Unfollow error:', error);
      Alert.alert('Error', 'Could not unfollow user.');
    }
  };

  // Pick profile image from library
  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets?.[0].uri) {
        await uploadProfileImageToFirebase(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking profile image:', error);
    }
  };

  // Upload profile image to Firebase
  const uploadProfileImageToFirebase = async (localUri) => {
    setUploading(true);
    try {
      if (!token || !userId) {
        Alert.alert('Not Logged In', 'Cannot upload profile image without a token.');
        setUploading(false);
        return;
      }
      const downloadURL = await uploadLocalFile(localUri);
      if (!downloadURL) throw new Error('Failed to get download URL from Firebase');

      await axios.post(
        `${URL}/api/user/${userId}/photo`,
        { imageURL: downloadURL },
        { headers: { 'X-Authorization': token } }
      );

      await fetchProfile(token, userId);
      setImageCacheBust(Date.now());
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Upload Failed', 'Could not update profile picture.');
    } finally {
      setUploading(false);
    }
  };

  // Actually upload local file to Firebase Storage
  const uploadLocalFile = async (localUri) => {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const storage = getStorage(app);
      const uniqueName = Date.now().toString();
      const storageRef = ref(storage, `profiles/${uniqueName}.jpg`);

      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error('Firebase upload error:', err);
      return null;
    }
  };

  // Are we viewing another user?
  const viewingAnotherUser = otherUserId && String(otherUserId) !== String(userId);

  /**
   * useFocusEffect: reCheckAuth each time we navigate back to Profile
   * Keep [otherUserId] so if we switch from one user's profile to another,
   * it re-fetches the correct data
   */
  useFocusEffect(
    useCallback(() => {
      reCheckAuth();
    }, [otherUserId])
  );

  // If still loading, show spinner
  if (loading) {
    return (
      <>
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <NavBar />
          <HeaderBar title="Profile" />
        </SafeAreaView>
        <View style={styles.mainContainer}>
          <ActivityIndicator size="large" color="#2ecc71" />
        </View>
      </>
    );
  }

  // If not logged in, show a message
  if (!token || !userId) {
    return (
      <>
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <NavBar />
          <HeaderBar title="Profile" />
        </SafeAreaView>
        <View style={styles.mainContainer}>
          <Text style={styles.notLoggedInText}>You are not logged in.</Text>
          <Text style={styles.notLoggedInSubtext}>
            Please log in or sign up to view your profile.
          </Text>
        </View>
      </>
    );
  }

  // If user object isn't loaded yet, show "Loading user data..."
  if (!user) {
    return (
      <>
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <NavBar />
          <HeaderBar title="Profile" />
        </SafeAreaView>
        <View style={styles.mainContainer}>
          <Text style={styles.notLoggedInText}>Loading user data...</Text>
        </View>
      </>
    );
  }

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await reCheckAuth();
    setRefreshing(false);
  };

  // DEBUG: Log the myFollowing array so you can see the fields
  console.log('myFollowing array:', myFollowing);

  // If we're already following "otherUserId," show Unfollow; else Follow
  // We try multiple fields, because your server might store "uid", "user_id", or "id"
  const amIFollowing = myFollowing.some((followed) =>
    followed.uid === otherUserId ||
    followed.user_id === otherUserId ||
    followed.id === otherUserId
  );

  return (
    <>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <NavBar />
        <HeaderBar title="Chittr" />
      </SafeAreaView>

      <View style={styles.mainContainer}>
        <View style={styles.profilePicContainer}>
          <View style={styles.profilePicCircle}>
            <Image
              source={
                user.profilePicture
                  ? { uri: `${user.profilePicture}?time=${imageCacheBust}` }
                  : require('../assets/placeholder.jpg')
              }
              style={styles.profilePic}
            />
            {!viewingAnotherUser && (
              <TouchableOpacity style={styles.cameraBtnBox} onPress={pickProfileImage}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#2ecc71" />
                ) : (
                  <FontAwesome name="camera" size={18} color="#2ecc71" />
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.profileName}>
            {user.firstName} {user.lastName}
          </Text>
        </View>

        <Text style={styles.emailText}>{user.email}</Text>

        <View style={styles.followRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('FollowingInsight', { user_id: user.uid })}
          >
            <Text style={styles.followCountText}>Followers: {followersCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginLeft: 20 }}
            onPress={() => navigation.navigate('FollowingInsight', { user_id: user.uid })}
          >
            <Text style={styles.followCountText}>Following: {followingCount}</Text>
          </TouchableOpacity>
        </View>

        {viewingAnotherUser && (
          <View style={styles.followButtons}>
            {!amIFollowing ? (
              <TouchableOpacity style={styles.followBtn} onPress={() => followUser(otherUserId)}>
                <Text style={styles.followBtnText}>Follow</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.followBtn, { backgroundColor: 'red', marginLeft: 10 }]}
                onPress={() => unFollowUser(otherUserId)}
              >
                <Text style={styles.followBtnText}>Unfollow</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {viewingAnotherUser && (
          <TouchableOpacity
            style={styles.goMyProfileBtn}
            onPress={() =>
              navigation.navigate('Profile', {
                screen: 'ProfileScreen',
              })
            }
          >
            <Text style={styles.goMyProfileText}>Go to My Profile</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>My Chits</Text>

        <FlatList
          data={chits}
          keyExtractor={(item) => item.chit_id}
          renderItem={({ item }) => (
            <ChitCard
              chit={item}
              token={token}
              userId={userId}
              viewingAnotherUser={viewingAnotherUser}
              onDeleteSuccess={reCheckAuth} // refresh after deleting a chit
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2ecc71']}
            />
          }
        />
      </View>
    </>
  );
};

export default Profile;

const styles = StyleSheet.create({
  safeAreaTop: {
    backgroundColor: '#2ecc71',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f4f9f4',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  notLoggedInText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  notLoggedInSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePicCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#d3d3d3',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profilePic: {
    width: 110,
    height: 110,
    borderRadius: 55,
    resizeMode: 'cover',
  },
  cameraBtnBox: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  followCountText: {
    color: '#2ecc71',
    fontWeight: 'bold',
    fontSize: 14,
  },
  followButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  followBtn: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  goMyProfileBtn: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderColor: '#2ecc71',
    borderWidth: 2,
    marginBottom: 20,
  },
  goMyProfileText: {
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 8,
    textAlign: 'left',
  },
});
