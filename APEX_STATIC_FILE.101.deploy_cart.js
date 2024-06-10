/*
**  ADD TO SHOPPING CART
*/
const cart_total_ele = document.querySelector("#cart-total");
let cart_total = 0;
let purchases =[];
document.querySelectorAll("button.buy").forEach((button) => {
    button.addEventListener("click", (e) => {
      cart_total+=Number(button.dataset.price);
      cart_total_ele.textContent = cart_total.toFixed(2) + " CHF";
      let purchase = purchases.find(purchase => purchase.name === button.dataset.name);
      if (!purchase) {
        purchases.push({name:button.dataset.name, price:button.dataset.price, currency:button.dataset.currency, quantity:0});
      }
      purchases.forEach(purchase => {
        if (purchase.name === button.dataset.name) {
            purchase.quantity = purchase.quantity + 1;
        }
      });
      console.log("purchases",purchases);
    });
});