const { bob } = require('bobtester');
const common = require('../utils/common');
const something = require('../utils/something');

// Test 2: Multi-step Navigation and Cart Verification
bob.run(async () => {
  // 1. Authenticate with performance dataset
  await common.login('lalala_glitch');

  // 2. Add item to cart
  await something.addItemToCart();

  // 3. Verify item in cart screen
  await something.verifyCart();

  // 4. Capture screenshot
  await bob.screenshot('test2_cart_verified');

  // 5. Logout
  await common.logout();
});
