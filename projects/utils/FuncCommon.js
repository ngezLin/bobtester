const loginData = require("../data/login.json");

/**
 * FuncCommon - Helper functions that retrieve or format data.
 */
class FuncCommon {
  /**
   * Get user credentials from login.json by key or username
   * @param {string} accountKey - e.g. "standard_user", "test", "hehe"
   * @returns {{ username: string, password: string }}
   */
  getUser(accountKey = "standard_user") {
    // 1. Direct match by key
    if (loginData[accountKey]) {
      return loginData[accountKey];
    }

    // 2. Fallback match by username property
    const found = Object.values(loginData).find((u) => u.username === accountKey);
    if (found) {
      return found;
    }

    // 3. Fallback default
    return { username: accountKey, password: "secret_sauce" };
  }

  /**
   * Get list of all available user keys in login.json
   * @returns {string[]}
   */
  getAllUserKeys() {
    return Object.keys(loginData);
  }
}

module.exports = new FuncCommon();
