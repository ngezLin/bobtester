const { bob } = require("bobtester");
const sub = require("../utils/SubCommon");

bob.run(async () => {
  await sub.login.standard_user();
  await bob.screenshot("logged_in_dashboard");
  await sub.logout();
});
