const admin = require("firebase-admin");
const serviceAccount = require("../service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function main() {
  const user = await admin.auth().getUserByEmail("twigscollective@gmail.com");

  await admin.auth().setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    role: "owner"
  });

  console.log("Admin role set for twigscollective@gmail.com");
}

main().catch(console.error);