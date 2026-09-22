const path = require("path");
const { runTest } = require("../../utils/playwright");
const { runActiveRows } = require("../../utils/function/runner");
const transactionMenu = require("../../utils/menu/transactionMenu");

const testName = path.basename(__filename, ".js");
const testData = require(`../../../data/${testName}.json`);

runTest(testName, async (page) => {
  await runActiveRows(testName, testData, async (rowData) => {
    await page.goto("https://www.saucedemo.com");
    await page.fill("#user-name", "standard_user");
    await page.fill("#password", "secret_sauce");
    await page.click("#login-button");
    await page.waitForSelector(".inventory_list", { state: "visible" });

    await transactionMenu.buySomething(page, rowData);

    await page.click("#react-burger-menu-btn");
    await page.waitForTimeout(400);
    await page.click("#logout_sidebar_link");
    await page.waitForSelector("#login-button", { state: "visible" });
  });
});
