const { bob } = require("bobtester");
const path = require("path");
const { runActiveRows } = require("../../utils/function/runner");
const common = require("../../utils/function/common");
const transactionMenu = require("../../utils/menu/transactionMenu");

const testName = path.basename(__filename, ".js");
const testData = require(`../../../data/${testName}.json`);

bob.run(async () => {
  await runActiveRows(testName, testData, async (datasetKey) => {
    await common.login();
    await transactionMenu.buySomething(datasetKey);
    await common.logout();
  });
});
