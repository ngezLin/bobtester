const { captureScreenshot } = require("../playwright");

class CommonFunctions {
  async login(page, username = "standard_user", password = "secret_sauce") {
    await page.goto("https://www.saucedemo.com");
    await page.fill("#user-name", username);
    await page.fill("#password", password);
    await captureScreenshot(page, `login_as_${username}`);
    await page.click("#login-button");
    await page.locator(".inventory_list").waitFor({ state: "visible" });
  }

  async login2(page, data) {
    await page.goto(data.targetUrl || "https://www.saucedemo.com/");
    await page.fill("[data-test='username']", data.username);
    await page.fill("[data-test='password']", data.password);
    await page.click("[data-test='login-button']");
    await page.locator(".inventory_list").waitFor({ state: "visible" });
  }

  async logout(page) {
    await page.click("#react-burger-menu-btn");
    await page.waitForTimeout(400);
    await page.click("#logout_sidebar_link");
    await page.locator("#login-button").waitFor({ state: "visible" });
    await captureScreenshot(page, "logged_out");
  }
}

module.exports = new CommonFunctions();
