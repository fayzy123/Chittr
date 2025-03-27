import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Card } from 'native-base';
import { GOOGLE_MAPS_API_KEY } from '@env';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons'; // for the trash icon

import URL from '../asset/URL'; // Adjust path if needed

/**
 * Props:
 * - chit: the chit object
 * - token: the logged-in user's token
 * - userId: the logged-in user's ID
 * - viewingAnotherUser: boolean (true if we're viewing someone else's profile)
 * - onDeleteSuccess: callback to refresh after deleting
 */
const ChitCard = ({ chit, token, userId, viewingAnotherUser, onDeleteSuccess }) => {
  const [locationName, setLocationName] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(!!chit.location);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchLocationName = async () => {
      if (!chit.location || !chit.location.latitude || !chit.location.longitude) {
        return setLoadingLocation(false);
      }

      try {
        const { latitude, longitude } = chit.location;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
          setLocationName(data.results[0].formatted_address);
        } else {
          console.log('Google Maps API returned:', data.status, data.error_message);
          setLocationName('Unknown location');
        }
      } catch (error) {
        console.error('Location fetch error:', error);
        setLocationName('Location unavailable');
      }
      setLoadingLocation(false);
    };

    fetchLocationName();
  }, [chit.location]);

  // If the user didn't provide text, we'll show “Checked in at:”
  const hasText = chit.chit_content && chit.chit_content.trim() !== '';
  const displayText = hasText ? chit.chit_content : 'Checked in at:';

  // DELETE logic
  const handleDelete = async () => {
    try {
      setDeleting(true);
      // e.g. /api/user/:user_id/chits/:chit_id
      await axios.delete(`${URL}/api/user/${userId}/chits/${chit.chit_id}`, {
        headers: { 'X-Authorization': token },
      });
      if (onDeleteSuccess) {
        onDeleteSuccess(); // Refresh parent
      }
    } catch (error) {
      console.error('Delete chit error:', error);
      alert('Failed to delete chit.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.contentContainer}>
        {/* Display chit text */}
        <Text style={styles.content}>{displayText}</Text>

        {/* Prefer new imageURL if present, else fall back to old imageBase64 */}
        {chit.imageURL && chit.imageURL !== 'null' ? (
          <Image
            style={styles.image}
            source={{ uri: chit.imageURL }}
          />
        ) : chit.imageBase64 && chit.imageBase64 !== 'null' ? (
          <Image
            style={styles.image}
            source={{ uri: `data:image/jpeg;base64,${chit.imageBase64}` }}
          />
        ) : null}

        {/* Location info */}
        {loadingLocation ? (
          <ActivityIndicator size="small" color="#2ecc71" />
        ) : locationName ? (
          <Text style={styles.location}>📍 {locationName}</Text>
        ) : null}

        {/* Timestamp */}
        <Text style={styles.timestamp}>
          {new Date(chit.timestamp * 1000).toLocaleString()}
        </Text>

        {/* Show trash icon if:
            - We are NOT viewing another user's profile
            - This chit belongs to the logged-in user */}
        {!viewingAnotherUser && chit.user_id === userId && (
          <TouchableOpacity style={styles.deleteIcon} onPress={handleDelete} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color="red" />
            ) : (
              <FontAwesome name="trash" size={20} color="red" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 8,
    padding: 15,
    elevation: 4,
  },
  contentContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'relative', // needed for absolute deleteIcon
  },
  content: {
    fontSize: 16,
    color: '#444',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: 350,
    resizeMode: 'cover',
    borderRadius: 8,
    marginVertical: 10,
  },
  location: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  deleteIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 5,
  },
});

export default ChitCard;
