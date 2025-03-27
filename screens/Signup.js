import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  KeyboardAvoidingView, 
  ScrollView, 
  TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useFocusEffect } from '@react-navigation/native';
import { Box, VStack, Text, Button } from 'native-base';
import axios from 'axios';
import URL from './asset/URL';
import HeaderBar from './modules/HeaderBar';
import NavBar from './modules/NavBar';

const Signup = ({ navigation }) => {
  // State for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');

  // Validation state
  const [validFirstName, setValidFirstName] = useState(false);
  const [validLastName, setValidLastName]   = useState(false);
  const [validEmail, setValidEmail]         = useState(false);
  const [validPassword, setValidPassword]   = useState(false);

  // Messages
  const [errorMessage, setErrorMessage]     = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Clear all fields and messages when screen is focused
  useFocusEffect(
    useCallback(() => {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setValidFirstName(false);
      setValidLastName(false);
      setValidEmail(false);
      setValidPassword(false);
      setErrorMessage('');
      setSuccessMessage('');
      return () => {};
    }, [])
  );

  // Validation functions
  const validateFirstName = (text) => {
    const reg = /^[a-z ,.'-]+$/i;
    setFirstName(text);
    setValidFirstName(reg.test(text));
  };

  const validateLastName = (text) => {
    const reg = /^[a-z ,.'-]+$/i;
    setLastName(text);
    setValidLastName(reg.test(text));
  };

  const validateEmail = (text) => {
    const reg = /^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/;
    setEmail(text);
    setValidEmail(reg.test(text));
  };

  const validatePassword = (text) => {
    const reg = /^(?=.*\d)[A-Za-z\d]{8,}$/;
    setPassword(text);
    setValidPassword(reg.test(text));
  };

  const handleSignUp = async () => {
    if (!validFirstName || !validLastName || !validEmail || !validPassword) {
      setErrorMessage('Please fill valid details in all fields.');
      return;
    }
    try {
      const response = await axios.post(`${URL}/api/auth/signup`, {
        firstName,
        lastName,
        email,
        password,
      });
      console.log('Signup success:', response.data);
      setSuccessMessage('Account created successfully! Please log in.');
      setErrorMessage('');
      // Reset form fields
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setValidFirstName(false);
      setValidLastName(false);
      setValidEmail(false);
      setValidPassword(false);
      // Delay navigation so user can see the success message
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error) {
      console.error('Signup error:', error);
      setSuccessMessage('');
      setErrorMessage(
        error.response?.data?.error || 'Signup failed. Please try again.'
      );
    }
  };

  return (
    <>
      {/* Top safe area with green background near the notch */}
      <SafeAreaView style={styles.topSafeArea} edges={['top']}>
        <HeaderBar
          loggedIn={false}
          navigation={navigation}
          page="Create Account"
        />
        <NavBar />
      </SafeAreaView>

      {/* Main content area with white background */}
      <SafeAreaView style={styles.mainSafeArea} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
          >
            <Box style={styles.formBox}>
              <VStack space={1}>
                <Text style={styles.title}>Create an Account</Text>

                {/* FIRST NAME */}
                <Text style={styles.label}>
                  First Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor="#D3D3D3"
                  value={firstName}
                  onChangeText={validateFirstName}
                />
                {!validFirstName && firstName !== '' && (
                  <Text style={styles.errorText}>Invalid first name</Text>
                )}

                {/* LAST NAME */}
                <Text style={styles.label}>
                  Last Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor="#D3D3D3"
                  value={lastName}
                  onChangeText={validateLastName}
                />
                {!validLastName && lastName !== '' && (
                  <Text style={styles.errorText}>Invalid last name</Text>
                )}

                {/* EMAIL */}
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
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

                {/* PASSWORD */}
                <Text style={styles.label}>
                  Password <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#D3D3D3"
                  secureTextEntry
                  value={password}
                  onChangeText={validatePassword}
                />
                {!validPassword && password !== '' && (
                  <Text style={styles.errorText}>
                    Invalid password (min 8 chars, at least 1 digit)
                  </Text>
                )}

                {errorMessage ? <Text style={styles.errorMsg}>{errorMessage}</Text> : null}
                {successMessage ? <Text style={styles.successMsg}>{successMessage}</Text> : null}

                <Button
                    mt={6}
                    bg="#5fc771"
                    onPress={handleSignUp}
                    _pressed={{ bg: "#4eb864" }}
                  >
                  Sign Up
                </Button>

                <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginText}>Already have an account? Log In</Text>
                </TouchableOpacity>
              </VStack>
            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default Signup;

const styles = StyleSheet.create({
  topSafeArea: {
    backgroundColor: '#2ecc71', // Green area near the notch
  },
  mainSafeArea: {
    flex: 1,
    backgroundColor: '#fff', // White content background
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
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20, // Increased padding to balance overall size
    elevation: 2,
  },
  title: {
    fontSize: 22, // Use 22 for a readable title
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  required: {
    color: 'red',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
  },
  errorMsg: {
    marginTop: 10,
    color: 'red',
    textAlign: 'center',
    fontSize: 14,
  },
  successMsg: {
    marginTop: 10,
    color: 'green',
    textAlign: 'center',
    fontSize: 14,
  },
  loginLink: {
    alignSelf: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#5fc771',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
