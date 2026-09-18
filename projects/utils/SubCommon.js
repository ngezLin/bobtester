const { bob } = require("bobtester");
const loginData = require("../data/login.json");

class SubCommon {
  async login(accountKey = "standard_user") {
    const user = loginData[accountKey];
    await bob.goto("https://www.saucedemo.com");
    await bob.fill("#user-name", user.username);
    await bob.fill("#password", user.password);
    await bob.screenshot(`login_as_${accountKey}`);
    await bob.click("#login-button");
    await bob.expectVisible(".inventory_list");
  }

  async logout() {
    await bob.click("#react-burger-menu-btn");
    await bob.waitForTimeout(400);
    await bob.click("#logout_sidebar_link");
    await bob.waitForTimeout(500);
    await bob.expectVisible("#login-button");
    await bob.screenshot("logged_out");
  }
}

const subCommon = new SubCommon();

module.exports = subCommon;
