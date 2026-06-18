export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, source = 'en', target = 'es' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const langPair = `${source}|${target}`;

  try {
    // MyMemory translation API – completely free, no API key required
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200) {
      const translatedText = data.responseData.translatedText;
      return res.status(200).json({ translatedText });
    } else {
      return res.status(500).json({ error: 'Translation failed', details: data.responseStatus });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Translation failed', details: error.message });
  }
}
