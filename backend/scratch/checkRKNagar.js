const admin = require('firebase-admin');
const path = require('path');
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

async function checkData() {
  try {
    const name = "DR.RADHAKRISHNAN NAGAR";
    const snapshot = await db.collection('constituencies').where('nameLowercase', '==', name.toLowerCase()).get();
    
    if (snapshot.empty) {
      console.log('No constituency found with name:', name);
      return;
    }
    
    snapshot.forEach(async doc => {
      console.log('Found constituency:', doc.id, doc.data());
      const candidates = await db.collection('constituencies').doc(doc.id).collection('candidates').get();
      console.log(`Found ${candidates.size} candidates for ID ${doc.id}`);
      candidates.forEach(c => console.log(' - Candidate:', c.id, c.data().name));
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
