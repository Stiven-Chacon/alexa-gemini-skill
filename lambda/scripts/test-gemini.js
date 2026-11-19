// Quick local test: asks Gemini a question using the key from the root .env
// Usage: node lambda/scripts/test-gemini.js "tu pregunta"
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
);

const apiKey = env.GEMINI_API_KEY;
const model = env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const question = process.argv.slice(2).join(' ') || '¿Cuál es la capital de Colombia?';

async function main() {
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en el archivo .env');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Eres Nova, un asistente de voz. Responde en español, claro y en máximo dos frases.' }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${data.error?.message}`);

  const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '(sin respuesta)';
  console.log(`Pregunta: ${question}`);
  console.log(`Respuesta: ${answer}`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
