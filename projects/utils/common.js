const sub = require("./SubCommon");
const func = require("./FuncCommon");

/**
 * Common Facade - brings together SubCommon (actions) and FuncCommon (data helpers)
 */
const common = {
  sub,
  func,

  // Direct shortcuts
  login: sub.login,
  logout: () => sub.logout(),
};

module.exports = common;
