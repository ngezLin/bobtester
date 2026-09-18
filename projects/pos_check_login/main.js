const { bob } = require("bobtester");
const sub = require("../utils/SubCommon");

bob.run(async () => {
  await sub.login("standard_user");
  
  // Capture screenshot after logging in
  await bob.screenshot("logged_in");
  
  // Note: You must log out before you can log in as a different user!
  await sub.logout();

  await sub.login("test");
});
