const { bob } = require('bobtester');

const common = {
  /**
   * Common Login routine
   * Sets active dataset (e.g. 'lalala1') and executes authenticated login
   */
  async login(datasetName = 'lalala1') {
    console.log(`\n🔑 [common.login] Initializing login flow...`);

    // 1. Activate dataset 'lalala1'
    bob.useDataset(datasetName);

    // 2. Navigate to target URL (auto-interpolated if using '[targetUrl]')
    const url = bob.get('targetUrl') || 'https://www.saucedemo.com';
    await bob.goto(url);

    // 3. Fill credentials using '[variable]' tokens resolved from the active dataset
    await bob.fill('#user-name', '[username]');
    await bob.fill('#password', '[password]');

    // 4. Click login submit button
    await bob.click('#login-button');
    await bob.waitForTimeout(500);

    // 5. Verify successful navigation into dashboard/catalog
    await bob.expectVisible('.inventory_list');
    console.log(`🎉 [common.login] Successfully logged in as: ${bob.get('username')}`);
  },

  /**
   * Common Logout routine
   * Safely clears session and returns to login screen
   */
  async logout() {
    console.log(`\n🚪 [common.logout] Initiating logout...`);
    await bob.click('#react-burger-menu-btn');
    await bob.waitForTimeout(400);
    await bob.click('#logout_sidebar_link');
    await bob.waitForTimeout(500);
    await bob.expectVisible('#login-button');
    console.log(`🔒 [common.logout] Session closed successfully.`);
  }
};

module.exports = common;
