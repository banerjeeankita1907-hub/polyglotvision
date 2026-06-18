export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, source = 'en', target = 'es' } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  try {
    const response = await fetch('https://translate.argosopentech.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' }),
    });
    const data = await response.json();
    res.status(200).json({ translatedText: data.translatedText || text });
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
}
