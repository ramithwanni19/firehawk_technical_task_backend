const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const serviceAccount = require('./serviceAccountKey.json');
const URL = '192.168.1.8';
const PORT = 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(cors()); 
app.use(express.json());

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
  
    if (!token) return res.status(401).send('Access Denied: No Token Provided');
  
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next(); 
    } catch (error) {
      res.status(403).send('Invalid Token');
    }
  };

app.get('/api/all-cars', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('cars').get();
    const cars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(cars);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(PORT,'0.0.0.0', () => {
  console.log(`Backend server is running on http://${URL}:${PORT}`);
});