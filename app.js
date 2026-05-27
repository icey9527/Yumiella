import { normalizeQuotes } from "./shared.js";

const state = {
  quotes: [],
  filteredQuotes: [],
  currentId: null
};

const quoteJp = document.querySelector("#quoteJp");
const quoteZh = document.querySelector("#quoteZh");
const metaVolume = document.querySelector("#metaVolume");
const metaPage = document.querySelector("#metaPage");
const quoteList = document.querySelector("#quoteList");
const quoteCount = document.querySelector("#quoteCount");
const volumeFilter = document.querySelector("#volumeFilter");
const searchInput = document.querySelector("#searchInput");
const menuButton = document.querySelector("#menuButton");
const sidebar = document.querySelector("#sidebar");
const backdrop = document.querySelector("#backdrop");
const imageDialog = document.querySelector("#imageDialog");
const imagePreviewCanvas = document.querySelector("#imagePreviewCanvas");

const imageControls = {
  jpFont: document.querySelector("#imageJpFont"),
  zhFont: document.querySelector("#imageZhFont"),
  jpSize: document.querySelector("#imageJpSize"),
  zhSize: document.querySelector("#imageZhSize"),
  metaSize: document.querySelector("#imageMetaSize"),
  padding: document.querySelector("#imagePadding"),
  jpLineHeight: document.querySelector("#imageJpLineHeight"),
  zhLineHeight: document.querySelector("#imageZhLineHeight")
};

const groupState = new Set();
let imageEditorState = null;

async function loadQuotes() {
  const response = await fetch("./data/quotes.json");
  const data = await response.json();
  state.quotes = normalizeQuotes(data);
  buildVolumeOptions();
  applyFilter();
  pickInitialQuote();
}

function buildVolumeOptions() {
  const volumes = [...new Set(state.quotes.map((quote) => quote.volume))].sort((a, b) => a - b);
  volumeFilter.innerHTML = "";
  volumeFilter.append(new Option("全部", "all"));

  volumes.forEach((volume) => {
    volumeFilter.append(new Option(`第 ${volume} 卷`, String(volume)));
  });
}

