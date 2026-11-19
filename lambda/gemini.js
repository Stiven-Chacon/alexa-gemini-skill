/* *
 * Small Gemini client for the Alexa skill.
 * Uses Node's built-in https module (no extra dependencies) and a hard timeout,
 * because Alexa ends the request if the skill takes longer than 8 seconds.
 * */
const https = require('https');
const fs = require('fs');
const path = require('path');

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const TIMEOUT_MS = 6000;

const SYSTEM_PROMPT = [
  'Eres Nova. Hablas por Alexa, en español, en voz alta.',
  'No lees una ficha: estás en la conversación, rápida y con criterio, como alguien que sabe mucho y lo dice con naturalidad.',
  'Contesta primero lo que la persona quiere saber, en el mismo tono en que lo preguntó. Una frase basta si la pregunta es simple. Si hace falta matiz, añade una segunda idea concreta. Nunca pases de tres frases cortas, dichas de un tirón.',
  'Sé específica: da el dato, el nombre, el número o el porqué. Nada de resúmenes vagos.',
  'Responde a la intención, no solo a las palabras. Si falta un detalle para ayudar de verdad, pregunta una sola cosa, corta.',
  'Si no sabes algo o no estás segura, dilo claro y di hasta dónde sí llegas. No inventes.',
  'Nada de markdown, listas, viñetas, emojis, tablas, símbolos ni enlaces. Los números dílos como se pronuncian.',
  'Evita muletillas de asistente. No digas claro, por supuesto, como modelo de lenguaje, ni en qué más puedo ayudarte. No repitas la pregunta.',
].join(' ');

/* *
 * Reads GEMINI_API_KEY and GEMINI_MODEL from process.env, or from a local
 * lambda/.env file if it exists. The .env file is gitignored.
 * */
function loadConfig() {
  const config = {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
  };

  const envPath = path.join(__dirname, '.env');
  if ((!config.apiKey || !config.model) && fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const index = line.indexOf('=');
      if (index === -1 || line.trim().startsWith('#')) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (key === 'GEMINI_API_KEY' && !config.apiKey) config.apiKey = value;
      if (key === 'GEMINI_MODEL' && !config.model) config.model = value;
    }
  }

  return { apiKey: config.apiKey, model: config.model || DEFAULT_MODEL };
}

/* *
 * Removes characters that sound bad when Alexa reads them aloud
 * and escapes symbols that break SSML.
 * */
function sanitizeSpeech(text) {
  return text
    .replace(/[*_#`>~]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/&/g, ' y ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function postJson(url, body, headers) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
        timeout: TIMEOUT_MS,
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, json: JSON.parse(data) });
          } catch (error) {
            reject(new Error(`Invalid JSON from Gemini (status ${response.statusCode})`));
          }
        });
      }
    );

    request.on('timeout', () => {
      const error = new Error('Gemini request timed out');
      error.code = 'TIMEOUT';
      request.destroy(error);
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

/* *
 * Sends a question to Gemini and returns a short answer ready to be spoken.
 * */
async function askGemini(question) {
  const { apiKey, model } = loadConfig();
  if (!apiKey) {
    const error = new Error('Missing GEMINI_API_KEY');
    error.code = 'NO_API_KEY';
    throw error;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const { status, json } = await postJson(
    url,
    {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
    },
    { 'x-goog-api-key': apiKey }
  );

  if (status !== 200) {
    const error = new Error(`Gemini ${status}: ${json.error && json.error.message}`);
    error.code = status === 503 || status === 429 ? 'BUSY' : 'API_ERROR';
    throw error;
  }

  const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
  const answer = sanitizeSpeech(parts.map((part) => part.text || '').join(' '));
  if (!answer) {
    const error = new Error('Empty answer from Gemini');
    error.code = 'EMPTY';
    throw error;
  }

  return answer;
}

module.exports = { askGemini, sanitizeSpeech };
