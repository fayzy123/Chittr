import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert, // <-- Added Alert here
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Box, VStack, FormControl, Button, Text, WarningOutlineIcon } from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import URL from './asset/URL'; // Adjust if needed
import HeaderBar from './modules/HeaderBar';
import NavBar from './modules/NavBar';

/**
 * Login Screen
 * -----------
 * 1. Collects user email & password
 * 2. Sends POST /api/auth/login
 * 3. Stores token & user_id in AsyncStorage
 * 4. Optionally calls a protected endpoint (/api/user/:user_id) to verify token
 * 5. Navigates to Home on success
 */
const Login = ({ navigation }) => {
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Validation states
  const [validEmail, setValidEmail] = useState(false);
  const [validPassword, setValidPassword] = useState(false);

  // Messaging
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, [])
  );

  /**
   * validateEmail:
   *  - Checks if text is a valid email format
   */
  const validateEmail = (text) => {
    const reg = /^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/;
    setEmail(text);
    setValidEmail(reg.test(text));
  };

  /**
   * validatePassword:
   *  - For example, must be >= 8 chars
   */
  const validatePassword = (text) => {
    setPassword(text);
    setValidPassword(text.length >= 8);
  };

  /**
   * handleLogin:
   *  - Sends credentials to /api/auth/login
   *  - Stores token & user_id on success
   *  - Optionally calls a protected endpoint to confirm the token works
   */
  const handleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!validEmail || !validPassword) {
      setErrorMessage('Please enter a valid email/password.');
      return;
    }

    try {
      const response = await axios.post(`${URL}/api/auth/login`, { email, password });
      console.log('Login success:', response.data);

      const { token, user_id } = response.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user_id', user_id);

      const profileResponse = await axios.get(`${URL}/api/user/${user_id}`, {
        headers: { 'X-Authorization': token },
      });
      console.log('Protected endpoint success. User profile:', profileResponse.data);

      setSuccessMessage('Logged in successfully!');
      setEmail('');
      setValidEmail(false);
      setPassword('');
      setValidPassword(false);

      // <-- Added this alert
      Alert.alert('Success', 'You have successfully logged in!');

      navigation.navigate('Home');
    } catch (error) {
      console.error('Login error:', error);
      setSuccessMessage('');
      setErrorMessage(error.response?.data?.error || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <>
      {/* Top safe area with green background near the notch */}
      <SafeAreaView style={styles.topSafeArea} edges={['top']}>
        <HeaderBar 
          loggedIn={false}  
          navigation={navigation}
          page="Sign In"
        />
        <NavBar />
      </SafeAreaView>

      {/* Main content area with white background */}
      <SafeAreaView style={styles.mainSafeArea} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Box style={styles.formBox}>
              <VStack space={4}>
                <Text style={styles.title}>Welcome Back</Text>

                {/* EMAIL */}
                <FormControl isRequired isInvalid={!validEmail && email !== ''}>
                  <FormControl.Label>Email</FormControl.Label>
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor="#D3D3D3"
                    value={email}
                    onChangeText={validateEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {!validEmail && email !== '' && (
                    <Text style={styles.errorText}>Invalid email</Text>
                  )}
                </FormControl>

                {/* PASSWORD */}
                <FormControl isRequired isInvalid={!validPassword && password !== ''}>
                  <FormControl.Label>Password</FormControl.Label>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#D3D3D3"
                    secureTextEntry
                    value={password}
                    onChangeText={validatePassword}
                  />
                  {!validPassword && password !== '' && (
                    <Text style={styles.errorText}>Password must be at least 8 characters</Text>
                  )}
                </FormControl>

                {errorMessage ? <Text style={styles.errorMsg}>{errorMessage}</Text> : null}
                {successMessage ? <Text style={styles.successMsg}>{successMessage}</Text> : null}

                <Button
                    mt={6}
                    bg="#5fc771"
                    onPress={handleLogin}
                    _pressed={{ bg: "#4eb864" }}  // slightly darker green on press
                  >
                  Log In
                </Button>

                <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
                </TouchableOpacity>
              </VStack>
            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default Login;

const styles = StyleSheet.create({
  topSafeArea: {
    backgroundColor: '#2ecc71', // green background for top safe area (notch)
  },
  mainSafeArea: {
    flex: 1,
    backgroundColor: '#fff', // white background for main content
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  formBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  errorMsg: {
    marginTop: 10,
    color: 'red',
    textAlign: 'center',
  },
  successMsg: {
    marginTop: 10,
    color: 'green',
    textAlign: 'center',
  },
  signupLink: {
    alignSelf: 'center',
    marginTop: 16,
  },
  signupText: {
    color: '#5fc771',
    fontWeight: 'bold',
  },
});
