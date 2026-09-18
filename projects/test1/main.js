const { bob } = require('bobtester');
const common = require('../utils/common');

// ==========================================================
// Test 1: Simple Login & Logout Reference Flow
// ==========================================================
bob.run(async () => {
  console.log("▶ Step 1: Performing login using common.login('lalala1')...");
  await common.login('lalala1');

  console.log("▶ Step 2: Taking screenshot while logged in...");
  await bob.screenshot('logged_in_dashboard');

  console.log("▶ Step 3: Performing logout using common.logout()...");
  await common.logout();
});
