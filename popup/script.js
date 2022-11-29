const button = document.getElementById("button");

button.addEventListener("click", async () => {
  if (button.innerText.toLowerCase() === "start") {
    console.log("start");
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      let ppm = document.getElementById("ppm").value || 25;
      chrome.tabs.sendMessage(tabs[0].id, { action: "start", ppm });
    });
    button.innerText = "Stop";
  } else {
    console.log("stop");
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "stop" });
    });
    button.innerText = "Start";
  }
});
