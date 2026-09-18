const { bob } = require("bobtester");
const loginData = require("../data/login.json");

/**
 * SubCommon - Subroutines and action procedures (login, logout, etc.)
 */
class SubCommon {
  /**
   * Login subroutine
   * @param {string} accountKey - Key in login.json (e.g. "standard_user", "test", "locked_out_user")
   */
  async login(accountKey = "standard_user") {
    // Look up the account in login.json, or use a default if it doesn't exist
    const user = loginData[accountKey] || {
      username: accountKey,
      password: "secret_sauce",
    };

    await bob.goto("https://www.saucedemo.com");
    await bob.fill("#user-name", user.username);
    await bob.fill("#password", user.password);
    await bob.screenshot(`login_as_${accountKey}`);
    await bob.click("#login-button");
    await bob.waitForTimeout(500);
  }

  /**
   * Logout subroutine
   */
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
