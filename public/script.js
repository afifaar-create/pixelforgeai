const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusText = document.getElementById("statusText");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const outputImage = document.getElementById("outputImage");
const imageCountSelect = document.getElementById("imageCount");
const imageStyleSelect = document.getElementById("imageStyle");
const generatedGallery = document.getElementById("generatedGallery");
const enhancePromptBtn = document.getElementById("enhancePromptBtn");
const historyList = document.getElementById("historyList");
const historyEmptyState = document.getElementById("historyEmptyState");
const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector(".primary-nav");
const faqButtons = document.querySelectorAll(".faq-question");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatInput = document.getElementById("chatInput");
const chatStatusText = document.getElementById("chatStatusText");
const chatHistory = document.getElementById("chatHistory");
const lightboxOverlay = document.getElementById("lightboxOverlay");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const galleryCards = document.querySelectorAll("[data-lightbox]");

if (generateBtn) generateBtn.addEventListener("click", generateImage);
if (downloadBtn) downloadBtn.addEventListener("click", downloadImage);
if (enhancePromptBtn) enhancePromptBtn.addEventListener("click", enhancePrompt);
if (sendChatBtn) sendChatBtn.addEventListener("click", sendChatMessage);
if (chatInput) {
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  });
}
if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);

function closeMobileNav() {
  if (!navToggle || !primaryNav) return;
  navToggle.setAttribute("aria-expanded", "false");
  primaryNav.classList.add("hidden");
  primaryNav.classList.remove("flex");
}

function toggleMobileNav() {
  if (!navToggle || !primaryNav) return;
  const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isExpanded));
  primaryNav.classList.toggle("hidden");
  primaryNav.classList.toggle("flex");
}

// Mobile navigation toggle
if (navToggle && primaryNav) {
  navToggle.addEventListener("click", toggleMobileNav);
  primaryNav.querySelectorAll("a, button").forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });
}

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) {
    closeMobileNav();
  }
});

if (promptInput) {
  promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      generateImage();
    }
  });
}

if (lightboxOverlay) {
  lightboxOverlay.addEventListener("click", (event) => {
    if (event.target === lightboxOverlay) {
      closeLightbox();
    }
  });
}

galleryCards.forEach((card) => {
  card.addEventListener("click", () => {
    const src = card.getAttribute("data-lightbox");
    if (src) {
      openLightbox(src);
    }
  });
});

faqButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    const answer = button.nextElementSibling;
    if (answer) {
      answer.classList.toggle("open", !expanded);
    }
  });
});

const HISTORY_KEY = "pixelforge-history";

function updateStatus(message, type = "") {
  if (!statusText) return;
  statusText.textContent = message;
  statusText.className = type ? `status ${type}` : "status";
  statusText.setAttribute("aria-live", "polite");
}

function setLoading(isLoading, message = "") {
  if (generateBtn) generateBtn.disabled = isLoading;
  if (downloadBtn) downloadBtn.disabled = isLoading || !outputImage?.src;
  if (generateBtn) generateBtn.textContent = isLoading ? "Generating…" : "Generate image";
  updateStatus(message);
}

function renderGeneratedImages(images = []) {
  if (!generatedGallery) return;

  generatedGallery.innerHTML = "";
  if (!images.length) {
    generatedGallery.hidden = true;
    return;
  }

  generatedGallery.hidden = false;
  images.forEach((imageUrl) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/80 text-left";
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "Generated artwork";
    image.className = "h-40 w-full object-cover";
    image.loading = "lazy";
    image.decoding = "async";
    card.appendChild(image);
    card.addEventListener("click", () => {
      if (outputImage) {
        outputImage.src = imageUrl;
        outputImage.hidden = false;
      }
      if (previewPlaceholder) {
        previewPlaceholder.hidden = true;
      }
      if (downloadBtn) {
        downloadBtn.disabled = false;
      }
      if (outputImage?.src) {
        openLightbox(imageUrl);
      }
    });
    generatedGallery.appendChild(card);
  });
}

function loadHistory() {
  if (!historyList || !historyEmptyState) return [];

  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveHistoryItem(entry) {
  const history = loadHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, 6);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error(error);
  }
  renderHistory(trimmed);
}

function renderHistory(items = loadHistory()) {
  if (!historyList || !historyEmptyState) return;

  if (!items.length) {
    historyEmptyState.hidden = false;
    historyList.innerHTML = "";
    return;
  }

  historyEmptyState.hidden = true;
  historyList.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-card flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-2 text-left transition hover:border-skyglow/40";
    button.dataset.historyImage = item.imageUrl;

    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = "Saved generation";
    image.className = "h-14 w-14 rounded-xl object-cover";
    image.loading = "lazy";
    image.decoding = "async";

    const content = document.createElement("div");
    content.className = "min-w-0";

    const title = document.createElement("p");
    title.className = "truncate text-sm font-medium text-white";
    title.textContent = item.prompt;

    const meta = document.createElement("p");
    meta.className = "text-xs text-slate-500";
    meta.textContent = new Date(item.createdAt).toLocaleString();

    content.appendChild(title);
    content.appendChild(meta);
    button.appendChild(image);
    button.appendChild(content);

    button.addEventListener("click", () => {
      const imageUrl = button.dataset.historyImage;
      if (imageUrl) {
        if (outputImage) {
          outputImage.src = imageUrl;
          outputImage.hidden = false;
        }
        if (previewPlaceholder) {
          previewPlaceholder.hidden = true;
        }
        if (downloadBtn) {
          downloadBtn.disabled = false;
        }
        openLightbox(imageUrl);
      }
    });

    historyList.appendChild(button);
  });
}

