const { bob } = require("bobtester");
const loginData = require("../data/login.json");

/**
 * Perform login using credentials defined in data/login.json
 * @param {string} accountKey - Key in login.json (e.g. 'standard_user', 'test')
 */
async function performLogin(accountKey = "standard_user") {
  // Find account by key, or find by username
  let account = loginData[accountKey];
  if (!account) {
    const found = Object.values(loginData).find(
      (u) => u.username === accountKey,
    );
    account = found || { username: accountKey, password: "secret_sauce" };
  }

  console.log(
    `\n🔑 [common.login] Starting login flow for: "${account.username}"...`,
  );

  await bob.goto("https://www.saucedemo.com");
  await bob.fill("#user-name", account.username);
  await bob.fill("#password", account.password);
  await bob.screenshot(`login_as_${accountKey}`);
  await bob.click("#login-button");
  await bob.waitForTimeout(500);

  if (
    accountKey === "locked_out_user" ||
    account.username === "locked_out_user"
  ) {
    await bob.expectVisible("[data-test='error']");
    console.log(
      `⚠️ [common.login] Verified locked_out error banner for: ${account.username}`,
    );
  } else {
    await bob.expectVisible(".inventory_list");
    console.log(
      `🎉 [common.login] Logged in successfully as: ${account.username}`,
    );
  }
}

// Build methods from login.json
const loginMethods = {};
Object.keys(loginData).forEach((key) => {
  loginMethods[key] = async () => performLogin(key);
});

// Callable as common.login('standard_user') or common.login.standard_user()
const login = new Proxy(
  Object.assign(
    async (key = "standard_user") => performLogin(key),
    loginMethods,
  ),
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === "string" && prop !== "then") {
        return async () => performLogin(prop);
      }
      return target[prop];
    },
  },
);

const common = {
  login,

  async logout() {
    console.log(`\n🚪 [common.logout] Starting logout flow...`);
    await bob.click("#react-burger-menu-btn");
    await bob.waitForTimeout(400);
    await bob.click("#logout_sidebar_link");
    await bob.waitForTimeout(500);
    await bob.expectVisible("#login-button");
    await bob.screenshot("logged_out");
    console.log(`🔒 [common.logout] Logged out successfully.`);
  },
};

module.exports = common;
