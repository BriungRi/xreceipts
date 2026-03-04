import { addReceipt } from "./idb.js";

async function downloadBlob(blob, filename, saveAs) {
  const url = URL.createObjectURL(blob);

  try {
    return await chrome.downloads.download({
      url,
      filename,
      conflictAction: "uniquify",
      saveAs: Boolean(saveAs)
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getSettings() {
  return chrome.storage.sync.get({
    folderName: "xreceipts",
    saveAs: false
  });
}

async function cropToRect(dataUrl, rect, devicePixelRatio) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const image = await createImageBitmap(blob);
  const scale = devicePixelRatio || 1;

  const sx = Math.max(0, Math.floor(rect.x * scale));
  const sy = Math.max(0, Math.floor(rect.y * scale));
  const sw = Math.min(image.width - sx, Math.floor(rect.width * scale));
  const sh = Math.min(image.height - sy, Math.floor(rect.height * scale));

  if (!self.OffscreenCanvas || sw <= 0 || sh <= 0) {
    return blob;
  }

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.convertToBlob({ type: "image/png" });
}

async function handleReceiptRequest(payload, sender) {
  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;

  if (!tabId || windowId === undefined) {
    throw new Error("Missing tab information.");
  }

  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
    format: "png"
  });

  const cropped = await cropToRect(dataUrl, payload.rect, payload.devicePixelRatio);
  const receiptId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const settings = await getSettings();
  const safeFolder = (settings.folderName || "xreceipts").replace(/[\\/:*?"<>|]+/g, "-");
  const baseName = `${timestamp.replace(/[:.]/g, "-")}-${receiptId}.png`;
  const filename = safeFolder ? `${safeFolder}/${baseName}` : baseName;

  const downloadId = await downloadBlob(cropped, filename, settings.saveAs);

  const searchText = [payload.text, payload.author, payload.handle]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const receipt = {
    id: receiptId,
    tweetId: payload.tweetId || null,
    text: payload.text || "",
    author: payload.author || "",
    handle: payload.handle || "",
    url: payload.url || "",
    createdAt: timestamp,
    imageFilename: filename,
    downloadId,
    searchText
  };

  await addReceipt(receipt);
  return receipt;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "TAKE_RECEIPT") {
    return;
  }

  handleReceiptRequest(message.payload, sender)
    .then((receipt) => sendResponse({ ok: true, receipt }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
