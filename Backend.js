const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
const port = 3000;

const serviceAccount = require("./firebaseAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(cors());
app.use(express.json());

// Test API
app.get("/", (req, res) => {
  res.send("Emma’s backend is running!");
});

app.listen(port, () => {
  console.log(` Server is running at http://localhost:${port}`);
});

// get user info API
app.get("/api/user/profile/:uid", async (req, res) => {
    const uid = req.params.uid;
  
    try {
      const userRef = db.collection("users").doc(uid);
      const doc = await userRef.get();
  
      if (!doc.exists) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.status(200).json(doc.data());
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  // update user photo
app.put("/api/user/update/:uid", async (req, res) => {
    const uid = req.params.uid;
    const { name, avatarUrl } = req.body;
  
    if (!name || !avatarUrl) {
      return res.status(422).json({ message: "Please provide name and avatarUrl" });
    }
  
    try {
      const userRef = db.collection("users").doc(uid);
      await userRef.update({
        name,
        avatarUrl
      });
  
      res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  
  //user submit feedback
  app.post("/api/feedback/submit/:uid", async (req, res) => {
    const uid = req.params.uid;
    const { feedbackText, rating } = req.body;
  
    //  check if feedbacktext and rating are provides
    if (!feedbackText || !rating) {
      return res.status(422).json({
        message: "Please provide both feedbackText and rating"
      });
    }
  
    //  check rating is vaild
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be a number between 1 and 5"
      });
    }
  
    try {
      const feedbackRef = db.collection("feedback").doc(); // auto generate id
      await feedbackRef.set({
        uid,
        feedbackText,
        rating,
        submittedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  
      res.status(201).json({ message: "Feedback submitted successfully" });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  //GPS
  app.post('/update-location', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ message: "Token is required." });
  
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
  
      const { latitude, longitude, timestamp } = req.body;
      if (latitude == null || longitude == null || !timestamp) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      await db.collection('locations')
              .doc(userId)
              .collection('history')
              .add({
                latitude,
                longitude,
                timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp)),
              });
  
      console.log(`Location saved under /locations/${userId}/history`);
      return res.status(200).json({ status: 'Location saved successfully' });
    } catch (error) {
      console.error(' Error updating location:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  