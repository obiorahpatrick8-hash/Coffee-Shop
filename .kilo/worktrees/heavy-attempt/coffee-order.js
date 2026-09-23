const STORAGE_KEY = "pattyCoffeeOrder";
const LAST_ORDER_KEY = "pattyCoffeeLastOrder";

const menuCards = document.querySelectorAll(".menu-card");
const orderItems = document.querySelector("#coffee-order-items");
const orderEmpty = document.querySelector("#coffee-order-empty");
const orderCount = document.querySelector("#coffee-order-count");
const navOrderCount = document.querySelector("#nav-order-count");
const orderTotal = document.querySelector("#coffee-order-total");
const clearOrderButton = document.querySelector("#clear-coffee-order");
const orderForm = document.querySelector("#coffee-preferences");
const orderStatus = document.querySelector("#coffee-order-status");
const confirmation = document.querySelector("#order-confirmation");
const closeConfirmationButton = document.querySelector("#close-confirmation");
const doneButton = document.querySelector("#done-button");
const confirmationNumber = document.querySelector("#confirmation-number");
const confirmationTotal = document.querySelector("#confirmation-total");

function readOrder() {
  try {
    const storedOrder = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(storedOrder) ? storedOrder.filter(isValidOrderItem) : [];
  } catch {
    return [];
  }
}

function isValidOrderItem(item) {
  return item && typeof item.id === "string" && typeof item.name === "string"
    && Number.isFinite(Number(item.price)) && Number.isFinite(Number(item.quantity));
}

let order = readOrder();

function saveOrder() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

function formatCurrency(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function getItemCount() {
  return order.reduce((total, item) => total + item.quantity, 0);
}

function getOrderTotal() {
  return order.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function announce(message) {
  orderStatus.textContent = message;
}

function renderOrder() {
  const itemCount = getItemCount();
  orderItems.replaceChildren();
  orderCount.textContent = `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  navOrderCount.textContent = itemCount;
  orderTotal.textContent = formatCurrency(getOrderTotal());
  orderEmpty.hidden = order.length > 0;
  clearOrderButton.hidden = order.length === 0;

  order.forEach((item) => {
    const row = document.createElement("li");
    row.className = "coffee-order-item";

    const details = document.createElement("div");
    details.className = "coffee-order-item-details";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const unitPrice = document.createElement("span");
    unitPrice.textContent = `${formatCurrency(item.price)} each`;
    details.append(name, unitPrice);

    const quantityControls = document.createElement("div");
    quantityControls.className = "quantity-controls";
    quantityControls.append(
      createActionButton("−", "decrease", item, `Decrease ${item.name} quantity`),
      Object.assign(document.createElement("span"), { textContent: item.quantity }),
      createActionButton("+", "increase", item, `Increase ${item.name} quantity`)
    );

    const itemTotal = document.createElement("strong");
    itemTotal.className = "coffee-order-item-total";
    itemTotal.textContent = formatCurrency(item.price * item.quantity);

    const removeButton = createActionButton("×", "remove", item, `Remove ${item.name}`);
    removeButton.className = "remove-item-button";

    row.append(details, quantityControls, itemTotal, removeButton);
    orderItems.append(row);
  });
}

function createActionButton(text, action, item, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.dataset.orderAction = action;
  button.dataset.itemId = item.id;
  button.setAttribute("aria-label", label);
  button.className = action === "remove" ? "remove-item-button" : "quantity-button";
  return button;
}

function addItem(card, button) {
  const name = card.dataset.name;
  const price = Number(card.dataset.price);
  const id = `${name}-${price}`;
  const existingItem = order.find((item) => item.id === id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    order.push({ id, name, price, quantity: 1 });
  }

  saveOrder();
  renderOrder();
  announce(`${name} was added to your order.`);

  button.classList.add("added");
  const originalText = button.innerHTML;
  button.textContent = "Added ✓";
  window.setTimeout(() => {
    button.innerHTML = originalText;
    button.classList.remove("added");
  }, 850);
}

menuCards.forEach((card) => {
  const button = card.querySelector(".add-item-button");
  button.addEventListener("click", () => addItem(card, button));
});

orderItems.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-order-action]");
  if (!actionButton) return;

  const item = order.find((currentItem) => currentItem.id === actionButton.dataset.itemId);
  if (!item) return;

  const action = actionButton.dataset.orderAction;
  if (action === "increase") item.quantity += 1;
  if (action === "decrease") item.quantity -= 1;
  if (action === "remove" || item.quantity < 1) {
    order = order.filter((currentItem) => currentItem.id !== item.id);
  }

  saveOrder();
  renderOrder();
  announce(action === "remove" ? `${item.name} was removed.` : "Your order was updated.");
});

clearOrderButton.addEventListener("click", () => {
  order = [];
  saveOrder();
  renderOrder();
  announce("Your order was cleared.");
});

function openConfirmation(lastOrder) {
  confirmationNumber.textContent = lastOrder.orderNumber;
  confirmationTotal.textContent = formatCurrency(lastOrder.total);
  confirmation.hidden = false;
  document.body.classList.add("modal-open");
  closeConfirmationButton.focus();
}

function closeConfirmation() {
  confirmation.hidden = true;
  document.body.classList.remove("modal-open");
}

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (order.length === 0) {
    announce("Add at least one item before placing your order.");
    document.querySelector("#menu").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const preferences = new FormData(orderForm);
  const orderNumber = `COF-${String(Date.now()).slice(-6)}`;
  const preferenceSummary = [
    preferences.get("size"),
    preferences.get("sugar"),
    preferences.get("milk"),
    ...preferences.getAll("extras"),
  ].filter(Boolean).join(", ");
  const lastOrder = {
    orderNumber,
    items: order.map((item) => ({ ...item })),
    total: getOrderTotal(),
    preferences: preferenceSummary,
    placedAt: new Date().toISOString(),
  };

  localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(lastOrder));
  order = [];
  saveOrder();
  renderOrder();
  announce(`Thanks for shopping with us! Order ${orderNumber} has been received.`);
  openConfirmation(lastOrder);
});

closeConfirmationButton.addEventListener("click", closeConfirmation);
doneButton.addEventListener("click", closeConfirmation);
confirmation.addEventListener("click", (event) => {
  if (event.target === confirmation) closeConfirmation();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !confirmation.hidden) closeConfirmation();
});

renderOrder();
