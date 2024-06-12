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
        const url = e.target.parentElement.querySelector("img").src;
        purchases.push({url:url,name:button.dataset.name, price:button.dataset.price, currency:button.dataset.currency, quantity:0});
      }
      purchases.forEach(purchase => {
        if (purchase.name === button.dataset.name) {
            purchase.quantity = Number(purchase.quantity) + 1;
        }
      });
    });
});

const cart_items = document.getElementById("cart-items"); /* dialog to contain current purchases */

document.getElementById("cart-show").addEventListener("click",() => {
  if (cart_total===0) return;
  
  let items = "<table>";
  purchases.forEach(purchase => {
    items += `<tr><td rowspan="2"><img src="${purchase.url}"></td><td>${purchase.name}<button type="button" class="delete" data-name="${purchase.name}"><svg><use href="#delete"></use></svg></button></td></tr>`;
    items += `<tr><td><span>${purchase.price} ${purchase.currency}</span><input type="number" name="quantity" min="1" max="20" step="1" value="${purchase.quantity}" data-name="${purchase.name}" data-price="${purchase.price}"></td></tr>`;
  });
  items += "</table>";
  const content = cart_items.querySelector("div");
  content.replaceChildren();
  content.insertAdjacentHTML('afterbegin',items);
  cart_items.showModal();
});

const changeHandler = (e) => {
  const name = e.target.dataset.name;
  cart_total = 0;
  purchases.forEach(purchase => {
    if (purchase.name === name) {
      purchase.quantity = e.target.value;
    }
    cart_total+=Number(purchase.price)*Number(purchase.quantity);
  });
  cart_total_ele.textContent = cart_total.toFixed(2) + " CHF";
}

const deleteHandler = (e) => {
  if (!e.target.matches(".delete")) return;
  
    /* remove item from UI */
    const tr1 = e.target.closest("tr"),
          tr2 = tr1.nextElementSibling;
    tr1.remove();
    tr2.remove();
  
     /* remove item from array*/
    
    purchases.forEach((purchase,i) => {
      if (purchase.name === e.target.dataset.name) {
        purchases.splice(i, 1);
      }
    });
    cart_total = 0;
    purchases.forEach((purchase,i) => {
      cart_total+=Number(purchase.price)*Number(purchase.quantity);
    });
  
    cart_total_ele.textContent = cart_total.toFixed(2) + " CHF";
    if (cart_total===0) {
      cart_items.close();
    }
}

cart_items.addEventListener("change",changeHandler);
cart_items.addEventListener("click",deleteHandler);