import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import axios from 'axios';

// Firebase imports
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../firebaseConfig'; // Adjust path to your firebaseConfig

import HeaderBar from './HeaderBar';  // Adjust path if needed
import NavBar from './NavBar';        // Adjust path if needed
import URL from '../asset/URL';       // e.g. "https://my-api.example.com"

const PostChit = ({ navigation }) => {
  const [chitText, setChitText] = useState('');
  const [location, setLocation] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // STEP 1: Let user pick location
  const handleCheckIn = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Denied', 'Permission to access location was denied.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  // Remove location
  const handleRemoveLocation = () => {
    setLocation(null);
  };

  // STEP 2: Pick an image
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  // STEP 3: Upload local file to Firebase => get downloadURL
  const uploadImageToFirebase = async (localUri, uniqueName) => {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();

      const storage = getStorage(app);
      const storageRef = ref(storage, `chits/${uniqueName}.jpg`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // STEP 4: Post chit to /api/user/:user_id/chits with imageURL
  const handlePostChit = async () => {
    if (!chitText.trim()) {
      Alert.alert('No Text', 'Please enter chit text.');
      return;
    }
    setLoading(true);

    try {
      // a) Retrieve userId & token for X-Authorization
      const userId = await AsyncStorage.getItem('user_id');
      const token = await AsyncStorage.getItem('token');

      if (!userId || !token) {
        Alert.alert('Not Logged In', 'You must be logged in to post a chit.');
        setLoading(false);
        return;
      }

      // b) Upload image if we have one
      let downloadURL = null;
      if (imageUri) {
        const uniqueName = Date.now().toString();
        downloadURL = await uploadImageToFirebase(imageUri, uniqueName);
      }

      // c) Build body with imageURL
      const chitBody = {
        text: chitText,
        longitude: location?.longitude,
        latitude: location?.latitude,
        imageURL: downloadURL || null,  // <--- KEY FIELD
      };

      // Log for debugging
      console.log('Posting chit with body:', chitBody);

      // d) POST to /api/user/:user_id/chits
      const response = await axios.post(
        `${URL}/api/user/${userId}/chits`,
        chitBody,
        {
          headers: {
            'X-Authorization': token, // for verifyToken
          },
        }
      );

      console.log('Node server response:', response.data);

      // e) Reset states
      setChitText('');
      setLocation(null);
      setImageUri(null);

      Alert.alert('Chit Posted', 'Your chit was posted successfully!');
      navigation.navigate('Home', { refreshOnPost: true });
    } catch (error) {
      console.error('Error posting chit:', error);
      Alert.alert('Post Failed', 'Failed to post chit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <NavBar />
      <HeaderBar title="Post a Chit" />

      <View style={styles.container}>
        {loading && <ActivityIndicator size="large" color="#2ecc71" />}

        <Text style={styles.title}>Post a New Chit</Text>

        {/* Text input */}
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          value={chitText}
          onChangeText={setChitText}
        />

        {/* Location */}
        {!location ? (
          <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
            <Text style={styles.checkInText}>Check In Location</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>
              Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
            <TouchableOpacity onPress={handleRemoveLocation}>
              <Text style={[styles.checkInText, { color: 'red' }]}>Remove Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Image pick/remove */}
        {!imageUri ? (
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.checkInText}>Pick an Image</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>Image Selected</Text>
            <TouchableOpacity onPress={() => setImageUri(null)}>
              <Text style={[styles.checkInText, { color: 'red' }]}>Remove Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Post button */}
        <TouchableOpacity style={styles.postButton} onPress={handlePostChit} disabled={loading}>
          <Text style={styles.postButtonText}>Post Chit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PostChit;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2ecc71',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f9f4',
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  checkInButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  checkInText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  locationContainer: {
    marginBottom: 10,
  },
  locationText: {
    color: '#333',
    marginBottom: 5,
  },
  imageButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  postButton: {
    backgroundColor: '#5fc771',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
