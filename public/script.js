const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusText = document.getElementById("statusText");
const previewCard = document.getElementById("previewCard");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const outputImage = document.getElementById("output");
const countSelect = document.getElementById("imageCount");
const modeSelect = document.getElementById("imageMode");
const userPhoneInput = document.getElementById("userPhone");
const userNameInput = document.getElementById("userName");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const subscribeBtn = document.getElementById("subscribeBtn");
const accountStatus = document.getElementById("accountStatus");
const subscriptionStatus = document.getElementById("subscriptionStatus");
const historyList = document.getElementById("historyList");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatStatusText = document.getElementById("chatStatusText");
const chatHistory = document.getElementById("chatHistory");
const serverStatus = document.getElementById("serverStatus");
const serverInfoList = document.getElementById("serverInfoList");

let currentUser = null;

if (generateBtn) generateBtn.addEventListener("click", generateImage);
if (downloadBtn) downloadBtn.addEventListener("click", downloadImage);
if (loginBtn) loginBtn.addEventListener("click", loginUser);
if (registerBtn) registerBtn.addEventListener("click", registerUser);
if (subscribeBtn) subscribeBtn.addEventListener("click", subscribeUser);
if (sendChatBtn) sendChatBtn.addEventListener("click", sendChatMessage);

const savedUser = localStorage.getItem("pixelforgeUser");
if (savedUser) {
  currentUser = JSON.parse(savedUser);
  if (historyList) loadHistory();
  if (accountStatus) {
    updateAccountStatus(`Signed in as ${currentUser.name}.`, "success");
  }
  if (subscriptionStatus) {
    subscriptionStatus.textContent = currentUser.subscription ? "Subscription active." : "Subscription required for editing and upscaling.";
  }
}

if (serverStatus || serverInfoList) {
  loadServerSystemInfo();
}

async function generateImage() {
  const prompt = promptInput?.value.trim();
  const count = countSelect ? Number(countSelect.value) : 1;
  const mode = modeSelect ? modeSelect.value : "generate";

  if (!prompt) {
    updateStatus("Please enter a prompt to generate an image.", "error");
    promptInput?.focus();
    return;
  }

  setLoading(true, "Generating your image…");

  try {
    if ((mode === "edit" || mode === "upscale") && !currentUser?.subscription) {
      throw new Error("Subscribe to use editing and upscaling modes.");
    }

    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, userId: currentUser?.id, count, mode })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Unknown error");
    }

    const generatedImages = data.images?.length ? data.images : data.image ? [data.image] : [];
    if (generatedImages.length) {
      outputImage.src = generatedImages[0];
      outputImage.hidden = false;
      previewPlaceholder.hidden = true;
      downloadBtn.disabled = false;
      updateStatus(`Generated ${generatedImages.length} image(s). Download the first one or view history.`, "success");
      if (currentUser) {
        persistUser();
        loadHistory();
      }
    }
  } catch (error) {
    console.error(error);
    updateStatus(error.message || "Oops! Something went wrong while generating the image.", "error");
  } finally {
    setLoading(false);
  }
}

function downloadImage() {
  const imageUrl = outputImage.src;
  if (!imageUrl) {
    updateStatus("No generated image available to download.", "error");
    return;
  }

  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = "pixelforge-image.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function registerUser() {
  const name = userNameInput?.value.trim();
  const phone = userPhoneInput?.value.trim();

  if (!name || !phone) {
    updateAccountStatus("Name and phone are required.", "error");
    return;
  }

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Registration failed");
    }
    currentUser = data.user;
    updateAccountStatus(`Registered as ${currentUser.name}.`, "success");
    if (historyList) loadHistory();
  } catch (error) {
    console.error(error);
    updateAccountStatus(error.message || "Registration failed.", "error");
  }
}

async function loginUser() {
  const phone = userPhoneInput?.value.trim();
  if (!phone) {
    updateAccountStatus("Phone is required for login.", "error");
    return;
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Login failed");
    }
    currentUser = data.user;
    persistUser();
    updateAccountStatus(`Signed in as ${currentUser.name}.`, "success");
    if (subscriptionStatus) {
      subscriptionStatus.textContent = currentUser.subscription ? "Subscription active." : "Subscription required for editing and upscaling.";
    }
    if (historyList) loadHistory();
  } catch (error) {
    console.error(error);
    updateAccountStatus(error.message || "Login failed.", "error");
  }
}

