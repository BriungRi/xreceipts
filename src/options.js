const folderInput = document.querySelector("#folder");
const saveAsInput = document.querySelector("#saveAs");
const saveButton = document.querySelector("#save");
const status = document.querySelector("#status");

function setStatus(message) {
  status.textContent = message;
  if (message) {
    setTimeout(() => {
      status.textContent = "";
    }, 2000);
  }
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    folderName: "xreceipts",
    saveAs: false
  });

  folderInput.value = settings.folderName || "";
  saveAsInput.checked = Boolean(settings.saveAs);
}

async function saveSettings() {
  const folderName = folderInput.value.trim();
  await chrome.storage.sync.set({
    folderName,
    saveAs: saveAsInput.checked
  });
  setStatus("Saved");
}

saveButton.addEventListener("click", saveSettings);
loadSettings();
