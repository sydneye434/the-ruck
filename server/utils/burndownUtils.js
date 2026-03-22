// Developed by Sydney Edwards
// Bridge for CommonJS consumers — implementations live in @the-ruck/shared (burndownUtils.ts).
const shared = require("@the-ruck/shared");

module.exports = {
  calculateIdealBurndown: shared.calculateIdealBurndown,
  calculateProjectedCompletion: shared.calculateProjectedCompletion,
  listWorkingDaysInRange: shared.listWorkingDaysInRange,
  formatLocalDateYmd: shared.formatLocalDateYmd,
  burndownProgressSCurve: shared.burndownProgressSCurve
};
