import { addReceipt } from "./idb.js";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function downloadBlob(blob, filename, saveAs) {
  const dataUrl = await blobToDataUrl(blob);
  return chrome.downloads.download({
    url: dataUrl,
    filename,
    conflictAction: "uniquify",
    saveAs: Boolean(saveAs)
  });
}

function getSettings() {
  return chrome.storage.sync.get({
    folderName: "xreceipts",
    saveAs: false
  });
}

function sanitizeSegment(value, fallback) {
  const trimmed = (value || "").trim();
  const cleaned = trimmed.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  const safe = cleaned.replace(/[^a-zA-Z0-9_-]/g, "");
  return safe || fallback;
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
  const dateStamp = timestamp.slice(0, 10).replace(/-/g, "");
  const authorSlug = sanitizeSegment(payload.author || payload.handle, "author");
  const idSlug = sanitizeSegment(payload.tweetId, receiptId);
  const baseName = `${dateStamp}_${authorSlug}_${idSlug}.png`;
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
