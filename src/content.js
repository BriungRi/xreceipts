const MENU_LABEL = "🧾 Take Receipt";
let lastActiveTweet = null;

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.right = "24px";
  toast.style.padding = "10px 14px";
  toast.style.borderRadius = "10px";
  toast.style.background = isError ? "#8b1f1f" : "#0f1419";
  toast.style.color = "#e7e9ea";
  toast.style.font = "600 13px/1.4 system-ui";
  toast.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.35)";
  toast.style.zIndex = "999999";
  toast.style.maxWidth = "260px";
  toast.style.pointerEvents = "none";

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function extractTweetData(article) {
  const textEl = article.querySelector('[data-testid="tweetText"]');
  const text = textEl ? textEl.innerText.trim() : "";

  const authorEl = article.querySelector('[data-testid="User-Name"] span');
  const author = authorEl ? authorEl.textContent.trim() : "";

  const handleEl = article.querySelector('a[href^="/"][role="link"][tabindex="-1"]');
  const handle = handleEl ? handleEl.textContent.trim() : "";

  const statusLink = article.querySelector('a[href*="/status/"]');
  const url = statusLink
    ? new URL(statusLink.getAttribute("href"), location.origin).toString()
    : "";
  const tweetId = statusLink?.getAttribute("href")?.split("/status/")[1]?.split("/")[0] || "";

  return { text, author, handle, url, tweetId };
}

async function sendReceiptRequest(article) {
  article.scrollIntoView({ block: "center", behavior: "instant" });

  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => setTimeout(resolve, 120));

  const rect = article.getBoundingClientRect();
  const payload = {
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    },
    devicePixelRatio: window.devicePixelRatio,
    ...extractTweetData(article)
  };

  return chrome.runtime.sendMessage({ type: "TAKE_RECEIPT", payload });
}

function hideOpenMenus() {
  const dropdowns = Array.from(document.querySelectorAll('[data-testid="Dropdown"]'));
  const previous = dropdowns.map((node) => ({
    node,
    visibility: node.style.visibility,
    opacity: node.style.opacity
  }));

  dropdowns.forEach((node) => {
    node.style.visibility = "hidden";
    node.style.opacity = "0";
  });

  return () => {
    previous.forEach(({ node, visibility, opacity }) => {
      node.style.visibility = visibility;
      node.style.opacity = opacity;
    });
  };
}

async function handleReceiptClick(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!lastActiveTweet) {
    showToast("Could not find the tweet. Try opening the menu again.", true);
    return;
  }

  try {
    showToast("Saving receipt...");
    const restoreMenus = hideOpenMenus();
    let response;
    try {
      response = await sendReceiptRequest(lastActiveTweet);
    } finally {
      restoreMenus();
    }
    if (!response?.ok) {
      throw new Error(response?.error || "Failed to save receipt.");
    }
    showToast("Receipt saved");
  } catch (error) {
    showToast(error.message, true);
  }
}

function buildMenuItem(template) {
  const item = template.cloneNode(true);
  item.dataset.xreceipts = "true";
  item.removeAttribute("href");
  item.setAttribute("role", "menuitem");
  item.style.cursor = "pointer";

  const textContainer = item.querySelector("span");
  if (textContainer) {
    textContainer.textContent = MENU_LABEL;
  }

  const iconContainer = item.querySelector("svg");
  if (iconContainer) {
    iconContainer.innerHTML =
      '<path d="M6 2h12a2 2 0 0 1 2 2v15a1 1 0 0 1-1.5.86L12 16l-6.5 3.86A1 1 0 0 1 4 19V4a2 2 0 0 1 2-2zm0 2v13.24l5.5-3.26a1 1 0 0 1 1 0L18 17.24V4H6z" />';
  }

  item.addEventListener("click", handleReceiptClick, true);
  return item;
}

function injectReceiptMenu(dropdown) {
  if (dropdown.querySelector("[data-xreceipts]") || dropdown.dataset.xreceiptsReady) {
    return;
  }

  const template = dropdown.querySelector("[role=menuitem]");
  if (!template) {
    return;
  }

  const menuItem = buildMenuItem(template);
  dropdown.insertBefore(menuItem, dropdown.firstChild);
  dropdown.dataset.xreceiptsReady = "true";
}

function watchForDropdowns() {
  document.querySelectorAll('[data-testid="Dropdown"]').forEach(injectReceiptMenu);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) {
          continue;
        }

        if (node.matches?.('[data-testid="Dropdown"]')) {
          injectReceiptMenu(node);
        }

        node
          .querySelectorAll?.('[data-testid="Dropdown"]')
          .forEach(injectReceiptMenu);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener(
  "click",
  (event) => {
    const target = event.target.closest('[data-testid="caret"]');
    if (target) {
      lastActiveTweet = target.closest("article");
    }
  },
  true
);

watchForDropdowns();
