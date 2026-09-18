const path = require("path");
const fs = require("fs");
const { bob } = require("bobtester");

/**
 * Load datasets directly from datasets.json for dynamic method binding
 */
function loadDatasetsMap() {
  try {
    const p = path.resolve(__dirname, "../data/datasets.json");
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch (_) {}
  return {};
}

/**
 * Perform login using a specified dataset name / user profile.
 * @param {string} datasetName - Name of the dataset in datasets.json
 */
async function performLogin(datasetName = "standard_user") {
  console.log(`\n🔑 [common.login] Starting login flow with user: "${datasetName}"...`);

  // Activate the dataset in bob
  bob.useDataset(datasetName);

  await bob.goto("https://www.saucedemo.com");

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

// Build methods dynamically from all datasets in datasets.json
const datasetEntries = loadDatasetsMap();
const staticMethods = {};

Object.entries(datasetEntries).forEach(([dName, dData]) => {
  staticMethods[dName] = async () => performLogin(dName);
  // Also register by username if different from dataset name (e.g. dataset 'test' with username 'hehe')
  if (dData && dData.username && dData.username !== dName) {
    staticMethods[dData.username] = async () => performLogin(dName);
  }
});

// Function callable as both common.login('standard_user') AND common.login.standard_user()
const baseLogin = Object.assign(
  async (userType = "standard_user") => performLogin(userType),
  staticMethods
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
