const path = require("path");
const { runTest } = require("../../utils/playwright");
const { runActiveRows } = require("../../utils/function/runner");
const common = require("../../utils/function/common");
const transactionMenu = require("../../utils/menu/transactionMenu");

const testName = path.basename(__filename, ".js");
const testData = require(`../../../data/${testName}.json`);

runTest(testName, async (page) => {
  await runActiveRows(testName, testData, async (rowData) => {
    await common.login(page);
    await transactionMenu.buySomething(page, rowData);
    await common.logout(page);
  });
});
