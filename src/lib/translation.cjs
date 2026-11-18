const SUPPORTED_LANGUAGES = new Set(["en", "es", "fr", "de", "ja"]);
const MAX_TEXT_LENGTH = 500;

function parseTranslationInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "A JSON request body is required." };
  }

  if (typeof body.text !== "string") {
    return { ok: false, status: 400, error: "Text must be a string." };
  }
  const text = body.text.trim();
  if (!text) return { ok: false, status: 400, error: "Text cannot be empty." };
  if (text.length > MAX_TEXT_LENGTH) {
    return { ok: false, status: 413, error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.` };
  }

  const source = body.source === undefined ? "en" : body.source;
  const target = body.target === undefined ? "es" : body.target;
  if (typeof source !== "string" || !SUPPORTED_LANGUAGES.has(source)) {
    return { ok: false, status: 400, error: "Unsupported source language." };
  }
  if (typeof target !== "string" || !SUPPORTED_LANGUAGES.has(target)) {
    return { ok: false, status: 400, error: "Unsupported target language." };
  }
  if (source === target) {
    return { ok: false, status: 400, error: "Choose two different languages." };
  }

  return { ok: true, value: { text, source, target } };
}

function buildTranslationUrl({ text, source, target }) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${source}|${target}`);
  return url.toString();
}

module.exports = {
  MAX_TEXT_LENGTH,
  SUPPORTED_LANGUAGES,
  parseTranslationInput,
  buildTranslationUrl,
};
