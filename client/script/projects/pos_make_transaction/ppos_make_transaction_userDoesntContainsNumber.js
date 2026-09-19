const { bob } = require("bobtester");
const common = require("../../utils/function/common");
const transactionMenu = require("../../utils/menu/transactionMenu");
const path = require("path");

bob.run(async () => {
  await common.login();

  // Automatically gets the name of THIS file (e.g. "pos_make_transaction_userLowerCase")
  const datasetName = path.basename(__filename, ".js");

  await transactionMenu.buySomething(datasetName);

  await common.logout();
});
