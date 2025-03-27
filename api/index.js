require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'my_super_secret_key_123';

console.log("FIREBASE_SERVICE_ACCOUNT:", process.env.FIREBASE_SERVICE_ACCOUNT);


// Fix Firebase JSON Key Issue
const firebaseConfig = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!firebaseConfig) {
    throw new Error("ERROR: FIREBASE_SERVICE_ACCOUNT is empty or undefined!");
}

let serviceAccount;
try {
    const jsonString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!jsonString) {
        throw new Error("ERROR: FIREBASE_SERVICE_ACCOUNT is empty or undefined!");
    }

    // Convert \\n to actual newlines before parsing
    serviceAccount = JSON.parse(jsonString.replace(/\\\\n/g, '\\n'));
} catch (error) {
    console.error("ERROR: FIREBASE_SERVICE_ACCOUNT JSON is invalid:", process.env.FIREBASE_SERVICE_ACCOUNT);
    throw new Error("ERROR: Invalid JSON format in FIREBASE_SERVICE_ACCOUNT! " + error);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore(); 
app.use(express.json());
app.use(cors());

// Root Route (API Test)
app.get('/', (req, res) => {
    res.json({ message: "API is running!" });
});

// Token Verification
const verifyToken = async (req, res, next) => {
    const token = req.header("X-Authorization"); // Match original API header

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        // Verify JWT Token
        const decoded = jwt.verify(token, SECRET_KEY); // Use the same secret key from login
        req.user = decoded; // Attach user data to request
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token." });
    }
};

// Get all chits from all users (No authentication required)
app.get("/api/chits", async (req, res) => {
    try {
        const usersSnapshot = await db.collection("users").get();
        let allChits = [];

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const chitsRef = db.collection("users").doc(userId).collection("chits");
            const chitsSnapshot = await chitsRef.orderBy("timestamp", "desc").get();

            chitsSnapshot.forEach(doc => {
                allChits.push({
                    chit_id: doc.id,
                    user_id: userId,
                    ...doc.data()
                });
            });
        }

        // Sort chits by latest timestamp
        allChits.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({ chits: allChits });

    } catch (error) {
        console.error("Error retrieving all chits:", error);
        return res.status(500).json({ error: "Error retrieving chits." });
    }
});

// Signup new user
app.post("/api/auth/signup", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        // Create User in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,  // Password is stored securely in Firebase Auth
        });

        // Store User Data in Firestore (excluding password)
        await db.collection("users").doc(userRecord.uid).set({
            firstName: firstName,
            lastName: lastName,
            email: email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(201).json({
            message: "User created successfully",
            uid: userRecord.uid
        });

    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

// Login user
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        // Find user in Firebase Authentication
        const user = await admin.auth().getUserByEmail(email);

        // Firebase Admin SDK does not verify passwords
        // The client-side must authenticate first using Firebase Client SDK.
        
        // Retrieve user details from Firestore
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found." });
        }

        const userData = userDoc.data();

        // Generate JWT Token
        const token = jwt.sign(
            { user_id: user.uid, email: user.email }, // `user_id` matches original response
            SECRET_KEY,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Login successful",
            user_id: user.uid,   // Matches the original API structure
            token: token         // Token for authentication (stored in frontend)
        });

    } catch (error) {
        return res.status(401).json({ error: "Invalid email or password." });
    }
});

// Get users profile details
app.get("/api/user/:user_id", async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        // Fetch user from Firebase Authentication
        const user = await admin.auth().getUser(user_id);

        // Fetch additional user details from Firestore
        const userDoc = await db.collection("users").doc(user_id).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "User details not found in Firestore." });
        }

        const userData = userDoc.data();

        // Convert Firestore Timestamp to readable format
        const createdAt = userData.createdAt ? new Date(userData.createdAt._seconds * 1000).toISOString() : null;

        return res.status(200).json({
            uid: user.uid,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: user.email,
            profilePicture: userData.profilePicture || null,
            createdAt: createdAt, // Now in readable format
        });

    } catch (error) {
        return res.status(500).json({ error: "Error fetching user profile." });
    }
});

// Profile image upload
app.post("/api/user/:user_id/photo", verifyToken, async (req, res) => {
    const { user_id } = req.params;
    const { imageURL } = req.body; // changed from imageBase64 => imageURL
  
    if (!user_id || !imageURL) {
      return res.status(400).json({ error: "User ID and image data are required." });
    }
  
    try {
      // Step 1: Find the user in the Firestore database
      const userRef = db.collection("users").doc(user_id);
      const userDoc = await userRef.get();
  
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found." });
      }
  
      // Step 2: Update the user's profile with the image URL
      await userRef.update({ profilePicture: imageURL });
  
      return res.status(201).json({
        message: "Profile picture uploaded successfully",
        user_id: user_id,
        imageURL // respond with the updated image URL (optional)
      });
  
    } catch (error) {
      console.error("Error uploading profile image:", error);
      return res.status(500).json({ error: "Error uploading profile image. Please try again." });
    }
});

