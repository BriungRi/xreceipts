import { getReceipts } from "./idb.js";

const searchInput = document.querySelector("#search");
const list = document.querySelector("#list");
const summary = document.querySelector("#summary");
const openSettings = document.querySelector("#openSettings");

let receipts = [];

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function createButton(label, onClick, options = {}) {
  const button = document.createElement("button");
  button.className = `button${options.primary ? " primary" : ""}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderList(items) {
  list.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No receipts yet. Use 🧾 Take Receipt inside X.";
    list.appendChild(empty);
    return;
  }

  for (const receipt of items) {
    const card = document.createElement("div");
    card.className = "card";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = [receipt.author, receipt.handle, formatDate(receipt.createdAt)]
      .filter(Boolean)
      .join(" • ");

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = receipt.text || "(No tweet text captured)";

    const actions = document.createElement("div");
    actions.className = "actions";

    actions.appendChild(
      createButton("Open tweet", () => {
        if (receipt.url) {
          chrome.tabs.create({ url: receipt.url });
        }
      }, { primary: true })
    );

    actions.appendChild(
      createButton("Open file", () => {
        if (receipt.downloadId) {
          chrome.downloads.open(receipt.downloadId);
        }
      })
    );

    actions.appendChild(
      createButton("Show in folder", () => {
        if (receipt.downloadId) {
          chrome.downloads.show(receipt.downloadId);
        }
      })
    );

    actions.appendChild(
      createButton("Copy text", async () => {
        if (receipt.text) {
          await navigator.clipboard.writeText(receipt.text);
        }
      })
    );

    card.appendChild(meta);
    card.appendChild(text);
    card.appendChild(actions);
    list.appendChild(card);
  }
}

function filterReceipts(query) {
  if (!query) {
    return receipts;
  }

  const normalized = query.toLowerCase();
  return receipts.filter((receipt) => receipt.searchText?.includes(normalized));
}

function update() {
  const query = searchInput.value.trim();
  const filtered = filterReceipts(query);
  summary.textContent = `${filtered.length} receipt${filtered.length === 1 ? "" : "s"}`;
  renderList(filtered);
}

async function init() {
  receipts = (await getReceipts()).sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );
  update();
}

searchInput.addEventListener("input", update);
openSettings.addEventListener("click", () => chrome.runtime.openOptionsPage());
init();
