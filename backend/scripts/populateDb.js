const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Setup Firebase Admin
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const credential = serviceAccountJson
  ? admin.credential.cert(JSON.parse(serviceAccountJson))
  : process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? admin.credential.applicationDefault()
    : null;

if (!credential) {
  console.error('Firebase Admin not initialized: missing credentials in .env');
  process.exit(1);
}

admin.initializeApp({
  credential
});
const db = admin.firestore();

/**
 * Main function to populate Firestore
 */
async function populateDatabase() {
  console.log("Starting database population script...");

  try {
    // 1. Load data
    const constituencies = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/constituencies.json'), 'utf8'));
    const candidatesSinganallur = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/candidates_singanallur.json'), 'utf8'));
    const candidatesExtra = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/candidates_extra.json'), 'utf8'));

    console.log(`Processing ${constituencies.length} constituencies...`);

    for (const constituency of constituencies) {
      const constRef = db.collection('constituencies').doc(constituency.id);
      
      // Store names with lowercase version for case-insensitive lookup
      await constRef.set({ 
        name: constituency.name,
        nameLowercase: constituency.name.toLowerCase()
      });

      const batch = db.batch();
      let candidatesToSave = [];

      // Determine which candidates to save
      if (constituency.id === "33") {
        candidatesToSave = candidatesSinganallur;
      } else if (candidatesExtra[constituency.id]) {
        candidatesToSave = candidatesExtra[constituency.id];
      } else {
        // Fallback candidates for demo
        candidatesToSave = [
          { id: `${constituency.id}_1`, name: "S. Rajan", party: "AIADMK", education: "B.Tech", experience: "8 years", profession: "Business" },
          { id: `${constituency.id}_2`, name: "R. Kumar", party: "DMK", education: "MBA", experience: "5 years", profession: "Lawyer" },
          { id: `${constituency.id}_3`, name: "P. Selvam", party: "BJP", education: "M.A.", experience: "12 years", profession: "Social Worker" }
        ];
      }

      for (const candidate of candidatesToSave) {
        const candidateRef = constRef.collection('candidates').doc(candidate.id || candidate.candidate_id);
        const data = {
          name: candidate.name,
          party: candidate.party,
          ...(candidate.details || {})
        };
        // Add extra fields if they exist in the object directly
        if (candidate.education) data.education = candidate.education;
        if (candidate.experience) data.experience = candidate.experience;
        if (candidate.profession) data.profession = candidate.profession;
        
        batch.set(candidateRef, data);
      }

      await batch.commit();
      if (constituencies.indexOf(constituency) % 50 === 0) {
        console.log(`Progress: ${constituencies.indexOf(constituency)}/${constituencies.length}`);
      }
    }

    console.log("Database population completed successfully!");

  } catch (error) {
    console.error("Error populating database:", error);
  }
}

populateDatabase();



