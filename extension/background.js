chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "extract-pretty-palette",
    title: "Extract Palette with Pretty Palette ₊˚⊹",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "extract-pretty-palette" && info.srcUrl) {
    const encodedUrl = encodeURIComponent(info.srcUrl);
    const targetUrl = `http://localhost:5173/?img=${encodedUrl}`;
    chrome.tabs.create({ url: targetUrl });
  }
});
