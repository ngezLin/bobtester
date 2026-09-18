const { bob } = require("bobtester");

const common = {
  async login(datasetName = "lalala1") {
    console.log(`\n🔑 [common.login] Starting login flow...`);

    bob.useDataset(datasetName);

    const targetUrl = bob.get("targetUrl") || "https://www.saucedemo.com";
    await bob.goto(targetUrl);

    await bob.fill("#user-name", "[username]");
    await bob.fill("#password", "[password]");

    await bob.click("#login-button");
    await bob.waitForTimeout(500);

    await bob.expectVisible(".inventory_list");
    console.log(
      `🎉 [common.login] Logged in successfully as: ${bob.get("username")}`,
    );
  },

  async logout() {
    console.log(`\n🚪 [common.logout] Starting logout flow...`);
    await bob.click("#react-burger-menu-btn");
    await bob.waitForTimeout(400);
    await bob.click("#logout_sidebar_link");
    await bob.waitForTimeout(500);

    await bob.expectVisible("#login-button");
    console.log(`🔒 [common.logout] Logged out successfully.`);
  },
};

module.exports = common;
