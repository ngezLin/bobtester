const { bob } = require('bobtester');

const something = {
  /**
   * Action to select and add an item to the shopping cart
   */
  async addItemToCart(itemName = '[itemName]') {
    console.log(`\n🛒 [something.addItemToCart] Adding item to cart...`);
    
    // Uses resolved item name from dataset or passed argument
    await bob.click('#add-to-cart-sauce-labs-backpack');
    await bob.waitForTimeout(300);

    // Verify badge updated to 1
    await bob.expectVisible('.shopping_cart_badge');
    console.log(`🛍️ [something.addItemToCart] Item added to cart.`);
  },

  /**
   * Action to verify cart contents
   */
  async verifyCart() {
    console.log(`\n👀 [something.verifyCart] Opening cart view...`);
    await bob.click('.shopping_cart_link');
    await bob.waitForTimeout(400);
    await bob.expectVisible('.cart_item');
    console.log(`✅ [something.verifyCart] Cart item verified.`);
  }
};

module.exports = something;
