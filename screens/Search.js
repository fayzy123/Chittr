import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import HeaderBar from './modules/HeaderBar';
import NavBar from './modules/NavBar';
import URL from './asset/URL';

const Search = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  // Track if we've performed a search
  const [searched, setSearched] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadAuth = async () => {
        try {
          const t = await AsyncStorage.getItem('token');
          const uid = await AsyncStorage.getItem('user_id');
          console.log('Search screen read token:', t, 'user_id:', uid);

          setToken(t);
          setUserId(uid);

          // If user is logged out => clear old search
          if (!t || !uid) {
            setQuery('');
            setResults([]);
            setSearched(false);
          }
        } catch (error) {
          console.error('Search.js: error reading token/user_id:', error);
        }
      };
      loadAuth();
    }, [])
  );

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('No Query', 'Please enter something to search.');
      return;
    }
    if (!token) {
      Alert.alert('Not Logged In', 'You must be logged in to search for users.');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await axios.get(`${URL}/api/users/search?query=${query}`, {
        headers: { 'X-Authorization': token },
      });
      console.log('Search response:', response.data);
      setResults(response.data.users || []);
    } catch (error) {
      console.error('Search error:', error);
      if (error.response?.status === 404) {
        setResults([]);
        Alert.alert('No Results', 'No users found for your query.');
      } else {
        Alert.alert('Search Failed', 'Could not find any users matching your query.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        // Navigate to the tab named "Profile" (NOT "ProfileTab"), 
        // then the "ProfileScreen" within that stack.
        navigation.navigate('Profile', {
          screen: 'ProfileScreen',
          params: { otherUserId: item.user_id },
        });
      }}
    >
      <Text style={styles.userName}>
        {item.firstName} {item.lastName}
      </Text>
      <Text style={styles.userEmail}>{item.email}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      {/* 1) Green top area behind the notch */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <NavBar />
        <HeaderBar title="Search Users" />
      </SafeAreaView>

      {/* 2) White main content */}
      <View style={styles.mainContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search by name or email"
          placeholderTextColor="#D3D3D3"
          value={query}
          onChangeText={setQuery}
        />

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>

        <FlatList
          data={results}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          ListEmptyComponent={
            searched && !loading && results.length === 0 ? (
              <Text style={styles.emptyText}>No users found.</Text>
            ) : null
          }
        />
      </View>
    </>
  );
};

export default Search;

const styles = StyleSheet.create({
  // 1) The top safe area is green
  safeAreaTop: {
    backgroundColor: '#2ecc71',
  },
  // 2) The main content area is white
  mainContainer: {
    flex: 1,
    backgroundColor: '#f4f9f4',
    padding: 16,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  searchButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
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
