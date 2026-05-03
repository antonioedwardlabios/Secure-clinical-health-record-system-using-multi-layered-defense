const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// ====================== AUTHORIZED EMAILS ======================
// Add new emails here easily ↓
const ALLOWED_EMAILS = [
  "anja.labios.ui@phinmaed.com",
  "antonioedwardlabios841@gmail.com"
  // ← Add new emails here (one per line)
].map(email => email.toLowerCase().trim());
// ================================================================

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "No token provided" })
      };
    }
    
    const token = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    
    const userEmail = decoded.email ? decoded.email.toLowerCase().trim() : null;
    
    console.log("🔐 Decoded email:", userEmail); // For debugging in Netlify logs
    
    if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
      console.log("❌ Unauthorized access attempt by:", userEmail);
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Unauthorized",
          message: `Email not authorized: ${userEmail}`
        })
      };
    }
    
    // ====================== ADD PATIENT ======================
    const data = JSON.parse(event.body);
    
    const docRef = await db.collection("patients").add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      addedBy: decoded.email, // Save original casing for display
      addedByLower: userEmail // For easier querying if needed
    });
    
    console.log(`✅ Patient added successfully by ${userEmail}, ID: ${docRef.id}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        id: docRef.id
      })
    };
    
  } catch (err) {
    console.error("💥 Error in addPatient function:", err.message);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: err.message
      })
    };
  }
};