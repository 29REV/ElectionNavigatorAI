const admin = require('firebase-admin');
require('dotenv').config();

let db = null;

function initializeFirebase() {
  if (db || admin.apps.length) {
    return;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let credential;

    if (serviceAccountJson) {
      credential = admin.credential.cert(JSON.parse(serviceAccountJson));
    } else {
      // On Cloud Run, this will automatically use the default service account
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
      credential
    });
    db = admin.firestore();
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    db = null;
    console.error('Firebase Admin initialization error', error);
  }
}

function getDatabase() {
  initializeFirebase();
  return db;
}

/**
 * Fetch a constituency by its name.
 */
async function getConstituency(name) {
  try {
    const database = getDatabase();

    if (!database) {
      return { success: false, message: 'Firebase is not configured' };
    }

    const constRef = database.collection('constituencies');
    const snapshot = await constRef.where('nameLowercase', '==', name.toLowerCase()).get();
    
    if (snapshot.empty) {
      return { success: false, message: `No data available for constituency: ${name}` };
    }
    
    // Assuming one document matches the name
    let data = null;
    snapshot.forEach(doc => {
      data = { id: doc.id, ...doc.data() };
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching constituency:', error);
    return { success: false, message: "Error fetching constituency data" };
  }
}

/**
 * Fetch candidates for a given constituency ID.
 */
async function getCandidates(constituencyId) {
  try {
    const database = getDatabase();
    const id = String(constituencyId);

    if (!database) {
      return { success: false, message: 'Firebase is not configured' };
    }

    console.log(`[Firebase] Fetching candidates for ID: ${id}`);
    const candidatesRef = database.collection('constituencies').doc(id).collection('candidates');
    const snapshot = await candidatesRef.get();
    
    if (snapshot.empty) {
      console.warn(`[Firebase] No candidates found for constituency ID: ${id}`);
      return { success: false, message: `No candidates found for constituency ID: ${id}. Please verify the ID.` };
    }
    
    const candidates = [];
    snapshot.forEach(doc => {
      candidates.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`[Firebase] Found ${candidates.length} candidates for ID: ${id}`);
    return { success: true, data: candidates };
  } catch (error) {
    console.error(`[Firebase] Error fetching candidates for ID ${constituencyId}:`, error);
    return { success: false, message: `Internal database error: ${error.message}` };
  }
}

/**
 * Fetch detailed information for a specific candidate.
 */
async function getCandidateDetails(candidateId, constituencyId) {
    try {
    const database = getDatabase();

    if (!database) {
      return { success: false, message: 'Firebase is not configured' };
    }

        // We might need to query across all subcollections if constituencyId is missing,
        // but it's much better if we have it.
        if(constituencyId) {
      const candidateRef = database.collection('constituencies').doc(constituencyId).collection('candidates').doc(candidateId);
            const doc = await candidateRef.get();
            if (!doc.exists) {
                return { success: false, message: 'Candidate details not found' };
            }
            return { success: true, data: { id: doc.id, ...doc.data() } };
        } else {
             // Fallback: search all candidates subcollections using a collection group query
             // Requires an index in Firestore
       const candidatesRef = database.collectionGroup('candidates');
             // we'll try to match by name as a fallback since id might not be globally unique across group queries easily without knowing the path
             // But actually, document ID can be queried using FieldPath.documentId()
             // However, to keep it simple, we'll assume we pass constituencyId most of the time.
             
             return { success: false, message: 'Please provide constituencyId to fetch candidate details accurately.' };
        }
        
    } catch (error) {
        console.error('Error fetching candidate details:', error);
        return { success: false, message: "Error fetching candidate details" };
    }
}

module.exports = {
  getConstituency,
  getCandidates,
  getCandidateDetails
};
