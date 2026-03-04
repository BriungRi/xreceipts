# X Receipts

Save tweet receipts from X: capture a screenshot of the tweet and store its contents for search.

## What it does

- Adds a **🧾 Take Receipt** item to the tweet overflow menu.
- Captures the visible tweet, crops the screenshot, and downloads it to `Downloads/xreceipts/`.
- Stores tweet text + metadata in IndexedDB for fast local search.
- Settings page lets you change the download folder or prompt every save.

## Install (Chrome)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

## Usage

1. Open a tweet on `x.com`.
2. Open the overflow menu (three dots).
3. Click **🧾 Take Receipt**.
4. Open the extension popup to search receipts.
5. Use **Settings** to choose the download location.

## Notes

- Screenshots are saved to your local Downloads folder under `xreceipts/` by default.
- Enable **Ask me where to save each receipt** to pick a location every time.
- If a tweet is partially off-screen, scroll it into view before capturing.
