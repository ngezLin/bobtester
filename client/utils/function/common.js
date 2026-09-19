const { bob } = require("bobtester");

class CommonFunctions {
  async login(username = "standard_user", password = "secret_sauce") {
    await bob.goto("https://www.saucedemo.com");
    await bob.fill("#user-name", username);
    await bob.fill("#password", password);
    await bob.screenshot(`login_as_${username}`);
    await bob.click("#login-button");
    await bob.expectVisible(".inventory_list");
  }

  async login2(datasetName = 'login2') {
    bob.useDataset(datasetName);
    await bob.goto('https://www.saucedemo.com/');
    await bob.fill("[data-test='username']", '[username]');
    await bob.fill("[data-test='password']", '[password]');
    await bob.click("[data-test='login-button']");
    await bob.waitForTimeout(500);
    await bob.expectVisible('.inventory_list');
    await bob.click('#react-burger-menu-btn');
    await bob.waitForTimeout(500);
    await bob.click('#react-burger-menu-btn');
    await bob.waitForTimeout(400);
    await bob.click('#logout_sidebar_link');
    await bob.waitForTimeout(500);
  }
 
  async logout() {
    await bob.click("#react-burger-menu-btn");
    await bob.page.then((p) => p.waitForTimeout(400));
    await bob.click("#logout_sidebar_link");
    await bob.expectVisible("#login-button");
    await bob.screenshot("logged_out");
  }
}

module.exports = new CommonFunctions();
