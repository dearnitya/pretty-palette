document.getElementById("open-studio").addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:5173/" });
});
