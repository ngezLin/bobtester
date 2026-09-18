const { bob } = require('bobtester');

const common = {
  /**
   * Reusable Login function
   * - Uses dataset (defaults to 'lalala1')
   * - Fills username and password
   * - Clicks login button
   */
  async login(datasetName = 'lalala1') {
    console.log(`\n🔑 [common.login] Starting login flow...`);

    // 1. Activate dataset 'lalala1'
    bob.useDataset(datasetName);

    // 2. Open login page
    const targetUrl = bob.get('targetUrl') || 'https://www.saucedemo.com';
    await bob.goto(targetUrl);

    // 3. Fill credentials from active dataset [username] & [password]
    await bob.fill('#user-name', '[username]');
    await bob.fill('#password', '[password]');

    // 4. Click login button
    await bob.click('#login-button');
    await bob.waitForTimeout(500);

    // 5. Verify successful login
    await bob.expectVisible('.inventory_list');
    console.log(`🎉 [common.login] Logged in successfully as: ${bob.get('username')}`);
  },

  /**
   * Reusable Logout function
   * - Clicks burger menu
   * - Clicks logout link
   * - Verifies returned to login screen
   */
  async logout() {
    console.log(`\n🚪 [common.logout] Starting logout flow...`);
    await bob.click('#react-burger-menu-btn');
    await bob.waitForTimeout(400);
    await bob.click('#logout_sidebar_link');
    await bob.waitForTimeout(500);

    // Verify back to login button
    await bob.expectVisible('#login-button');
    console.log(`🔒 [common.logout] Logged out successfully.`);
  }
};

module.exports = common;
