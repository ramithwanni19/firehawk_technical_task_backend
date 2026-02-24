const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { json2csv } = require("json-2-csv");

admin.initializeApp();
const db = admin.firestore();

exports.exportCarsCSV = onRequest({ cors: true }, async (req, res) => {
  try {
    const snapshot = await db.collection("cars").get();
    const carData = snapshot.docs.map((doc) => doc.data());

    if (carData.length === 0) {
      return res.status(404).send("No data found.");
    }
    const csv = json2csv(carData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=cars_backup.csv"
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("Export Error:", error);
    return res.status(500).send("Error: " + error.message);
  }
});
