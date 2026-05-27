const ID_PAD = 3;

export function slugifyQuote(quote, index) {
  if (quote.id && String(quote.id).trim()) {
    return String(quote.id).trim();
  }

  const volume = String(quote.volume ?? 0).padStart(2, "0");
  const page = String(quote.page ?? 0).padStart(3, "0");
  const serial = String(index + 1).padStart(ID_PAD, "0");
  return `v${volume}-p${page}-${serial}`;
}

export function normalizeQuotes(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item) => item && item.jp && item.zh)
    .map((item, index) => ({
      id: slugifyQuote(item, index),
      jp: String(item.jp).trim(),
      zh: String(item.zh).trim(),
      volume: Number(item.volume) || 0,
      page: Number(item.page) || 0
    }));
}

export function parseEditorText(text) {
  try {
    const parsed = JSON.parse(text);
    return { data: normalizeQuotes(parsed), error: null };
  } catch (error) {
    return { data: [], error };
  }
}
