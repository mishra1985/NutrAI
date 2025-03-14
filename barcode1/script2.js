const video = document.getElementById("video");
const startScanButton = document.getElementById("startScan");
const resultDisplay = document.getElementById("result");

const messageBox = document.getElementById("messageBox");
const messageText = document.getElementById("messageText");
const closeMessage = document.getElementById("closeMessage");

const codeReader = new ZXing.BrowserMultiFormatReader();
let scanning = false;

// Helper function: Enumerate devices and return the deviceId for the built-in camera
async function getInbuiltCameraId() {
  try {
    // Request temporary access to get device labels
    await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (err) {
    console.error("Error accessing camera for device enumeration:", err);
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === "videoinput");
  
  // If only one video device exists, assume it's the built-in camera.
  if (videoDevices.length === 1) return videoDevices[0].deviceId;
  
  // If multiple devices, try to pick the one with a label that suggests it's built-in.
  const builtIn = videoDevices.find(device => {
    const label = device.label.toLowerCase();
    return label.includes("integrated") || label.includes("built-in") || label.includes("internal");
  });
  
  return builtIn ? builtIn.deviceId : videoDevices[0].deviceId;
}

async function startScanner() {
  if (scanning) return;
  scanning = true;

  try {
    const deviceId = await getInbuiltCameraId();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    });
    video.srcObject = stream;

    codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
      if (result) {
        const barcode = result.text;
        resultDisplay.textContent = `Barcode: ${barcode}`;
        showMessage(`Scanned the Barcode Successfully! Barcode : ${barcode}`);
        fetchProductInfo(barcode);
        stopScanner(); // Stop scanning after a successful scan
      }
      if (err && !(err instanceof ZXing.NotFoundException)) {
        console.error(err);
      }
    });
  } catch (error) {
    console.error("Camera access error: ", error);
  }
}

function stopScanner() {
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  scanning = false;
}

function showMessage(message) {
  messageText.textContent = message;
  messageBox.style.display = "block";
}

closeMessage.addEventListener("click", () => {
  messageBox.style.display = "none";
});

function fetchProductInfo(barcode) {
  // Fetch product details from Open Food Facts API
  fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
    .then(response => response.json())
    .then(data => {
      if (data.status === 1) {
        const product = data.product;
        let productInfo = "\nProduct Details:";
        productInfo += `\nName: ${product.product_name || "N/A"}`;
        productInfo += `\nBrand: ${product.brands || "N/A"}`;
        productInfo += `\nCategories: ${product.categories || "N/A"}`;
        resultDisplay.textContent += productInfo;
      } else {
        resultDisplay.textContent += "\nProduct not found.";
      }
    })
    .catch(error => {
      console.error("Error fetching product info:", error);
      resultDisplay.textContent += "\nError fetching product information.";
    });
}

startScanButton.addEventListener("click", startScanner);
