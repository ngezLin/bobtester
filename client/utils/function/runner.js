const { bob } = require("bobtester");
const path = require("path");

/**
 * Loops through all rows in a test's JSON data file,
 * skips "Inactive" rows, injects active rows into the framework,
 * and calls your test function for each active row.
 *
 * @param {string} testName  - The test file name (without .js), used as the data key prefix
 * @param {object} testData  - The parsed JSON object (e.g. { "1": {...}, "2": {...} })
 * @param {function} testFn  - Async function that receives the uniqueDatasetKey for each active row
 */
async function runActiveRows(testName, testData, testFn) {
  for (const [rowId, rowData] of Object.entries(testData)) {
    if (rowData.status === "Active") {
      console.log(`\n[Runner] ${testName} — Row ${rowId}`);

      // Inject this row into the framework's dataset memory with a unique key
      const uniqueDatasetKey = `${testName}_row${rowId}`;
      bob.datasetManager.getAllDatasets()[uniqueDatasetKey] = rowData;

      // Run the caller's test logic for this row
      await testFn(uniqueDatasetKey);
    } else {
      console.log(`\n[Runner] Skipping inactive row: ${rowId}`);
    }
  }
}

module.exports = { runActiveRows };
