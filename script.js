function getCart() {
  try {
    return JSON.parse(localStorage.getItem("mt_cart")) || [];
  } catch {
    return [];
  }
}

/** Write cart array back to localStorage */
function saveCart(cart) {
  localStorage.setItem("mt_cart", JSON.stringify(cart));
}

/** Return total number of items (sum of qty) in the cart */
function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/** Update the cart badge shown on the 🛒 icon in the navbar */
function updateCartBadge() {
  // Find or create the badge element
  let badge = document.getElementById("cart-badge");
  const cartLink = document.querySelector(".cart a");
  if (!cartLink) return;

  const count = cartCount();

  if (!badge) {
    badge = document.createElement("span");
    badge.id = "cart-badge";
    cartLink.appendChild(badge);
  }

  badge.textContent = count;
  // Hide badge when cart is empty
  badge.style.display = count > 0 ? "flex" : "none";
}

function showToast(message, type = "success") {
  // Remove any existing toast first
  const existing = document.getElementById("mt-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "mt-toast";
  toast.textContent = message;
  toast.className = `mt-toast mt-toast--${type}`;
  document.body.appendChild(toast);

  // Trigger fade-in
  requestAnimationFrame(() => toast.classList.add("mt-toast--show"));

  // Auto-remove after 2.5 seconds
  setTimeout(() => {
    toast.classList.remove("mt-toast--show");
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

function addToCart(btn) {
  // Walk up the DOM to the .order_plates wrapper
  const card = btn.closest(".order_plates");
  if (!card) return;

  // Read product data embedded as data attributes
  const id    = card.dataset.id;
  const name  = card.querySelector("h3").textContent.trim();
  const image = card.querySelector(".plate-image").src;
  // Parse numeric price (strip ₹ symbol)
  const priceText = card.querySelector(".current-price").textContent;
  const price = parseFloat(priceText.replace(/[^\d.]/g, ""));

  let cart = getCart();

  // Check if this item is already in the cart
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
    showToast(`${name} quantity updated (${existing.qty})`, "success");
  } else {
    cart.push({ id, name, price, image, qty: 1 });
    showToast(`${name} added to cart! 🛒`, "success");
  }

  saveCart(cart);
  updateCartBadge();

  // Visual feedback: briefly change button text
  btn.textContent = "✓ Added!";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = "Add to Cart";
    btn.disabled = false;
  }, 1200);
}

function toggleWishlist(btn) {
  const card = btn.closest(".order_plates");
  const name = card ? card.querySelector("h3").textContent.trim() : "Item";
  const id   = card ? card.dataset.id : "";

  let wishlist = [];
  try { wishlist = JSON.parse(localStorage.getItem("mt_wishlist")) || []; } catch {}

  const icon = btn.querySelector("span");
  if (wishlist.includes(id)) {
    wishlist = wishlist.filter(w => w !== id);
    icon.style.color = "";
    btn.title = "Add to wishlist";
    showToast(`${name} removed from wishlist`, "info");
  } else {
    wishlist.push(id);
    icon.style.color = "#e63946";
    btn.title = "Remove from wishlist";
    showToast(`${name} added to wishlist ❤️`, "success");
  }
  localStorage.setItem("mt_wishlist", JSON.stringify(wishlist));
}

/** Restore wishlist heart colours on page load */
function restoreWishlist() {
  let wishlist = [];
  try { wishlist = JSON.parse(localStorage.getItem("mt_wishlist")) || []; } catch {}
  document.querySelectorAll(".order_plates").forEach(card => {
    if (wishlist.includes(card.dataset.id)) {
      const icon = card.querySelector(".plate-wishlist span");
      if (icon) icon.style.color = "#e63946";
    }
  });
}
function initProductPage() {
  const grid = document.getElementById("order_plates_box");
  if (!grid) return; // Not on index page

  // ── Live Search ──────────────────────────────────────────
  const searchInput  = document.getElementById("search_input");
  const searchButton = document.getElementById("search_button");

  function runSearch() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const cards = grid.querySelectorAll(".order_plates");
    let visible = 0;
    cards.forEach(card => {
      const name = card.querySelector("h3").textContent.toLowerCase();
      const match = !q || name.includes(q);
      card.style.display = match ? "" : "none";
      if (match) visible++;
    });

    // Show empty state if nothing matches
    let emptyMsg = document.getElementById("empty-search-msg");
    if (visible === 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement("p");
        emptyMsg.id = "empty-search-msg";
        emptyMsg.className = "empty-search-msg";
        emptyMsg.textContent = "No dishes found. Try a different search!";
        grid.parentNode.insertBefore(emptyMsg, grid.nextSibling);
      }
    } else {
      if (emptyMsg) emptyMsg.remove();
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", runSearch);
  }
  if (searchButton) {
    searchButton.addEventListener("click", runSearch);
  }

  // ── Sort Dropdown ────────────────────────────────────────
  const sortDropdown = document.querySelector(".sort-dropdown");
  if (sortDropdown) {
    sortDropdown.addEventListener("change", function () {
      sortCards(this.value);
    });
  }

  function sortCards(method) {
    const cards = [...grid.querySelectorAll(".order_plates")];

    cards.sort((a, b) => {
      const priceA = parseFloat(a.querySelector(".current-price").textContent.replace(/[^\d.]/g, ""));
      const priceB = parseFloat(b.querySelector(".current-price").textContent.replace(/[^\d.]/g, ""));
      const nameA  = a.querySelector("h3").textContent.trim().toLowerCase();
      const nameB  = b.querySelector("h3").textContent.trim().toLowerCase();

      switch (method) {
        case "price-asc":  return priceA - priceB;
        case "price-desc": return priceB - priceA;
        case "name":       return nameA.localeCompare(nameB);
        default:           return 0; // "position" — keep original order
      }
    });

    // Re-append in sorted order (detaches + re-attaches DOM nodes)
    cards.forEach(card => grid.appendChild(card));
    showToast("Products sorted ✓", "info");
  }

  // ── Price Filter ─────────────────────────────────────────
  const priceOkBtn = document.querySelector(".filter-action button");
  const minInput   = document.querySelector("#price-content input[type='number']:first-of-type");
  const maxInput   = document.querySelector("#price-content input[type='number']:last-of-type");

  if (priceOkBtn) {
    priceOkBtn.addEventListener("click", function () {
      const min = parseFloat(minInput?.value) || 0;
      const max = parseFloat(maxInput?.value) || Infinity;

      // Validate: max must be greater than min
      if (max !== Infinity && max < min) {
        showToast("Max price must be greater than min price", "error");
        maxInput.classList.add("input-error");
        setTimeout(() => maxInput.classList.remove("input-error"), 2000);
        return;
      }

      const cards = grid.querySelectorAll(".order_plates");
      let visible = 0;
      cards.forEach(card => {
        const price = parseFloat(card.querySelector(".current-price").textContent.replace(/[^\d.]/g, ""));
        const show  = price >= min && price <= max;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });

      showToast(`Showing ${visible} dish${visible !== 1 ? "es" : ""} in range`, "info");
    });
  }

  // ── Pack Size Filter ─────────────────────────────────────
  const packButtons = document.querySelectorAll(".pack-button");
  packButtons.forEach(btn => {
    btn.addEventListener("click", function () {
      // Toggle active state
      const alreadyActive = this.classList.contains("pack-active");

      // Clear all active states first
      packButtons.forEach(b => b.classList.remove("pack-active"));
      const cards = grid.querySelectorAll(".order_plates");

      if (alreadyActive) {
        // De-select: show all cards
        cards.forEach(card => (card.style.display = ""));
        showToast("Pack filter cleared", "info");
        return;
      }

      // Apply this filter
      this.classList.add("pack-active");
      const size = this.textContent.trim(); // e.g. "350 gm"

      let visible = 0;
      cards.forEach(card => {
        const packText = card.querySelector(".plate-content p")?.textContent || "";
        // Normalise: "350 gm" vs "(350 g)" — match on digits
        const cardGrams = packText.replace(/[^\d]/g, "");
        const btnGrams  = size.replace(/[^\d]/g, "");
        const show = cardGrams === btnGrams;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });

      showToast(`Showing ${size} packs (${visible} item${visible !== 1 ? "s" : ""})`, "info");
    });
  });

  // ── Filter title toggle (collapse/expand) ────────────────
  document.querySelectorAll(".filter-title").forEach(title => {
    title.addEventListener("click", function () {
      const contentId = this.dataset.contentId;
      const content   = document.getElementById(contentId);
      if (!content) return;
      const isOpen = content.style.display !== "none";
      content.style.display = isOpen ? "none" : "block";
    });
  });

  // ── Wire up Add-to-Cart buttons ──────────────────────────
  grid.querySelectorAll(".add-to-cart").forEach(btn => {
    // Remove old inline onclick before adding listener
    btn.removeAttribute("onclick");
    btn.addEventListener("click", function () {
      addToCart(this);
    });
  });

  // ── Wire up Wishlist buttons ─────────────────────────────
  grid.querySelectorAll(".plate-wishlist").forEach(btn => {
    btn.addEventListener("click", function () {
      toggleWishlist(this);
    });
  });

  restoreWishlist();
}
function initCartPage() {
  const container = document.querySelector(".card");
  if (!container || !document.querySelector(".page-title")?.textContent.includes("Cart")) return;

  function renderCart() {
    const cart = getCart();

    // Clear existing content
    container.innerHTML = "";

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <p style="font-size:48px;text-align:center">🛒</p>
          <p class="cart-empty-msg">Your cart is empty!</p>
          <a href="index.html" class="btn" style="display:inline-block;text-align:center;text-decoration:none;margin-top:12px;">
            Browse Menu
          </a>
        </div>`;
      return;
    }

    // Render each cart item
    cart.forEach(item => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.dataset.id = item.id;
      row.innerHTML = `
        <img src="${item.image}" alt="${item.name}" style="width:80px;height:80px;border-radius:10px;object-fit:cover;">
        <div class="cart-item-details" style="flex:1;margin-left:15px;">
          <h3>${item.name}</h3>
          <p style="color:#cd1c18;font-weight:600;">₹${item.price} each</p>
        </div>
        <div class="qty-controls">
          <button class="qty-btn qty-minus" data-id="${item.id}" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn qty-plus"  data-id="${item.id}" aria-label="Increase quantity">+</button>
        </div>
        <span class="item-subtotal" style="min-width:70px;text-align:right;font-weight:700;">
          ₹${(item.price * item.qty).toFixed(0)}
        </span>
        <button class="btn cart-remove-btn" data-id="${item.id}" style="margin-left:12px;">Remove</button>
      `;
      container.appendChild(row);
    });

    // Total row
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totalEl = document.createElement("div");
    totalEl.className = "cart-total";
    totalEl.id = "cart-total-display";
    totalEl.textContent = `Total: ₹${total.toFixed(0)}`;
    container.appendChild(totalEl);

    // Checkout button — triggers checkout form
    const checkoutBtn = document.createElement("button");
    checkoutBtn.className = "btn";
    checkoutBtn.id = "checkout-btn";
    checkoutBtn.style.cssText = "margin-top:20px;width:100%;font-size:18px;padding:12px;";
    checkoutBtn.textContent = "Proceed to Checkout →";
    container.appendChild(checkoutBtn);

    // Attach checkout form below
    renderCheckoutForm();

    // ── Event delegation for qty and remove buttons ──────
    container.querySelectorAll(".qty-minus, .qty-plus").forEach(btn => {
      btn.addEventListener("click", function () {
        const id   = this.dataset.id;
        let cart   = getCart();
        const item = cart.find(i => i.id === id);
        if (!item) return;

        if (this.classList.contains("qty-minus")) {
          item.qty = Math.max(1, item.qty - 1);
        } else {
          item.qty += 1;
        }

        saveCart(cart);
        updateCartBadge();
        renderCart(); // Re-render
      });
    });

    container.querySelectorAll(".cart-remove-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const id   = this.dataset.id;
        let cart   = getCart().filter(i => i.id !== id);
        saveCart(cart);
        updateCartBadge();
        showToast("Item removed from cart", "info");
        renderCart();
      });
    });

    // Checkout button scroll-to
    checkoutBtn.addEventListener("click", function () {
      document.getElementById("checkout-form-section")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Checkout form (appended after the card)
  function renderCheckoutForm() {
    // Don't duplicate
    const old = document.getElementById("checkout-form-section");
    if (old) return;

    const section = document.createElement("div");
    section.id = "checkout-form-section";
    section.className = "card";
    section.style.cssText = "margin-top:30px;padding:28px;";
    section.innerHTML = `
      <h2 style="margin-bottom:18px;color:#cd1c18;">Delivery Details</h2>
      <form id="checkout-form" novalidate>
        <div class="form-group-co">
          <label>Full Name <span class="req">*</span></label>
          <input type="text" id="co-name" placeholder="e.g. Rahul Sharma" autocomplete="name">
          <span class="field-err" id="co-name-err"></span>
        </div>
        <div class="form-group-co">
          <label>Phone Number <span class="req">*</span></label>
          <input type="tel" id="co-phone" placeholder="10-digit mobile number" maxlength="10" autocomplete="tel">
          <span class="field-err" id="co-phone-err"></span>
        </div>
        <div class="form-group-co">
          <label>Email Address</label>
          <input type="email" id="co-email" placeholder="you@example.com" autocomplete="email">
          <span class="field-err" id="co-email-err"></span>
        </div>
        <div class="form-group-co">
          <label>Delivery Address <span class="req">*</span></label>
          <textarea id="co-address" rows="3" placeholder="House / flat no., Street, City, PIN"></textarea>
          <span class="field-err" id="co-address-err"></span>
        </div>
        <div class="form-group-co">
          <label>Payment Method <span class="req">*</span></label>
          <select id="co-payment">
            <option value="">-- Select --</option>
            <option value="upi">UPI / QR</option>
            <option value="card">Credit / Debit Card</option>
            <option value="cod">Cash on Delivery</option>
            <option value="wallet">Wallet</option>
          </select>
          <span class="field-err" id="co-payment-err"></span>
        </div>
        <button type="submit" class="btn" style="width:100%;margin-top:10px;font-size:18px;padding:13px;">
          Place Order 🎉
        </button>
      </form>`;

    // Insert after .card (the main cart container)
    container.parentNode.insertBefore(section, container.nextSibling);

    // ── Checkout Form Validation ──────────────────────────
    document.getElementById("checkout-form").addEventListener("submit", function (e) {
      e.preventDefault();
      let valid = true;

      // Helper to show/clear errors
      function setError(id, msg) {
        const el = document.getElementById(id);
        el.textContent = msg;
        el.previousElementSibling?.classList.toggle("input-error", !!msg);
        if (msg) valid = false;
      }

      const name    = document.getElementById("co-name").value.trim();
      const phone   = document.getElementById("co-phone").value.trim();
      const email   = document.getElementById("co-email").value.trim();
      const address = document.getElementById("co-address").value.trim();
      const payment = document.getElementById("co-payment").value;

      // Name: required, at least 2 chars
      setError("co-name-err", name.length < 2 ? "Please enter your full name." : "");

      // Phone: required, exactly 10 digits
      setError("co-phone-err",
        !phone ? "Phone number is required." :
        !/^\d{10}$/.test(phone) ? "Enter a valid 10-digit phone number." : "");

      // Email: optional but validated if provided
      setError("co-email-err",
        email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email address." : "");

      // Address: required, at least 10 chars
      setError("co-address-err",
        address.length < 10 ? "Please enter a complete delivery address." : "");

      // Payment: required selection
      setError("co-payment-err", !payment ? "Please select a payment method." : "");

      if (!valid) {
        showToast("Please fix the errors above ↑", "error");
        return;
      }

      // All valid — simulate order placement
      showToast("Order placed successfully! 🎉 Thank you!", "success");
      saveCart([]); // Empty the cart
      updateCartBadge();

      setTimeout(() => {
        document.getElementById("checkout-form-section").innerHTML = `
          <div style="text-align:center;padding:30px 0;">
            <p style="font-size:48px">🎊</p>
            <h2 style="color:#cd1c18;margin:12px 0">Order Confirmed!</h2>
            <p style="color:#555;">Thank you, <strong>${name}</strong>! Your food is on its way.</p>
            <a href="index.html" class="btn" style="display:inline-block;margin-top:20px;text-decoration:none;">
              Order More
            </a>
          </div>`;
        renderCart(); // Show empty cart
      }, 1500);
    });
  }

  renderCart();
}

function initContactPage() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  // Add ids to form fields so we can reference them
  const inputs = form.querySelectorAll("input, textarea");
  const [nameInput, emailInput, messageInput] = inputs;

  // Add error spans after each field
  function addErrorSpan(input) {
    const existing = input.nextElementSibling;
    if (existing && existing.classList.contains("field-err")) return existing;
    const span = document.createElement("span");
    span.className = "field-err";
    input.insertAdjacentElement("afterend", span);
    return span;
  }

  const nameErr    = addErrorSpan(nameInput);
  const emailErr   = addErrorSpan(emailInput);
  const messageErr = addErrorSpan(messageInput);

  // Real-time validation as user types
  nameInput.addEventListener("input", () => {
    nameErr.textContent = nameInput.value.trim().length < 2
      ? "Name must be at least 2 characters." : "";
    nameInput.classList.toggle("input-error", !!nameErr.textContent);
  });

  emailInput.addEventListener("input", () => {
    const v = emailInput.value.trim();
    const ok = !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    emailErr.textContent = !v ? "Email is required." : !ok ? "Enter a valid email." : "";
    emailInput.classList.toggle("input-error", !!emailErr.textContent);
  });

  messageInput.addEventListener("input", () => {
    messageErr.textContent = messageInput.value.trim().length < 10
      ? "Message must be at least 10 characters." : "";
    messageInput.classList.toggle("input-error", !!messageErr.textContent);
  });

  // Submit
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name    = nameInput.value.trim();
    const email   = emailInput.value.trim();
    const message = messageInput.value.trim();
    let valid = true;

    if (name.length < 2) {
      nameErr.textContent = "Name must be at least 2 characters.";
      nameInput.classList.add("input-error");
      valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailErr.textContent = !email ? "Email is required." : "Enter a valid email.";
      emailInput.classList.add("input-error");
      valid = false;
    }
    if (message.length < 10) {
      messageErr.textContent = "Message must be at least 10 characters.";
      messageInput.classList.add("input-error");
      valid = false;
    }

    if (!valid) {
      showToast("Please fix the errors in the form.", "error");
      return;
    }

    // Simulate sending
    const submitBtn = form.querySelector(".btn");
    submitBtn.textContent = "Sending…";
    submitBtn.disabled = true;

    setTimeout(() => {
      showToast("Message sent! We'll get back to you soon 📩", "success");
      form.reset();
      submitBtn.textContent = "Submit";
      submitBtn.disabled = false;
      nameErr.textContent = emailErr.textContent = messageErr.textContent = "";
    }, 1200);
  });
}

async function fetchWeatherBanner() {
  const banner = document.getElementById("weather-banner");
  if (!banner) return;

  // Chandigarh coordinates
  const lat = 30.7333, lon = 76.7794;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();

    const temp    = data.current_weather.temperature;   // °C
    const code    = data.current_weather.weathercode;   // WMO code
    const isNight = data.current_weather.is_day === 0;

    // Map WMO weather codes to emoji + label
    function weatherInfo(code, night) {
      if (code === 0)            return { emoji: night ? "🌙" : "☀️",  label: night ? "Clear night" : "Sunny" };
      if (code <= 2)             return { emoji: night ? "🌤️" : "⛅", label: "Partly cloudy" };
      if (code <= 3)             return { emoji: "☁️",  label: "Overcast" };
      if (code <= 49)            return { emoji: "🌫️", label: "Foggy" };
      if (code <= 55)            return { emoji: "🌧️", label: "Drizzle" };
      if (code <= 65)            return { emoji: "🌧️", label: "Rainy" };
      if (code <= 77)            return { emoji: "❄️",  label: "Snowy" };
      if (code <= 82)            return { emoji: "🌦️", label: "Rain showers" };
      if (code >= 95)            return { emoji: "⛈️",  label: "Thunderstorm" };
      return { emoji: "🌡️", label: "Varied" };
    }

    const { emoji, label } = weatherInfo(code, isNight);

    // Build a contextual food suggestion based on weather
    let suggestion = "Perfect weather to enjoy a hearty meal!";
    if (temp < 15)  suggestion = "It's chilly outside! Warm up with our hot Dal Makhani 🍲";
    else if (temp > 35) suggestion = "Beat the heat with our refreshing Lassi & light meals 🥤";
    else if (code >= 61 && code <= 65) suggestion = "Rainy day? Perfect for some Pakoras & Masala Chai ☕";
    else if (code === 0 && !isNight)   suggestion = "Beautiful day — enjoy our fresh Chaats & Tikkas! 🌮";

    banner.innerHTML = `
      <span class="weather-emoji">${emoji}</span>
      <span class="weather-info">
        <strong>Chandigarh: ${label}, ${temp}°C</strong>
        <span>${suggestion}</span>
      </span>`;
    banner.style.display = "flex";

  } catch (err) {
    // Silently fail — not critical
    console.warn("Weather fetch failed:", err.message);
    banner.style.display = "none";
  }
}

/* ─── INIT: run the right setup depending on which page we're on ─ */
document.addEventListener("DOMContentLoaded", function () {

  // Always update the cart badge on every page
  updateCartBadge();

  // Inject the cart badge CSS + toast + other dynamic styles
  injectStyles();

  // Detect page and run page-specific logic
  initProductPage();   // index.html
  initCartPage();      // cart.html
  initContactPage();   // contact.html

  // Fetch weather banner (only shows on index page — element guard inside)
  fetchWeatherBanner();
});

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* Cart badge */
    #cart-badge {
      position: absolute;
      top: -8px; right: -8px;
      background: #cd1c18;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      min-width: 20px;
      height: 20px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      pointer-events: none;
      line-height: 1;
    }
    .cart a { position: relative; }

    /* Toast */
    .mt-toast {
      position: fixed;
      bottom: 28px; right: 28px;
      z-index: 9999;
      background: #222;
      color: #fff;
      padding: 12px 22px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.35s, transform 0.35s;
      max-width: 320px;
    }
    .mt-toast--show   { opacity: 1; transform: translateY(0); }
    .mt-toast--success{ border-left: 4px solid #22c55e; }
    .mt-toast--error  { border-left: 4px solid #ef4444; background:#3b0000; }
    .mt-toast--info   { border-left: 4px solid #ffae00; }

    /* Field errors */
    .field-err { display: block; color: #cd1c18; font-size: 12px; margin: -8px 0 8px; min-height: 16px; }
    .input-error { border-color: #cd1c18 !important; background: #fff5f5; }
    .req { color: #cd1c18; }

    /* Qty controls */
    .qty-controls {
      display: flex; align-items: center; gap: 8px;
      margin: 0 12px;
    }
    .qty-btn {
      width: 32px; height: 32px; border-radius: 50%;
      background: #f0f0f0; border: 1px solid #ccc;
      font-size: 20px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      line-height: 1; transition: background 0.2s;
    }
    .qty-btn:hover { background: #ffae00; color: #fff; border-color: #ffae00; }
    .qty-value { font-size: 16px; font-weight: 700; min-width: 24px; text-align: center; }

    /* Checkout form groups */
    .form-group-co { margin-bottom: 14px; }
    .form-group-co label { font-size: 14px; font-weight: 600; color: #444; }
    .form-group-co input, .form-group-co textarea, .form-group-co select {
      width: 100%; padding: 11px 12px; margin: 6px 0 2px;
      border: 1px solid #ccc; border-radius: 6px; font-size: 15px;
    }
    .form-group-co select { background: #fff; }

    /* Cart empty */
    .cart-empty { text-align: center; padding: 30px 0; }
    .cart-empty-msg { font-size: 20px; color: #888; margin-top: 12px; }

    /* Weather banner */
    #weather-banner {
      display: none;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, #fff7f1, #ffe8cc);
      border: 1px solid #ffcf8a;
      border-radius: 10px;
      padding: 14px 22px;
      margin: 16px auto;
      max-width: 1160px;
      width: 90%;
      font-size: 15px;
      color: #5a3e00;
    }
    .weather-emoji { font-size: 32px; flex-shrink: 0; }
    .weather-info { display: flex; flex-direction: column; gap: 2px; }
    .weather-info strong { font-size: 15px; }

    /* Empty search message */
    .empty-search-msg {
      text-align: center;
      padding: 32px;
      color: #888;
      font-size: 18px;
      grid-column: 1 / -1;
    }

    /* Pack button active state */
    .pack-button.pack-active {
      background-color: #cd1c18;
      color: white;
      border-color: #cd1c18;
    }

    /* Sort dropdown style */
    .sort-dropdown {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      background: #fff;
    }

    @media (max-width: 600px) {
      .mt-toast { right: 12px; bottom: 12px; left: 12px; max-width: unset; }
      .qty-controls { margin: 0 6px; }
    }
  `;
  document.head.appendChild(style);
}