function enhancePrompt() {
  const prompt = promptInput?.value.trim();
  if (!prompt) {
    updateStatus("Enter a prompt first, then refine it.", "error");
    return;
  }

  const style = imageStyleSelect ? imageStyleSelect.value : "Modern";
  const enhanced = `Create a ${style.toLowerCase()} version of: ${prompt}. Make it vivid, highly detailed, cinematic, well-composed, and visually premium.`;
  if (promptInput) {
    promptInput.value = enhanced;
  }
  updateStatus("Prompt refined for stronger, more detailed results.", "success");
}

async function generateImage() {
  const prompt = promptInput?.value.trim();
  const count = imageCountSelect ? Number(imageCountSelect.value) : 1;
  const style = imageStyleSelect ? imageStyleSelect.value : "Modern";

  if (!prompt) {
    updateStatus("Please enter a prompt to generate an image.", "error");
    promptInput?.focus();
    return;
  }

  setLoading(true, "Generating your image...");

  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: `${prompt} in a ${style} style`, count, mode: "generate" })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Image generation failed.");
    }

    const images = data.images || [];
    const imageSource = images[0] || data.image;
    if (imageSource) {
      if (outputImage) {
        outputImage.src = imageSource;
        outputImage.hidden = false;
      }
      if (previewPlaceholder) {
        previewPlaceholder.hidden = true;
      }
      if (downloadBtn) {
        downloadBtn.disabled = false;
      }
      renderGeneratedImages(images);
      saveHistoryItem({
        prompt,
        imageUrl: imageSource,
        createdAt: new Date().toISOString()
      });
      updateStatus(`Generated ${images.length || 1} image${images.length === 1 ? "" : "s"} successfully.`, "success");
    } else {
      renderGeneratedImages([]);
      updateStatus("No images were returned from the generator.", "error");
    }
  } catch (error) {
    console.error(error);
    updateStatus(error?.message || "Something went wrong while generating the image.", "error");
  } finally {
    setLoading(false);
  }
}

function downloadImage() {
  if (!outputImage?.src) {
    updateStatus("No generated image available to download.", "error");
    return;
  }

  const link = document.createElement("a");
  link.href = outputImage.src;
  link.download = "pixelforge-image.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function appendChatMessage(role, message) {
  if (!chatHistory) return;
  const bubble = document.createElement("div");
  bubble.className = `chat-item chat-${role}`;
  bubble.innerHTML = `<p>${message}</p>`;
  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function sendChatMessage() {
  const prompt = chatInput?.value.trim();
  if (!prompt) {
    if (chatStatusText) chatStatusText.textContent = "Ask the AI for prompt ideas or creative direction.";
    return;
  }

  if (sendChatBtn) sendChatBtn.disabled = true;
  appendChatMessage("user", prompt);
  if (chatInput) chatInput.value = "";
  if (chatStatusText) chatStatusText.textContent = "Waiting for AI response...";

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Chat request failed.");
    }
    appendChatMessage("assistant", data.reply);
    if (chatStatusText) chatStatusText.textContent = "AI assistant ready to help.";
  } catch (error) {
    console.error(error);
    if (chatStatusText) chatStatusText.textContent = error?.message || "Unable to reach the AI assistant.";
    appendChatMessage("assistant", error?.message || "Unable to reach the AI assistant.");
  } finally {
    if (sendChatBtn) sendChatBtn.disabled = false;
  }
}

function openLightbox(src) {
  if (!lightboxOverlay || !lightboxImage) return;
  lightboxImage.src = src;
  lightboxOverlay.classList.remove("hidden");
  lightboxOverlay.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  if (!lightboxOverlay || !lightboxImage) return;
  lightboxOverlay.classList.add("hidden");
  lightboxOverlay.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
}

renderHistory();

// Donation functionality
const donateNavBtn = document.getElementById("donateNavBtn");
const donateAmountBtns = document.querySelectorAll(".donate-amount-btn");
const donateMonthlyBtns = document.querySelectorAll(".donate-monthly-btn");

if (donateNavBtn) {
  donateNavBtn.addEventListener("click", () => {
    const donateSection = document.getElementById("donate");
    if (donateSection) {
      donateSection.scrollIntoView({ behavior: "smooth" });
    }
  });
}

donateAmountBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const amount = btn.getAttribute("data-amount");
    processDonation(amount, false);
  });
});

donateMonthlyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const amount = btn.getAttribute("data-amount");
    processDonation(amount, true);
  });
});

function processDonation(amount, isMonthly) {
  // You can integrate with PayPal, Stripe, or your preferred payment processor
  // For now, we'll show an alert and redirect to a donation page
  const interval = isMonthly ? "monthly" : "one-time";
  alert(`Thank you for supporting PixelForge AI with a ${interval} donation of $${amount}!`);
  
  // Example: Redirect to PayPal
  // window.location.href = `https://www.paypal.com/donate?hosted_button_id=YOUR_BUTTON_ID`;
  
  // Example: Redirect to your custom payment page
  // window.location.href = `/donate?amount=${amount}&interval=${interval}`;
}

function promptCustomAmount() {
  const amount = prompt("Enter donation amount ($):", "10");
  if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
    processDonation(amount, false);
  }
}

function promptCustomMonthly() {
  const amount = prompt("Enter monthly donation amount ($):", "20");
  if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
    processDonation(amount, true);
  }
}

function openLink(url) {
  // Verify it's a valid URL before opening
  if (url.startsWith("http") || url.startsWith("mailto:")) {
    window.open(url, "_blank");
  }
}