function applyFilter() {
  const filterValue = volumeFilter.value;
  const query = searchInput.value.trim().toLowerCase();

  let nextQuotes =
    filterValue === "all"
      ? state.quotes
      : state.quotes.filter((quote) => String(quote.volume) === filterValue);

  if (query) {
    nextQuotes = nextQuotes.filter((quote) => {
      const haystack = [
        quote.jp,
        quote.zh,
        String(quote.volume),
        String(quote.page),
        `第${quote.volume}卷`,
        `卷${quote.volume}`,
        `页${quote.page}`
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  state.filteredQuotes = nextQuotes;
  quoteCount.textContent = `${state.filteredQuotes.length} 条`;

  if (!state.filteredQuotes.some((quote) => quote.id === state.currentId)) {
    state.currentId = state.filteredQuotes[0]?.id ?? null;
  }

  renderList();
  renderCurrent();
}

function renderList() {
  quoteList.innerHTML = "";
  const groups = groupQuotesByVolume(state.filteredQuotes);

  groups.forEach(([volume, quotes]) => {
    const group = document.createElement("section");
    group.className = `quote-list__group${groupState.has(volume) ? " is-open" : ""}`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "quote-list__toggle";
    toggle.innerHTML = `
      <div>
        <strong>第 ${volume} 卷</strong>
        <span>${quotes.length} 条</span>
      </div>
      <i class="quote-list__chevron" aria-hidden="true"></i>
    `;

    toggle.addEventListener("click", () => {
      if (groupState.has(volume)) {
        groupState.delete(volume);
      } else {
        groupState.add(volume);
      }
      renderList();
    });

    const panel = document.createElement("div");
    panel.className = "quote-list__panel";

    quotes.forEach((quote) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `quote-list__item button--ghost${quote.id === state.currentId ? " is-active" : ""}`;
      button.innerHTML = `
        <strong>${escapeHtml(shorten(quote.zh, 18))}</strong>
        <small>页 ${quote.page}</small>
      `;
      button.addEventListener("click", () => {
        state.currentId = quote.id;
        groupState.add(volume);
        syncUrl(quote.id);
        renderList();
        renderCurrent();
        closeSidebar();
      });
      panel.append(button);
    });

    group.append(toggle, panel);
    quoteList.append(group);
  });
}

function renderCurrent() {
  const quote = state.filteredQuotes.find((item) => item.id === state.currentId);

  if (!quote) {
    quoteJp.textContent = "当前筛选下没有语录。";
    quoteZh.textContent = "可以切换卷号，或者先补充数据。";
    metaVolume.textContent = "卷 -";
    metaPage.textContent = "页 -";
    return;
  }

  quoteJp.textContent = quote.jp;
  quoteZh.textContent = quote.zh;
  metaVolume.textContent = `卷 ${quote.volume}`;
  metaPage.textContent = `页 ${quote.page}`;
}

function pickInitialQuote() {
  const url = new URL(window.location.href);
  const id = url.searchParams.get("id");
  const volume = url.searchParams.get("volume");

  if (volume && [...volumeFilter.options].some((option) => option.value === volume)) {
    volumeFilter.value = volume;
    applyFilter();
  }

  if (id && state.filteredQuotes.some((quote) => quote.id === id)) {
    state.currentId = id;
  } else {
    const randomQuote = state.filteredQuotes[Math.floor(Math.random() * state.filteredQuotes.length)];
    state.currentId = randomQuote?.id ?? null;
  }

  const currentQuote = state.filteredQuotes.find((quote) => quote.id === state.currentId);
  if (currentQuote) {
    groupState.add(currentQuote.volume);
  }

  syncUrl(state.currentId);
  renderList();
  renderCurrent();
}

function syncUrl(id) {
  const url = new URL(window.location.href);

  if (id) {
    url.searchParams.set("id", id);
  } else {
    url.searchParams.delete("id");
  }

  if (volumeFilter.value && volumeFilter.value !== "all") {
    url.searchParams.set("volume", volumeFilter.value);
  } else {
    url.searchParams.delete("volume");
  }

  window.history.replaceState({}, "", url);
}

function pickRandom() {
  if (!state.filteredQuotes.length) {
    return;
  }

  const currentIndex = state.filteredQuotes.findIndex((quote) => quote.id === state.currentId);
  const candidates = state.filteredQuotes.filter((_, index) => index !== currentIndex);
  const pool = candidates.length ? candidates : state.filteredQuotes;
  const next = pool[Math.floor(Math.random() * pool.length)];
  state.currentId = next.id;

  groupState.add(next.volume);
  syncUrl(next.id);
  renderList();
  renderCurrent();
}

async function copyLink() {
  const success = await copyText(window.location.href);
  if (!success && navigator.share) {
    try {
      await navigator.share({
        title: document.title,
        url: window.location.href
      });
      return;
    } catch {
      return;
    }
  }
}

async function copyText(value) {
  if (!value) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to legacy copy path for mobile browsers.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }

  textarea.remove();
  return success;
}

function generateImage() {
  openImageDialog();
}

function openImageDialog() {
  const quote = state.filteredQuotes.find((item) => item.id === state.currentId);
  if (!quote) {
    return;
  }

  imageEditorState = createImageStyleFromPage(quote);
  syncImageControls();
  renderImagePreview();
  imageDialog.showModal();
}

function createImageStyleFromPage(quote) {
  const jpStyle = window.getComputedStyle(quoteJp);
  const zhStyle = window.getComputedStyle(quoteZh);
  const metaStyle = window.getComputedStyle(metaVolume);

  return {
    quote,
    width: 1400,
    padding: 110,
    jpFontFamily: normalizeFontFamily(jpStyle.fontFamily, imageControls.jpFont.value),
    zhFontFamily: normalizeFontFamily(zhStyle.fontFamily, imageControls.zhFont.value),
    metaFontFamily: normalizeFontFamily(metaStyle.fontFamily, "'Songti SC', 'SimSun', 'Noto Serif SC', serif"),
    jpSize: Math.round(parseFloat(jpStyle.fontSize) * 2.2),
    zhSize: Math.round(parseFloat(zhStyle.fontSize) * 2.1),
    metaSize: Math.round(parseFloat(metaStyle.fontSize) * 1.75),
    jpLineHeight: Math.round(parseFloat(jpStyle.lineHeight) * 1.9),
    zhLineHeight: Math.round(parseFloat(zhStyle.lineHeight) * 1.8)
  };
}

function normalizeFontFamily(fontFamily, fallback) {
  if (!fontFamily || fontFamily === "inherit") {
    return fallback;
  }
  return fontFamily;
}

function syncImageControls() {
  imageControls.jpFont.value = pickMatchingOption(imageControls.jpFont, imageEditorState.jpFontFamily);
  imageControls.zhFont.value = pickMatchingOption(imageControls.zhFont, imageEditorState.zhFontFamily);
  imageControls.jpSize.value = String(imageEditorState.jpSize);
  imageControls.zhSize.value = String(imageEditorState.zhSize);
  imageControls.metaSize.value = String(imageEditorState.metaSize);
  imageControls.padding.value = String(imageEditorState.padding);
  imageControls.jpLineHeight.value = String(imageEditorState.jpLineHeight);
  imageControls.zhLineHeight.value = String(imageEditorState.zhLineHeight);
}

function pickMatchingOption(select, fontFamily) {
  const options = [...select.options];
  const matched = options.find((option) => option.value === fontFamily)
    || options.find((option) => fontFamily.includes(option.value.split(",")[0].replaceAll("'", "").trim()));
  return matched ? matched.value : select.options[0].value;
}

function updateImageEditorState() {
  if (!imageEditorState) {
    return;
  }

  imageEditorState.jpFontFamily = imageControls.jpFont.value;
  imageEditorState.zhFontFamily = imageControls.zhFont.value;
  imageEditorState.metaFontFamily = imageControls.zhFont.value.includes("KaiTi")
    ? "'Songti SC', 'SimSun', 'Noto Serif SC', serif"
    : imageControls.zhFont.value;
  imageEditorState.jpSize = Number(imageControls.jpSize.value);
  imageEditorState.zhSize = Number(imageControls.zhSize.value);
  imageEditorState.metaSize = Number(imageControls.metaSize.value);
  imageEditorState.padding = Number(imageControls.padding.value);
  imageEditorState.jpLineHeight = Number(imageControls.jpLineHeight.value);
  imageEditorState.zhLineHeight = Number(imageControls.zhLineHeight.value);
}

function renderImagePreview() {
  if (!imageEditorState) {
    return;
  }

  const canvas = imagePreviewCanvas;
  const context = canvas.getContext("2d");
  const { quote, width, padding, jpFontFamily, zhFontFamily, metaFontFamily, jpSize, zhSize, metaSize, jpLineHeight, zhLineHeight } = imageEditorState;

  const jpFont = `${jpSize}px ${jpFontFamily}`;
  const zhFont = `${zhSize}px ${zhFontFamily}`;
  const metaFont = `${metaSize}px ${metaFontFamily}`;

  const jpLines = wrapText(context, quote.jp, width - padding * 2, jpFont);
  const zhLines = wrapText(context, quote.zh, width - padding * 2, zhFont);
  const height = padding * 2 + 140 + jpLines.length * jpLineHeight + zhLines.length * zhLineHeight + 120;

  canvas.width = width;
  canvas.height = height;

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#f7f0e3");
  gradient.addColorStop(1, "#efe5d2");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(173, 119, 86, 0.12)";
  context.beginPath();
  context.arc(120, 120, 180, 0, Math.PI * 2);
  context.fill();

  roundRect(context, 64, 54, width - 128, height - 108, 36, "rgba(255, 252, 245, 0.9)", "rgba(62, 43, 29, 0.14)");

  let y = 130;
  context.fillStyle = "#8a4f2d";
  context.font = metaFont;
  context.fillText(`卷 ${quote.volume} · 页 ${quote.page}`, padding, y);

  y += Math.max(64, metaSize + 34);
  context.fillStyle = "#5c4b3f";
  context.font = jpFont;
  drawWrappedText(context, jpLines, padding, y, jpLineHeight);

  y += jpLines.length * jpLineHeight + 34;
  context.strokeStyle = "rgba(62, 43, 29, 0.14)";
  context.beginPath();
  context.moveTo(padding, y);
  context.lineTo(width - padding, y);
  context.stroke();

  y += 64;
  context.fillStyle = "#2e241d";
  context.font = zhFont;
  drawWrappedText(context, zhLines, padding, y, zhLineHeight);
}

function downloadImage() {
  if (!imageEditorState) {
    return;
  }

  renderImagePreview();
  const link = document.createElement("a");
  link.href = imagePreviewCanvas.toDataURL("image/png");
  link.download = `${imageEditorState.quote.id}.png`;
  link.click();
}

function resetImageStyle() {
  const quote = state.filteredQuotes.find((item) => item.id === state.currentId);
  if (!quote) {
    return;
  }
  imageEditorState = createImageStyleFromPage(quote);
  syncImageControls();
  renderImagePreview();
}

function wrapText(context, text, maxWidth, font) {
  context.font = font;
  const chars = Array.from(text);
  const lines = [];
  let current = "";

  chars.forEach((char) => {
    const next = current + char;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawWrappedText(context, lines, x, y, lineHeight) {
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function roundRect(context, x, y, width, height, radius, fillStyle, strokeStyle) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
  context.strokeStyle = strokeStyle;
  context.stroke();
}

function groupQuotesByVolume(quotes) {
  const map = new Map();

  quotes.forEach((quote) => {
    if (!map.has(quote.volume)) {
      map.set(quote.volume, []);
    }
    map.get(quote.volume).push(quote);
  });

  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function openSidebar() {
  sidebar.classList.add("is-open");
  backdrop.hidden = false;
  menuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  backdrop.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function shorten(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

document.querySelector("#randomButton").addEventListener("click", pickRandom);
document.querySelector("#copyLinkButton").addEventListener("click", () => {
  void copyLink();
});
document.querySelector("#copyJpButton").addEventListener("click", () => {
  void copyText(quoteJp.textContent);
});
document.querySelector("#copyZhButton").addEventListener("click", () => {
  void copyText(quoteZh.textContent);
});
document.querySelector("#imageButton").addEventListener("click", generateImage);
document.querySelector("#downloadImageButton").addEventListener("click", downloadImage);
document.querySelector("#resetImageStyleButton").addEventListener("click", resetImageStyle);
document.querySelector("#closeImageDialogButton").addEventListener("click", () => {
  imageDialog.close();
});

Object.values(imageControls).forEach((control) => {
  control.addEventListener("input", () => {
    updateImageEditorState();
    renderImagePreview();
  });
});

volumeFilter.addEventListener("change", () => {
  groupState.clear();
  applyFilter();

  const currentQuote = state.filteredQuotes.find((quote) => quote.id === state.currentId);
  if (currentQuote) {
    groupState.add(currentQuote.volume);
  }

  syncUrl(state.currentId);
});

searchInput.addEventListener("input", () => {
  groupState.clear();
  applyFilter();

  const currentQuote = state.filteredQuotes.find((quote) => quote.id === state.currentId);
  if (currentQuote) {
    groupState.add(currentQuote.volume);
  }
});

menuButton.addEventListener("click", () => {
  if (sidebar.classList.contains("is-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

backdrop.addEventListener("click", closeSidebar);

loadQuotes().catch(() => {
  quoteJp.textContent = "语录数据加载失败。";
  quoteZh.textContent = "请确认 data/quotes.json 存在且 JSON 格式正确。";
});
