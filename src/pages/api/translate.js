const { parseTranslationInput, buildTranslationUrl } = require("../../lib/translation.cjs");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const parsed = parseTranslationInput(req.body);
  if (!parsed.ok) return res.status(parsed.status).json({ error: parsed.error });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(buildTranslationUrl(parsed.value), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return res.status(502).json({ error: "Translation provider is unavailable." });
    }

    const data = await response.json();
    const translatedText = data?.responseData?.translatedText;
    if (data?.responseStatus !== 200 || typeof translatedText !== "string" || !translatedText.trim()) {
      return res.status(502).json({ error: "Translation provider returned no translation." });
    }
    return res.status(200).json({ translatedText: translatedText.trim() });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "Translation request timed out." });
    }
    return res.status(502).json({ error: "Translation provider is unavailable." });
  } finally {
    clearTimeout(timeout);
  }
}
