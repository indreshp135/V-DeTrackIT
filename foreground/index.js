let objectDetector;
let current = "stop";
let objects = [];
let identifiedObjects = {};
let canvas, ctx;
let width;
let height;
let frameNumber = 0;
let ppm = 8.8;

const video = document.getElementsByTagName("video")[0];

function startDetecting() {
  console.log("model ready");
  detect();
}

function detect() {
  objectDetector.detect(video, function (err, results) {
    if (err) {
      console.log(err);
      return;
    }
    objects = results;

    if (objects) {
      objects.forEach((object) => {
        object.w = object.width;
        object.h = object.height;
        object.name = object.label;
      });
      updateTrackedItemsWithNewFrame(objects, frameNumber);
      draw();
    }

    if (current === "start") {
      frameNumber += 1;
      detect();
    }
  });
}

function draw() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(video, 0, 0);
  const items = getJSONOfTrackedItems();
  for (let i = 0; i < items.length; i += 1) {
    if (["bus", "car", "truck"].includes(items[i].name)) {
      ctx.font = "16px Arial";
      ctx.fillStyle = "#0000FF";
      speed = getSpeed(items[i].speed).toFixed(2);
      ctx.fillText(`${items[i].name} ${speed} kmph`, items[i].x, items[i].y);

      ctx.beginPath();
      ctx.rect(items[i].x, items[i].y, items[i].w, items[i].h);
      ctx.strokeWidth = 7;
      if (speed > 60) {
        ctx.strokeStyle = "#FF0000";
      } else {
        ctx.strokeStyle = "#00FF00";
      }
      ctx.stroke();
      ctx.closePath();
    }
  }
}

function createCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  canvas.style.position = "fixed";
  canvas.style.bottom = "20px";
  canvas.style.right = "20px";
  canvas.style.zIndex = "1000";
  canvas.style.pointerEvents = "none";

  document.body.appendChild(canvas);
  return canvas;
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log(request);
  if (request.action === "start") {
    ppm = parseFloat(request.ppm);
    frameNumber = 0;
    current = "start";
    if (video) {
      width = video.videoWidth;
      height = video.videoHeight;
      canvas = createCanvas(width, height);
      ctx = canvas.getContext("2d");
      objectDetector = await ml5.objectDetector("cocossd", startDetecting);
    } else {
      alert("No video found");
    }
  }
  if (request.action === "stop") {
    canvas.remove();
    current = "stop";
    console.log("stop");
  }
});

function getSpeed(speed) {
  const fps = 1000 / (1000 / 30);

  const distance = speed / ppm;
  console.log(distance, ppm);

  const speedKmph = (distance * fps * 60 * 60) / 1000;
  return speedKmph;
}
