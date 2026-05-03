const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const credential = serviceAccountJson
  ? admin.credential.cert(JSON.parse(serviceAccountJson))
  : process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? admin.credential.applicationDefault()
    : null;

if (!credential) {
  console.error('Firebase Admin not initialized: missing credentials');
  process.exit(1);
}

admin.initializeApp({ credential });
const db = admin.firestore();

async function populateRealData() {
  console.log("Starting real data population...");

  try {
    const constituencies = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/constituencies.json'), 'utf8'));
    const candidatesDetailsText = fs.readFileSync(path.join(__dirname, '../data/candidatesDetails'), 'utf8');

    // Parse candidatesDetails
    const lines = candidatesDetailsText.split('\n');
    const dataByConstituency = {};
    let currentConstituency = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('AC:')) {
        // Find the next line which should be the name
        currentConstituency = lines[i+1]?.trim().toLowerCase();
        if (currentConstituency) {
            dataByConstituency[currentConstituency] = [];
            i++; // skip name line
        }
      } else if (currentConstituency && line.length > 0 && !line.includes('Candidates Explorer') && !line.includes('Constituency View')) {
        // This might be a candidate name or a party
        // Pattern: Name, Gender, Party
        const name = line;
        const gender = lines[i+1]?.trim();
        const partyLine = lines[i+2]?.trim();
        const party = partyLine || 'Unknown';
        
        if (gender === 'M' || gender === 'F' || gender === 'TG') {
            dataByConstituency[currentConstituency].push({
                name,
                gender,
                party
            });
            i += 2; // skip gender and party
        }
      }
    }

    console.log(`Parsed data for ${Object.keys(dataByConstituency).length} constituencies from text file.`);

    // Mapping to constituencies.json
    let updatedCount = 0;
    const cleanName = (n) => n.toLowerCase().replace(/\(sc\)|\(st\)/g, '').replace(/[^a-z0-9]/g, '').trim();
    
    const textDataCleaned = {};
    Object.keys(dataByConstituency).forEach(k => {
      textDataCleaned[cleanName(k)] = dataByConstituency[k];
    });

    for (const constituency of constituencies) {
      const name = constituency.name.toLowerCase();
      const cName = cleanName(name);
      
      let candidates = textDataCleaned[cName];
      
      // Try mapping common variations
      if (!candidates) {
        if (cName.includes('radhakrishnan')) candidates = textDataCleaned['rknagar'];
        if (cName.includes('thiruvikanagar')) candidates = textDataCleaned['thiruvikanagar'];
      }

      if (candidates && candidates.length > 0) {
        const constRef = db.collection('constituencies').doc(constituency.id);
        const batch = db.batch();
        const existing = await constRef.collection('candidates').get();
        existing.forEach(doc => batch.delete(doc.ref));
        candidates.forEach((c, idx) => {
          const candRef = constRef.collection('candidates').doc(`${constituency.id}_c${idx}`);
          batch.set(candRef, { name: c.name, party: c.party, gender: c.gender });
        });
        await batch.commit();
        updatedCount++;
      }
    }

    console.log(`Success! Updated ${updatedCount} constituencies with real candidate data.`);

  } catch (error) {
    console.error("Error:", error);
  }
}

populateRealData();
