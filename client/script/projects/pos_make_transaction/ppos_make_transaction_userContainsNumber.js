const { runTest } = require("../../utils/playwright");
const common = require("../../utils/function/common");
const transactionMenu = require("../../utils/menu/transactionMenu");
const path = require("path");
const testData = require("../../../data/pos_make_transaction_userContainsNumber.json");

runTest(path.basename(__filename, ".js"), async (page) => {
  await common.login(page);

  // Automatically gets the name of THIS file (e.g. "pos_make_transaction_userLowerCase")
  const datasetName = path.basename(__filename, ".js");

  const checkoutData = Object.values(testData).find(
    (row) => row.status === "Active",
  );
  await transactionMenu.buySomething(page, checkoutData);

  await common.logout(page);
});
