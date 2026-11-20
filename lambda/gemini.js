/* *
 * Small Gemini client for the Alexa skill.
 * Uses Node's built-in https module (no extra dependencies) with a shared
 * keep-alive agent, a total time budget and one quick retry on 503/429,
 * because Alexa ends the request if the skill takes longer than 8 seconds.
 * */
const https = require('https');
const fs = require('fs');
const path = require('path');

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const TOTAL_BUDGET_MS = 7000; // whole askGemini() call, retries included
const MIN_RETRY_BUDGET_MS = 2500; // only retry if at least this much time is left
const RETRY_DELAY_MS = 300;
const MAX_OUTPUT_TOKENS = 120;

const SYSTEM_PROMPT = [
  'Eres Nova y respondes por voz en Alexa, en español.',
  'Contesta directo con el dato concreto, en una a tres frases cortas, y si no lo sabes dilo sin inventar.',
  'Sin markdown, listas, emojis, símbolos ni enlaces.',
].join(' ');

// Reused across invocations while the Lambda container stays warm,
// so TLS handshakes with Google are not repeated on every question.
const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });

let cachedConfig = null;

/* *
 * Reads GEMINI_API_KEY and GEMINI_MODEL from process.env, or from a local
 * lambda/.env file if it exists. The .env file is gitignored.
 * The result is cached so the file is read only once per container.
 * */
function loadConfig() {
  if (cachedConfig) return cachedConfig;

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

  cachedConfig = { apiKey: config.apiKey, model: config.model || DEFAULT_MODEL };
  return cachedConfig;
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

function postJson(url, body, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      url,
      {
        method: 'POST',
        agent,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          clearTimeout(timer);
          try {
            resolve({ status: response.statusCode, json: JSON.parse(data) });
          } catch (error) {
            reject(new Error(`Invalid JSON from Gemini (status ${response.statusCode})`));
          }
        });
      }
    );

    // Hard deadline for the whole request (not just socket inactivity).
    const timer = setTimeout(() => {
      const error = new Error(`Gemini request timed out after ${timeoutMs} ms`);
      error.code = 'TIMEOUT';
      request.destroy(error);
    }, timeoutMs);

    request.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    request.write(payload);
    request.end();
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* *
 * Sends a question to Gemini and returns a short answer ready to be spoken.
 * Logs how long each generateContent call takes.
 * */
async function askGemini(question) {
  const { apiKey, model } = loadConfig();
  if (!apiKey) {
    const error = new Error('Missing GEMINI_API_KEY');
    error.code = 'NO_API_KEY';
    throw error;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.5 },
  };

  const startedAt = Date.now();
  let attempt = 0;

  while (true) {
    attempt += 1;
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    const callStart = Date.now();
    let status;
    let json;

    try {
      ({ status, json } = await postJson(url, body, { 'x-goog-api-key': apiKey }, remaining));
    } finally {
      console.log(`~~~~ generateContent attempt ${attempt} (${model}): ${Date.now() - callStart} ms, status ${status || 'n/a'}`);
    }

    if (status === 200) {
      const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
      const answer = sanitizeSpeech(parts.map((part) => part.text || '').join(' '));
      if (!answer) {
        const error = new Error('Empty answer from Gemini');
        error.code = 'EMPTY';
        throw error;
      }
      console.log(`~~~~ askGemini total: ${Date.now() - startedAt} ms`);
      return answer;
    }

    const busy = status === 503 || status === 429;
    const timeLeft = TOTAL_BUDGET_MS - (Date.now() - startedAt) - RETRY_DELAY_MS;
    if (busy && attempt === 1 && timeLeft >= MIN_RETRY_BUDGET_MS) {
      await wait(RETRY_DELAY_MS);
      continue;
    }

    const error = new Error(`Gemini ${status}: ${json && json.error && json.error.message}`);
    error.code = busy ? 'BUSY' : 'API_ERROR';
    throw error;
  }
}

module.exports = { askGemini, sanitizeSpeech };