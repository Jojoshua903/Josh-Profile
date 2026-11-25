// SuperMaxx online play uses Firebase (Anonymous Auth + Realtime Database).
// Paste the config object from Firebase console > Project settings > Your apps > Web app.
// It MUST include databaseURL. These keys are safe to publish; access is controlled by
// the database rules in database.rules.json. Leave as null to keep online play switched off.

const API_KEY = 'AIzaSyAdAH3uSp3amb9poKAr4iv7jfzBH9QFgCU';   // Project settings > Your apps > Config > apiKey ("AIza...")

export const FIREBASE_CONFIG = API_KEY.startsWith('AIza') ? {
  apiKey: API_KEY,
  authDomain: 'supermaxx-4c106.firebaseapp.com',
  databaseURL: 'https://supermaxx-4c106-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'supermaxx-4c106',
  appId: '1:447728745240:web:40fbbe7e60990fd84efc6d',
} : null;
/* Example:
export const FIREBASE_CONFIG = {
  apiKey: 'AIza...',
  authDomain: 'your-project.firebaseapp.com',
  databaseURL: 'https://your-project-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'your-project',
  appId: '1:1234567890:web:abc123',
};
*/

// Firebase web SDK version loaded from Google's CDN.
export const FIREBASE_VERSION = '13.4.0';
