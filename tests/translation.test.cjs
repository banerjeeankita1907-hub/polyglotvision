const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_TEXT_LENGTH,
  parseTranslationInput,
  buildTranslationUrl,
} = require("../src/lib/translation.cjs");

test("accepts and trims valid translation input with defaults", () => {
  const result = parseTranslationInput({ text: "  Hello there  " });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { text: "Hello there", source: "en", target: "es" });
});

test("rejects missing, malformed, and empty input", () => {
  for (const body of [undefined, null, "hello", [], {}, { text: 123 }, { text: "  " }]) {
    assert.equal(parseTranslationInput(body).ok, false);
  }
});

test("enforces the text length limit", () => {
  assert.equal(parseTranslationInput({ text: "x".repeat(MAX_TEXT_LENGTH) }).ok, true);
  const over = parseTranslationInput({ text: "x".repeat(MAX_TEXT_LENGTH + 1) });
  assert.equal(over.ok, false);
  assert.equal(over.status, 413);
});

test("rejects unsupported language codes and same-language pairs", () => {
  assert.equal(parseTranslationInput({ text: "hello", source: "xx", target: "es" }).ok, false);
  assert.equal(parseTranslationInput({ text: "hello", source: "en", target: "zz" }).ok, false);
  assert.equal(parseTranslationInput({ text: "hello", source: "en", target: "en" }).ok, false);
});

test("builds a URL with safely encoded text and language pair", () => {
  const parsed = new URL(buildTranslationUrl({ text: "hello & welcome?", source: "en", target: "fr" }));
  assert.equal(parsed.origin, "https://api.mymemory.translated.net");
  assert.equal(parsed.searchParams.get("q"), "hello & welcome?");
  assert.equal(parsed.searchParams.get("langpair"), "en|fr");
});
