/* ========== SMARTSHOP CUSTOM MERGED VERSION ========== */

const $ = (id) => document.getElementById(id);

let cart = [];
let allProducts = [];
let currentCategory = "all";
let couponApplied = false;
let balance = Number(localStorage.getItem("balance")) || 1000;

const LIMIT_MESSAGE = "Warning: Total price exceeds your balance! Please add money.";


/* ---------- NAVBAR & MOBILE MENU ---------- */

$("menu-btn").onclick = () => $("menu").classList.toggle("max-md:hidden");

const navLinks = document.querySelectorAll("#menu a");
const siteSections = document.querySelectorAll("section");

window.addEventListener("scroll", () => {
  let activeSection = "home";
  siteSections.forEach((sec) => {
    if (window.scrollY >= sec.offsetTop - 100) activeSection = sec.id;
  });
  navLinks.forEach((link) => {
    link.dataset.active = link.getAttribute("href") === "#" + activeSection;
  });
  $("back-to-top").classList.toggle("hidden", window.scrollY <= 300);
});

$("back-to-top").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

/* View Cart Button Animation */
$("view-cart").onclick = () => {
  $("cart").scrollIntoView({ behavior: "smooth", block: "start" });
  $("cart").classList.add("ring-4", "ring-orange-500");
  setTimeout(() => $("cart").classList.remove("ring-4", "ring-orange-500"), 1000);
};


/* ---------- BANNER CAROUSEL ---------- */

function initCarousel(totalSlides, showFn, prevBtnId, nextBtnId, timeDelay) {
  let index = 0;
  const moveSlide = (step) => {
    index = (index + step + totalSlides) % totalSlides;
    showFn(index);
  };
  $(prevBtnId).onclick = () => moveSlide(-1);
  $(nextBtnId).onclick = () => moveSlide(1);
  setInterval(() => moveSlide(1), timeDelay);
  showFn(0);
}

const bannerImages = document.querySelectorAll("#slider img");
initCarousel(bannerImages.length, (i) => {
  bannerImages.forEach((img, idx) => img.classList.toggle("hidden", idx !== i));
}, "prev-slide", "next-slide", 3500);


/* ---------- BALANCE SYSTEM ---------- */

function refreshBalance() {
  $("balance").textContent = balance;
  localStorage.setItem("balance", balance);
}

$("add-money").onclick = () => {
  balance += 1000;
  refreshBalance();
  $("warning").textContent = "";
};

refreshBalance();


/* ---------- PRODUCTS & CATEGORIES ---------- */

fetch("https://fakestoreapi.com/products")
  .then((response) => response.json())
  .then((data) => {
    allProducts = data;
    buildCategoryButtons();
    filterAndDisplayProducts();
  })
  .catch(() => {
    $("product-list").innerHTML = "<p class='text-red-600'>Failed to load products from server.</p>";
  });

function renderProductCards(productList) {
  $("product-list").innerHTML = productList.length ? "" : "<p>No products found matching your search.</p>";

  productList.forEach((product) => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow p-4 flex flex-col";
    card.innerHTML = `
      <img class="w-full h-40 object-contain" src="${product.image}" alt="${product.title}">
      <h3 class="text-sm font-bold flex-1 my-3">${product.title}</h3>
      <p class="text-teal-700 font-bold my-1">${product.price * 10} BDT</p>
      <p class="my-1 text-sm text-slate-500">Rating: ${product.rating.rate} (${product.rating.count})</p>
      <button class="bg-teal-700 text-white px-3 py-2 rounded-md hover:opacity-85 mt-2">Add to Cart</button>
    `;
    card.querySelector("button").onclick = () => modifyQuantity(product, 1);
    $("product-list").appendChild(card);
  });
}

function buildCategoryButtons() {
  const categories = ["all", ...new Set(allProducts.map((p) => p.category))];
  $("category-box").innerHTML = "";
  
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.dataset.active = cat === currentCategory;
    btn.className = "px-3 py-1.5 rounded-full border border-teal-700 text-teal-700 capitalize data-[active=true]:bg-teal-700 data-[active=true]:text-white";
    
    btn.onclick = () => {
      currentCategory = cat;
      document.querySelectorAll("#category-box button").forEach((b) => {
        b.dataset.active = b === btn;
      });
      filterAndDisplayProducts();
    };
    $("category-box").appendChild(btn);
  });
}

function filterAndDisplayProducts() {
  const keyword = $("search").value.toLowerCase();
  const sortType = $("sort").value;

  let filtered = allProducts.filter((p) => {
    const matchesCategory = currentCategory === "all" || p.category === currentCategory;
    const matchesSearch = p.title.toLowerCase().includes(keyword);
    return matchesCategory && matchesSearch;
  });

  if (sortType === "low") filtered.sort((a, b) => a.price - b.price);
  if (sortType === "high") filtered.sort((a, b) => b.price - a.price);

  renderProductCards(filtered);
}

$("search").oninput = filterAndDisplayProducts;
$("sort").onchange = filterAndDisplayProducts;


/* ---------- CART & CHECKOUT ---------- */

function calculateCartTotals(extraPrice = 0) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * 10) * item.quantity, 0) + (extraPrice * 10);
  const hasItems = subtotal > 0;
  const deliveryFee = hasItems ? 60 : 0;
  const shippingFee = hasItems ? 40 : 0;
  const discountAmount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const grandTotal = subtotal + deliveryFee + shippingFee - discountAmount;
  
  return { subtotal, deliveryFee, shippingFee, discountAmount, grandTotal };
}