// User Search
app.get("/api/users/search", verifyToken, async (req, res) => {
    const { query } = req.query; // search text from the client
  
    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }
  
    try {
      // 1) Read all users from Firestore
      const usersSnapshot = await db.collection("users").get();
      if (usersSnapshot.empty) {
        // If no users at all, just return empty
        return res.status(200).json({ users: [] });
      }
  
      const lowerQ = query.toLowerCase();
      let matchedUsers = [];
  
      // 2) Loop through each user doc
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        // fallback if any field missing
        const firstName = (data.firstName || "").toLowerCase();
        const lastName = (data.lastName || "").toLowerCase();
        const email = (data.email || "").toLowerCase();
  
        // 3) If the query is in firstName, lastName, or email, add to matchedUsers
        if (
          firstName.includes(lowerQ) ||
          lastName.includes(lowerQ) ||
          email.includes(lowerQ)
        ) {
          matchedUsers.push({
            user_id: doc.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email
          });
        }
      });
  
      // 4) Return the results
      if (matchedUsers.length === 0) {
        // Return 200 with empty array or 404? Up to you.
        return res.status(200).json({ users: [] });
      }
  
      return res.status(200).json({ users: matchedUsers });
  
    } catch (error) {
      console.error("Error in search users API:", error);
      return res.status(500).json({ error: "Error searching for users." });
    }
});
  
// Follow
app.post("/api/user/:user_id/follow", verifyToken, async (req, res) => {
    const { user_id } = req.params;  // The user being followed
    const { follower_id } = req.body; // The user who is following

    if (!user_id || !follower_id) {
        return res.status(400).json({ error: "Both user_id and follower_id are required." });
    }

    try {
        // Fetch user documents from Firestore
        const userRef = db.collection("users").doc(user_id);  // User being followed
        const followerRef = db.collection("users").doc(follower_id);  // Follower

        const userDoc = await userRef.get();
        const followerDoc = await followerRef.get();

        if (!userDoc.exists) {
            console.error(`User being followed not found: ${user_id}`);
            return res.status(404).json({ error: `User being followed not found: ${user_id}` });
        }

        if (!followerDoc.exists) {
            console.error(`Follower not found: ${follower_id}`);
            return res.status(404).json({ error: `Follower not found: ${follower_id}` });
        }

        // Bob (follower_id) adds Alice (user_id) to "following" list
        await followerRef.update({
            following: admin.firestore.FieldValue.arrayUnion(user_id)
        });

        // Alice (user_id) adds Bob (follower_id) to "followers" list
        await userRef.update({
            followers: admin.firestore.FieldValue.arrayUnion(follower_id)
        });

        return res.status(200).json({ 
            message: `(${follower_id}) is now following (${user_id}).`
        });

    } catch (error) {
        console.error("Error in follow API:", error);
        return res.status(500).json({ error: "Error following user." });
    }
});

// Unfollow
app.delete("/api/user/:user_id/follow", verifyToken, async (req, res) => {
    const { user_id } = req.params;  // The user being unfollowed
    const { follower_id } = req.body; // The user who is unfollowing

    if (!user_id || !follower_id) {
        return res.status(400).json({ error: "Both user_id and follower_id are required." });
    }

    try {
        // Fetch user documents from Firestore
        const userRef = db.collection("users").doc(user_id);  // User being unfollowed
        const followerRef = db.collection("users").doc(follower_id);  // Follower

        const userDoc = await userRef.get();
        const followerDoc = await followerRef.get();

        if (!userDoc.exists) {
            console.error(`User being unfollowed not found: ${user_id}`);
            return res.status(404).json({ error: `User being unfollowed not found: ${user_id}` });
        }

        if (!followerDoc.exists) {
            console.error(`Follower not found: ${follower_id}`);
            return res.status(404).json({ error: `Follower not found: ${follower_id}` });
        }

        // Remove Alice (user_id) from Bob’s "following" list
        await followerRef.update({
            following: admin.firestore.FieldValue.arrayRemove(user_id)
        });

        // Remove Bob (follower_id) from Alice’s "followers" list
        await userRef.update({
            followers: admin.firestore.FieldValue.arrayRemove(follower_id)
        });

        return res.status(200).json({ 
            message: `(${follower_id}) has unfollowed (${user_id}).`
        });

    } catch (error) {
        console.error("Error in unfollow API:", error);
        return res.status(500).json({ error: "Error unfollowing user." });
    }
});

// Get Followers 
app.get("/api/user/:user_id/followers", verifyToken, async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        // Fetch user's followers list
        const userDoc = await db.collection("users").doc(user_id).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: `User not found: ${user_id}` });
        }

        const userData = userDoc.data();
        const followerIds = userData.followers || [];

        // Fetch follower details
        let followers = [];
        for (const followerId of followerIds) {
            const followerDoc = await db.collection("users").doc(followerId).get();
            if (followerDoc.exists) {
                const followerData = followerDoc.data();
                followers.push({
                    user_id: followerId,
                    firstName: followerData.firstName,
                    lastName: followerData.lastName,
                    email: followerData.email
                });
            }
        }

        return res.status(200).json({ followers });

    } catch (error) {
        console.error("Error in get followers API:", error);
        return res.status(500).json({ error: "Error retrieving followers." });
    }
});

