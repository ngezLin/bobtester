const { bob } = require("bobtester");
const common = require("../utils/common");

bob.run(async () => {
  await common.login.standard_user();
  await bob.screenshot("logged_in_dashboard");
  await common.logout();
});
