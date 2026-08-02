const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("../service-account.json");

initializeApp({
  credential: cert(serviceAccount)
});

async function main() {
  const auth = getAuth();
  const user = await auth.getUserByEmail("twigscollective@gmail.com");

  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    role: "owner"
  });

  console.log("Admin role set for twigscollective@gmail.com");
}

main().catch(console.error);
