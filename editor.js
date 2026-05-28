import { normalizeQuotes, parseEditorText } from "./shared.js";

const initialSample = await fetch("./data/quotes.json")
  .then((response) => response.json())
  .catch(() => []);

const editor = document.querySelector("#jsonEditor");
const status = document.querySelector("#editorStatus");
const form = document.querySelector("#quoteForm");

editor.value = JSON.stringify(normalizeQuotes(initialSample), null, 2);

function updateStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? "#b42318" : "";
}

function formatJson() {
  const { data, error } = parseEditorText(editor.value);
  if (error) {
    updateStatus("JSON 解析失败，请先修正格式。", true);
    return;
  }

  editor.value = JSON.stringify(data, null, 2);
  updateStatus(`已格式化，共 ${data.length} 条。`);
}

function addQuoteFromForm(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const draft = {
    volume: Number(formData.get("volume") ?? document.querySelector("#formVolume").value),
    jp: String(formData.get("jp") ?? document.querySelector("#formJp").value).trim(),
    zh: String(formData.get("zh") ?? document.querySelector("#formZh").value).trim()
  };

  const { data, error } = parseEditorText(editor.value);
  if (error) {
    updateStatus("当前 JSON 不合法，无法追加新条目。", true);
    return;
  }

  const next = normalizeQuotes([...data, draft]);
  editor.value = JSON.stringify(next, null, 2);
  form.reset();
  updateStatus(`已新增 1 条，当前共 ${next.length} 条。`);
}

function downloadJson() {
  const { data, error } = parseEditorText(editor.value);
  if (error) {
    updateStatus("JSON 不合法，不能下载。", true);
    return;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "quotes.json";
  anchor.click();
  URL.revokeObjectURL(url);
  updateStatus("已生成 quotes.json 下载。");
}

document.querySelector("#formatButton").addEventListener("click", formatJson);
document.querySelector("#downloadButton").addEventListener("click", downloadJson);
document.querySelector("#addQuoteButton").addEventListener("click", () => {
  document.querySelector("#formJp").focus();
});

form.addEventListener("submit", addQuoteFromForm);

[
  ["formVolume", "volume"],
  ["formJp", "jp"],
  ["formZh", "zh"]
].forEach(([id, name]) => {
  document.querySelector(`#${id}`).setAttribute("name", name);
});
