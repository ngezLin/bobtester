const { bob } = require('bobtester');
const common = require('../utils/common');
const something = require('../utils/something');

// Test 1: Full Authentication and Catalog Flow
bob.run(async () => {
  // 1. Reusable Login (uses dataset 'lalala1' by default)
  await common.login('lalala1');

  // 2. Perform business action
  await something.addItemToCart();

  // 3. Capture evidence screenshot
  await bob.screenshot('test1_cart_added');

  // 4. Clean Logout
  await common.logout();
});