// Get Following
app.get("/api/user/:user_id/following", verifyToken, async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        // Fetch user's following list
        const userDoc = await db.collection("users").doc(user_id).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: `User not found: ${user_id}` });
        }

        const userData = userDoc.data();
        const followingIds = userData.following || [];

        // Fetch following user details
        let following = [];
        for (const followingId of followingIds) {
            const followingDoc = await db.collection("users").doc(followingId).get();
            if (followingDoc.exists) {
                const followingData = followingDoc.data();
                following.push({
                    user_id: followingId,
                    firstName: followingData.firstName,
                    lastName: followingData.lastName,
                    email: followingData.email
                });
            }
        }

        return res.status(200).json({ following });

    } catch (error) {
        console.error("Error in get following API:", error);
        return res.status(500).json({ error: "Error retrieving following list." });
    }
});

// Post a chit (image/location)
app.post("/api/user/:user_id/chits", verifyToken, async (req, res) => {
    const { user_id } = req.params;
    const { text, longitude, latitude, imageURL } = req.body; 
    // ↑ ADDED imageURL (if the client sends it)

    if (!user_id || !text) {
        return res.status(400).json({ error: "User ID and chit text are required." });
    }

    try {
        const chitData = {
            chit_content: text,
            timestamp: Math.floor(new Date() / 1000), // Store timestamp in UNIX format
            location: (longitude && latitude) ? { longitude, latitude } : null,
            // If you want to rename the DB field to "imageURL" to be consistent, do:
            imageURL: imageURL || null
        };

        // Store chit in Firestore
        const chitsRef = db.collection("users").doc(user_id).collection("chits");
        const newChitRef = await chitsRef.add(chitData);

        return res.status(201).json({
            message: "Chit posted successfully",
            chit_id: newChitRef.id
        });

    } catch (error) {
        console.error("Error in post chit API:", error);
        return res.status(500).json({ error: "Error posting chit." });
    }
});

// Post photo on chit
// No longer required due to using databse for images.

// Get own chits
app.get("/api/user/:user_id/chits", verifyToken, async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        // Fetch user's chits from Firestore
        const chitsRef = db.collection("users").doc(user_id).collection("chits");
        const snapshot = await chitsRef.orderBy("timestamp", "desc").get();

        if (snapshot.empty) {
            return res.status(200).json({ chits: [] });
        }

        let chits = [];
        snapshot.forEach(doc => {
        chits.push({ 
            chit_id: doc.id, 
            user_id: user_id,
            ...doc.data() });
        });

        return res.status(200).json({ chits });

    } catch (error) {
        console.error("Error in get chits API:", error);
        return res.status(500).json({ error: "Error retrieving chits." });
    }
});

// Get all chits on a feed 
app.get("/api/user/:user_id/feed", verifyToken, async (req, res) => {
    try {
        // Fetch all users
        const usersSnapshot = await db.collection("users").get();
        let feed = [];

        // Loop through each user and fetch their chits
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const chitsRef = db.collection("users").doc(userId).collection("chits");
            const chitsSnapshot = await chitsRef.orderBy("timestamp", "desc").get();

            chitsSnapshot.forEach(doc => {
                feed.push({
                    chit_id: doc.id,
                    user_id: userId,
                    ...doc.data()
                });
            });
        }

        // Sort all chits by latest timestamp
        feed.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({ feed });

    } catch (error) {
        console.error("Error in get feed API:", error);
        return res.status(500).json({ error: "Error retrieving feed." });
    }
});

// Delete Chit
app.delete("/api/user/:user_id/chits/:chit_id", verifyToken, async (req, res) => {
    const { user_id, chit_id } = req.params;

    if (!user_id || !chit_id) {
        return res.status(400).json({ error: "User ID and Chit ID are required." });
    }

    try {
        // Fetch chit document
        const chitRef = db.collection("users").doc(user_id).collection("chits").doc(chit_id);
        const chitDoc = await chitRef.get();

        if (!chitDoc.exists) {
            return res.status(404).json({ error: "Chit not found." });
        }

        // Check if the requester is the owner of the chit
        if (req.user.user_id !== user_id) {
            return res.status(403).json({ error: "You are not authorized to delete this chit." });
        }

        // Delete chit from Firestore
        await chitRef.delete();

        return res.status(200).json({ message: "Chit deleted successfully." });

    } catch (error) {
        console.error("Error deleting chit:", error);
        return res.status(500).json({ error: "Error deleting chit." });
    }
});

// Start Server for Local API
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Local API running on http://localhost:${PORT}`);
    });
}

// Export for Vercel Deployment
module.exports = app;