async function subscribeUser() {
  if (!currentUser) {
    updateAccountStatus("Login to subscribe.", "error");
    return;
  }

  try {
    const response = await fetch("/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Subscription failed");
    }
    currentUser = data.user;
    persistUser();
    updateAccountStatus(`Subscribed as ${currentUser.name}.`, "success");
    if (subscriptionStatus) {
      subscriptionStatus.textContent = "Subscription active.";
    }
  } catch (error) {
    console.error(error);
    updateAccountStatus(error.message || "Subscription failed.", "error");
  }
}

async function loadHistory() {
  if (!currentUser || !historyList) return;

  try {
    const response = await fetch(`/history?userId=${encodeURIComponent(currentUser.id)}`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Unable to load history");
    }

    historyList.innerHTML = data.history.length
      ? data.history.map((entry) => formatHistoryItem(entry)).join("")
      : `<li>No history yet. Generate an image to save it.</li>`;
  } catch (error) {
    console.error(error);
    historyList.innerHTML = `<li>Unable to load history.</li>`;
  }
}

function formatHistoryItem(entry) {
  const date = new Date(entry.createdAt).toLocaleString();
  const firstImage = entry.images?.[0] || "";
  return `
    <li class="history-item">
      <strong>${date}</strong>
      <p>${entry.prompt}</p>
      ${firstImage ? `<img src="${firstImage}" alt="History preview" class="history-img">` : ""}
    </li>
  `;
}

function updateStatus(message, type = "") {
  if (!statusText) return;
  statusText.textContent = message;
  statusText.className = type ? `status ${type}` : "status";
}

function updateAccountStatus(message, type = "") {
  if (!accountStatus) return;
  accountStatus.textContent = message;
  accountStatus.className = type ? `account-status ${type}` : "account-status";
}

async function loadServerSystemInfo() {
  if (!serverStatus || !serverInfoList) return;
  try {
    const response = await fetch("/system");
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Unable to load server info.");
    }
    const info = data.systemInfo;
    serverStatus.textContent = `Server running on ${info.hostname}, ${info.platform} ${info.release}.`;
    serverInfoList.innerHTML = `
      <li>Uptime: ${Math.floor(info.uptimeSeconds / 60)}m ${info.uptimeSeconds % 60}s</li>
      <li>Node.js: ${info.nodeVersion}</li>
      <li>Memory: ${info.memory.freeMB}/${info.memory.totalMB} MB free</li>
    `;
  } catch (error) {
    serverStatus.textContent = error.message || "Server system information unavailable.";
    serverInfoList.innerHTML = "";
  }
}

function appendChatMessage(role, message) {
  if (!chatHistory) return;
  const item = document.createElement("div");
  item.className = `chat-item chat-${role}`;
  item.innerHTML = `<p>${message}</p>`;
  chatHistory.appendChild(item);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function sendChatMessage() {
  const prompt = chatInput?.value.trim();
  if (!prompt) {
    if (chatStatusText) chatStatusText.textContent = "Type a message to chat with AI.";
    return;
  }

  appendChatMessage("user", prompt);
  if (chatInput) chatInput.value = "";
  if (chatStatusText) chatStatusText.textContent = "Waiting for AI response…";

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Chat failed");
    }
    appendChatMessage("assistant", data.reply);
    if (chatStatusText) chatStatusText.textContent = "AI assistant ready.";
  } catch (error) {
    console.error(error);
    if (chatStatusText) chatStatusText.textContent = error.message || "Chat request failed.";
  }
}


function setLoading(isLoading, message = "") {
  if (generateBtn) generateBtn.disabled = isLoading;
  if (downloadBtn) downloadBtn.disabled = isLoading || !outputImage?.src;
  if (generateBtn) generateBtn.textContent = isLoading ? "Generating…" : "Generate Image";
  updateStatus(message);
}
