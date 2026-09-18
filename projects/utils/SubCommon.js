const { bob } = require("bobtester");
const funcCommon = require("./FuncCommon");

/**
 * SubCommon - Subroutines and action procedures (login, logout, etc.)
 */
class SubCommon {
  /**
   * Login subroutine
   * @param {string} accountKey - Key in login.json (e.g. "standard_user", "test", "locked_out_user")
   */
  async login(accountKey = "standard_user") {
    const user = funcCommon.getUser(accountKey);

    console.log(`\n🔑 [SubCommon.login] Starting login flow for: "${user.username}"...`);

    await bob.goto("https://www.saucedemo.com");
    await bob.fill("#user-name", user.username);
    await bob.screenshot(`login_as_${accountKey}`);
    await bob.fill("#password", user.password);
    await bob.click("#login-button");
    await bob.waitForTimeout(500);

    if (accountKey === "locked_out_user" || user.username === "locked_out_user") {
      await bob.expectVisible("[data-test='error']");
      console.log(`⚠️ [SubCommon.login] Verified locked_out error banner`);
    } else {
      await bob.expectVisible(".inventory_list");
      console.log(`🎉 [SubCommon.login] Logged in successfully as: ${user.username}`);
    }
  }

  /**
   * Logout subroutine
   */
  async logout() {
    console.log(`\n🚪 [SubCommon.logout] Starting logout flow...`);
    await bob.click("#react-burger-menu-btn");
    await bob.waitForTimeout(400);
    await bob.click("#logout_sidebar_link");
    await bob.waitForTimeout(500);
    await bob.expectVisible("#login-button");
    await bob.screenshot("logged_out");
    console.log(`🔒 [SubCommon.logout] Logged out successfully.`);
  }
}

const subCommon = new SubCommon();

// Attach shortcuts so both await sub.login('standard_user') and await sub.login.standard_user() work
const boundLogin = subCommon.login.bind(subCommon);
boundLogin.standard_user = () => subCommon.login("standard_user");
boundLogin.locked_out_user = () => subCommon.login("locked_out_user");
boundLogin.problem_user = () => subCommon.login("problem_user");
boundLogin.performance_glitch_user = () => subCommon.login("performance_glitch_user");
boundLogin.error_user = () => subCommon.login("error_user");
boundLogin.visual_user = () => subCommon.login("visual_user");
boundLogin.test = () => subCommon.login("test");
boundLogin.hehe = () => subCommon.login("hehe");

subCommon.login = boundLogin;

module.exports = subCommon;
