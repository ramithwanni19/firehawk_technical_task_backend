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
    const { 
      limit = 10, 
      lastDocId, 
      sortBy, 
      direction = 'asc' 
    } = req.query;

    let query = db.collection('cars');

    const countSnapshot = await query.count().get();
    const totalRecords = countSnapshot.data().count;
    if (sortBy && sortBy.trim() !== '') {
      query = query.orderBy(sortBy, direction);
    }

    if (lastDocId) {
      const lastDoc = await db.collection('cars').doc(lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.limit(Number(limit)).get();
    const cars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({
      data: cars,
      totalRecords: totalRecords,
      nextPageToken: cars.length === Number(limit) ? cars[cars.length - 1].id : null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/filter-cars', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('cars').get();
    const cars = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    res.json({
      data: cars,
      totalRecords: cars.length,
      nextPageToken: null 
    });
  } catch (error) {
    console.error("Firestore Data Fetch Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/add-car', authenticateToken, async (req, res) => {
  try {
    const carData = req.body;
    if (!carData.make || !carData.model) {
      return res.status(400).json({ error: "Make and Model are required fields." });
    }
   const recordToSave = {
      ...carData,
      createdBy: req.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
   const docRef = await db.collection('cars').add(recordToSave);
   res.status(201).json({
      id: docRef.id,
      ...recordToSave
    });
  } catch (error) {
    console.error("Add Car Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete-car/:id', authenticateToken, async (req, res) => {
  try {
    const carId = req.params.id;
    await db.collection('cars').doc(carId).delete();
    res.json({ message: `Car ${carId} successfully deleted.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT,'0.0.0.0', () => {
  console.log(`Backend server is running on http://${URL}:${PORT}`);
});