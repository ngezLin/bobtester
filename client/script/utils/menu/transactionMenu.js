const { captureScreenshot } = require("../playwright");

class TransactionMenu {
  async buySomething(page, data) {
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    await captureScreenshot(page, "added_to_cart");

    // 3. Go to Cart
    await page.click(".shopping_cart_link");
    await page.locator(".cart_list").waitFor({ state: "visible" });
    await captureScreenshot(page, "cart_page");

    // 4. Proceed to Checkout
    await page.click('[data-test="checkout"]');
    await page.locator("#first-name").waitFor({ state: "visible" });

    // 5. Fill Checkout Information
    await page.fill("#first-name", data.firstName);
    await page.fill("#last-name", data.lastName);
    await page.fill("#postal-code", data.postalCode);
    await captureScreenshot(page, "checkout_info");

    // 6. Continue to Overview
    await page.click('[data-test="continue"]');
    await page.locator(".summary_info").waitFor({ state: "visible" });
    await captureScreenshot(page, "checkout_overview");

    // 7. Finish the Transaction
    await page.click('[data-test="finish"]');
    await page.locator(".complete-header").waitFor({ state: "visible" });
    await captureScreenshot(page, "transaction_complete");
  }
}

module.exports = new TransactionMenu();
