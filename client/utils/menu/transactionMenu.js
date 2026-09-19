const { bob } = require("bobtester");

class TransactionMenu {
  async buySomething(checkoutDatasetName = "default_checkout") {
    // Switch to the specific checkout data we want to test
    bob.useDataset(checkoutDatasetName);

    // 2. Add an item to the cart
    await bob.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    await bob.screenshot("added_to_cart");
    
    // 3. Go to Cart
    await bob.click(".shopping_cart_link");
    await bob.expectVisible(".cart_list");
    await bob.screenshot("cart_page");
    
    // 4. Proceed to Checkout
    await bob.click('[data-test="checkout"]');
    await bob.expectVisible("#first-name");
    
    // 5. Fill Checkout Information
    await bob.fill("#first-name", "[firstName]");
    await bob.fill("#last-name", "[lastName]");
    await bob.fill("#postal-code", "[postalCode]");
    await bob.screenshot("checkout_info");
    
    // 6. Continue to Overview
    await bob.click('[data-test="continue"]');
    await bob.expectVisible(".summary_info");
    await bob.screenshot("checkout_overview");
    
    // 7. Finish the Transaction
    await bob.click('[data-test="finish"]');
    await bob.expectVisible(".complete-header");
    await bob.screenshot("transaction_complete");
  }
}

module.exports = new TransactionMenu();