function modifyQuantity(product, changeAmount) {
  const priceInBDT = product.price * 10;
  if (changeAmount > 0 && calculateCartTotals(product.price).grandTotal > balance) {
    $("warning").textContent = LIMIT_MESSAGE;
    return;
  }
  $("warning").textContent = "";

  let cartItem = cart.find((i) => i.id === product.id);
  if (!cartItem) {
    cartItem = { id: product.id, title: product.title, price: product.price, image: product.image, quantity: 0 };
    cart.push(cartItem);
  }
  
  cartItem.quantity += changeAmount;
  cart = cart.filter((i) => i.quantity > 0);
  renderCartUI();
}

function renderCartUI() {
  $("cart-items").innerHTML = cart.length
    ? cart.map((item) => `
        <div class="cart-item border-b border-slate-200 py-2" data-id="${item.id}">
          <div class="flex items-center gap-2">
            <img class="w-12 h-12 object-contain" src="${item.image}" alt="${item.title}">
            <h4 class="text-[13px] font-bold">${item.title}</h4>
          </div>
          <div class="flex justify-between items-center mt-2">
            <div>
              <button class="bg-slate-200 px-2 py-0.5 rounded-md" data-action="minus">-</button>
              <span class="mx-1">${item.quantity}</span>
              <button class="bg-slate-200 px-2 py-0.5 rounded-md" data-action="plus">+</button>
            </div>
            <p>${(item.price * 10) * item.quantity} BDT</p>
            <button class="text-red-600 font-semibold" data-action="remove">Remove</button>
          </div>
        </div>`).join("")
    : "<p class='text-slate-500'>Your cart is empty.</p>";

  const totals = calculateCartTotals();
  $("subtotal").textContent = totals.subtotal;
  $("delivery").textContent = totals.deliveryFee;
  $("shipping").textContent = totals.shippingFee;
  $("discount").textContent = totals.discountAmount;
  $("total").textContent = totals.grandTotal;
  $("cart-count").textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

$("cart-items").onclick = (e) => {
  const actionType = e.target.dataset.action;
  if (!actionType) return;

  const parentCard = e.target.closest(".cart-item");
  const targetId = Number(parentCard.dataset.id);
  const matchedItem = cart.find((i) => i.id === targetId);

  const stepChange = { plus: 1, minus: -1, remove: -matchedItem.quantity }[actionType];
  modifyQuantity(matchedItem, stepChange);
};

$("apply-coupon").onclick = () => {
  couponApplied = $("coupon").value.trim().toUpperCase() === "SMART10";
  $("coupon-message").textContent = couponApplied ? "Coupon applied! 10% discount added." : "Invalid coupon code.";
  $("coupon-message").className = couponApplied ? "text-green-600 font-semibold" : "text-red-600 font-semibold";
  renderCartUI();
};

$("checkout").onclick = () => {
  const totals = calculateCartTotals();
  if (!cart.length) {
    $("warning").textContent = "Your cart is empty.";
    return;
  }
  if (totals.grandTotal > balance) {
    $("warning").textContent = LIMIT_MESSAGE;
    return;
  }
  balance -= totals.grandTotal;
  refreshBalance();
  cart = [];
  couponApplied = false;
  $("coupon").value = "";
  $("coupon-message").textContent = "";
  $("warning").textContent = "";
  renderCartUI();
  alert("Order placed successfully! Thank you for shopping with SmartShop.");
};

$("clear-cart").onclick = () => {
  cart = [];
  $("warning").textContent = "";
  renderCartUI();
};

renderCartUI();


/* ---------- REVIEWS SLIDER ---------- */

const customerReviews = [
  { name: "Rahim", comment: "Great quality products and fast delivery.", rating: 5, date: "2026-09-10" },
  { name: "Karim", comment: "Prices are good. Will buy again.", rating: 4, date: "2026-09-18" },
  { name: "Nusrat", comment: "Nice website, easy to use.", rating: 5, date: "2026-10-01" },
  { name: "Sadia", comment: "Product was okay, delivery was a bit late.", rating: 3, date: "2026-10-12" }
];

initCarousel(customerReviews.length, (i) => {
  const rev = customerReviews[i];
  $("review-box").innerHTML = `
    <p class="text-amber-500 text-xl font-bold">${"★".repeat(rev.rating)}${"☆".repeat(5 - rev.rating)}</p>
    <p class="my-2 italic">"${rev.comment}"</p>
    <h4 class="font-bold">${rev.name}</h4>
    <p class="text-xs text-slate-500">${rev.date}</p>
  `;
}, "prev-review", "next-review", 4500);


/* ---------- CONTACT FORM ---------- */

$("contact-form").onsubmit = (event) => {
  event.preventDefault();

  const nameVal = $("c-name").value.trim();
  const emailVal = $("c-email").value.trim();
  const messageVal = $("c-message").value.trim();

  let errorText = "";
  if (!nameVal || !emailVal || !messageVal) errorText = "Please fill in all fields.";
  else if (!emailVal.includes("@") || !emailVal.includes(".")) errorText = "Please enter a valid email address.";

  $("form-message").className = errorText ? "text-red-600 font-semibold" : "text-green-600 font-semibold";
  $("form-message").textContent = errorText || `Thank you, ${nameVal}! We received your message.`;

  if (!errorText) {
    event.target.reset();
    setTimeout(() => ($("form-message").textContent = ""), 3000);
  }
};