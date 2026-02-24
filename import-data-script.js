const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function uploadCSV() {
  const results = [];

  fs.createReadStream("Automobile.csv")
    .pipe(csv())
    .on("data", (data) => {
      const cleanData = {};
      Object.keys(data).forEach((key) => {
        cleanData[key.trim()] = data[key] ? data[key].trim() : "";
      });
      results.push(cleanData);
    })
    .on("end", async () => {
      console.log(`${results.length} Starting import...`);

      const batchSize = 400;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = db.batch();
        const chunk = results.slice(i, i + batchSize);

        chunk.forEach((car) => {
          const docRef = db.collection("cars").doc();

          const fullName = (car.name || "unknown").trim();
          const nameParts = fullName.split(" ");
          const make = nameParts[0] || "Unknown";
          const model = nameParts.slice(1).join(" ") || "Unknown";

          const toNum = (val) => {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
          };

          batch.set(docRef, {
            make: make.charAt(0).toUpperCase() + make.slice(1),
            model: model.charAt(0).toUpperCase() + model.slice(1),
            mpg: toNum(car.mpg),
            cylinders: Math.floor(toNum(car.cylinders)),
            displacement: toNum(car.displacement),
            horsepower: toNum(car.horsepower),
            weight: toNum(car.weight),
            acceleration: toNum(car.acceleration),
            model_year: 1900 + toNum(car.model_year),
            origin: car.origin || "Unknown",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        try {
          await batch.commit();
          console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}`);
        } catch (err) {
          console.error("Batch commit failed: ", err);
        }
      }

      console.log("Completed uploading successfully.");
      process.exit();
    });
}

uploadCSV();
