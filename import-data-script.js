const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

const serviceAccount = require('./serviceActKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const collectionName = 'cars';

async function importData() {
  const results = [];

  fs.createReadStream('Automobile.csv') 
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`${results.length} uploading...`);
      const batch = db.batch();
      results.forEach((doc) => {
        const docRef = db.collection(collectionName).doc(); 
        batch.set(docRef, {
          ...doc,
          price: parseFloat(doc.price) || 0,
          horsepower: parseInt(doc.horsepower) || 0,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      try {
        await batch.commit();
        console.log('Import completed !!!');
      } catch (error) {
        console.error('Error importing : ', error);
      }
    });
}
importData();