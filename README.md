# Chittr — React Native Firebase App

Chittr is a lightweight Twitter/X-style mobile app built with React Native and Expo, where users can post short messages called **chits**. In addition to text, users can attach images and share their location with each chit. The app includes a complete login and registration system powered by Firebase Authentication, and stores all chits in a real-time Firebase database.

---

## Features

- Firebase Authentication (Login & Sign-up)
- Post and view chits
- Attach images to chits
- Share location with chits using Google Maps API
- Real-time database support via Firebase
- Built with React Native + Expo
- Clean configuration using `.env` and `.json` files

---

## Getting Started

To get up and running with Chittr, follow the steps below:

### 1. Clone the repo

```bash
git clone https://github.com/your-username/chittr.git
cd chittr
```

### 2. Install dependencies

Make sure you have Node.js and Expo CLI installed.

Then run:

```bash
npm install
# or
yarn
```

---

## Project Setup (Required Before Running)

You’ll need to set up your Firebase credentials and environment variables before running the app.

---

### Firebase Configuration

1. In the root of the project, duplicate the provided example config:

```bash
cp firebaseConfig.example.json firebaseConfig.json
```

2. Go to [Firebase Console](https://console.firebase.google.com/), create a project (or use an existing one), and register a web app.

3. In your Firebase project settings under "General" > "Your apps", copy the config snippet and paste it into your `firebaseConfig.json`:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT_ID.appspot.com",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "appId": "YOUR_APP_ID"
}
```

---

### Environment Variables

#### Root `.env` file (for frontend)

1. Copy the example file:

```bash
cp .env.example .env
```

2. Fill in your **Google Maps API key**:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

#### API-specific `.env` (for backend)

1. If your project includes a backend inside `Api/`, copy the environment file:

```bash
cp Api/.env.example Api/.env
```

2. Fill in the following:

```env
JWT_SECRET=your_jwt_secret_here
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json_string
```

> Tip: Use a tool or script to convert your Firebase service account JSON into a one-line escaped string, or base64-encode it if needed.

---

## Run the App

Once your environment is set up and configs are filled in, start the app with Expo:

```bash
npx expo start
```

This will open the Expo Dev Tools in your browser. You can then:

- Scan the QR code with the Expo Go app on your mobile device
- Press `i` to run on iOS simulator (Mac only)
- Press `a` to run on Android emulator

---

## Project Structure

```
chittr/
├── App.js
├── firebase.js                  # Firebase initialized using config
├── firebaseConfig.json          # Actual Firebase config (ignored)
├── firebaseConfig.example.json  # Template for Firebase setup
├── .env                         # Root environment file (ignored)
├── .env.example                 # Template
├── Api/
│   ├── .env                     # Backend API secrets (ignored)
│   └── ...
├── screens/                     # UI screens
├── components/                  # Reusable UI components
└── ...
```

## License

Fayzhan K ©
