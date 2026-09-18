const { bob } = require("bobtester");

/**
 * @typedef {'standard_user' | 'locked_out_user' | 'problem_user' | 'performance_glitch_user' | 'error_user' | 'visual_user'} SauceUser
 */

/**
 * Perform login using a specified dataset name / user profile.
 * @param {string} datasetName - Name of the dataset in datasets.json
 */
async function performLogin(datasetName = "standard_user") {
  console.log(`\n🔑 [common.login] Starting login flow with user: "${datasetName}"...`);

  // Activate the dataset in bob
  bob.useDataset(datasetName);

  const targetUrl = bob.get("targetUrl") || "https://www.saucedemo.com";
  await bob.goto(targetUrl);

  await bob.fill("#user-name", "[username]");
  await bob.screenshot(`login_as_${datasetName}`);
  await bob.fill("#password", "[password]");
  await bob.click("#login-button");
  await bob.waitForTimeout(500);

  if (datasetName === "locked_out_user") {
    await bob.expectVisible("[data-test='error']");
    console.log(`⚠️ [common.login] Verified locked_out error banner for: ${datasetName}`);
  } else {
    await bob.expectVisible(".inventory_list");
    console.log(
      `🎉 [common.login] Logged in successfully as: ${bob.get("username")}`,
    );
  }
}

// Function callable as both common.login('standard_user') AND common.login.standard_user()
const baseLogin = Object.assign(
  /**
   * Log into SauceDemo
   * @param {SauceUser} [userType='standard_user']
   */
  async (userType = "standard_user") => performLogin(userType),
  {
    standard_user: async () => performLogin("standard_user"),
    locked_out_user: async () => performLogin("locked_out_user"),
    problem_user: async () => performLogin("problem_user"),
    performance_glitch_user: async () => performLogin("performance_glitch_user"),
    error_user: async () => performLogin("error_user"),
    visual_user: async () => performLogin("visual_user"),
  }
);

// Proxy allows dynamic dataset names as functions too: common.login.any_dataset_name()
const login = new Proxy(baseLogin, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop === "string" && prop !== "then") {
      return async () => performLogin(prop);
    }
    return target[prop];
  },
});

const common = {
  login,

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
