const { bob } = require('bobtester');

const common = {
  async login(datasetName = 'lalala1') {
    // Select active dataset for variable substitution
    bob.useDataset(datasetName);

    const target = bob.get('targetUrl') || 'https://www.saucedemo.com';
    await bob.goto(target);
    await bob.fill('#user-name', '[username]');
    await bob.fill('#password', '[password]');
    await bob.click('#login-button');
    await bob.waitForTimeout(500);
  },

  async logout() {
    await bob.click('#react-burger-menu-btn');
    await bob.waitForTimeout(400);
    await bob.click('#logout_sidebar_link');
    await bob.waitForTimeout(500);
  }
};

module.exports = common;
