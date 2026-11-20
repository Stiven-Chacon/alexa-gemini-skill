/* *
 * Gemini implementation of the AIProvider port.
 * Uses Node's built-in https module (no extra dependencies) with a shared
 * keep-alive agent, a total time budget and one quick retry on 503/429,
 * because Alexa ends the request if the skill takes longer than 8 seconds.
 * */
const https = require('https');
const { AIProvider } = require('../../domain/ports/AIProvider');
const { AIProviderError, AIErrorCode } = require('../../domain/errors');

const SYSTEM_PROMPT = [
  'Eres Nova y respondes por voz en Alexa, en español.',
  'Contesta directo con el dato concreto, en una a tres frases cortas, y si no lo sabes dilo sin inventar.',
  'Sin markdown, listas, emojis, símbolos ni enlaces.',
].join(' ');

const DEFAULTS = Object.freeze({
  totalBudgetMs: 7000, // whole ask() call, retries included
  minRetryBudgetMs: 2500, // only retry if at least this much time is left
  retryDelayMs: 300,
  maxOutputTokens: 120,
  temperature: 0.5,
});

// Reused across invocations while the Lambda container stays warm,
// so TLS handshakes with Google are not repeated on every question.
const sharedAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function postJson(url, body, headers, timeoutMs, agent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    let timer;
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
            reject(new AIProviderError(AIErrorCode.API_ERROR, `Invalid JSON from Gemini (status ${response.statusCode})`));
          }
        });
      }
    );

    // Hard deadline for the whole request (not just socket inactivity).
    timer = setTimeout(() => {
      request.destroy(new AIProviderError(AIErrorCode.TIMEOUT, `Gemini request timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    request.on('error', (error) => {
      clearTimeout(timer);
      reject(error instanceof AIProviderError ? error : new AIProviderError(AIErrorCode.API_ERROR, error.message));
    });
    request.write(payload);
    request.end();
  });
}

class GeminiProvider extends AIProvider {
  constructor({ apiKey, model, options = {}, agent = sharedAgent, logger = console } = {}) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.options = { ...DEFAULTS, ...options };
    this.agent = agent;
    this.logger = logger;
  }

  async ask(question) {
    if (!this.apiKey) {
      throw new AIProviderError(AIErrorCode.NO_API_KEY, 'Missing GEMINI_API_KEY');
    }

    const { totalBudgetMs, minRetryBudgetMs, retryDelayMs, maxOutputTokens, temperature } = this.options;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: question.text }] }],
      generationConfig: { maxOutputTokens, temperature },
    };

    const startedAt = Date.now();
    let attempt = 0;

    while (true) {
      attempt += 1;
      const remaining = totalBudgetMs - (Date.now() - startedAt);
      const callStart = Date.now();
      let status;
      let json;

      try {
        ({ status, json } = await postJson(url, body, { 'x-goog-api-key': this.apiKey }, remaining, this.agent));
      } finally {
        this.logger.log(`~~~~ generateContent attempt ${attempt} (${this.model}): ${Date.now() - callStart} ms, status ${status || 'n/a'}`);
      }

      if (status === 200) {
        const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
        const answer = parts.map((part) => part.text || '').join(' ').trim();
        if (!answer) {
          throw new AIProviderError(AIErrorCode.EMPTY, 'Empty answer from Gemini');
        }
        this.logger.log(`~~~~ GeminiProvider.ask total: ${Date.now() - startedAt} ms`);
        return answer;
      }

      const busy = status === 503 || status === 429;
      const timeLeft = totalBudgetMs - (Date.now() - startedAt) - retryDelayMs;
      if (busy && attempt === 1 && timeLeft >= minRetryBudgetMs) {
        await wait(retryDelayMs);
        continue;
      }

      throw new AIProviderError(
        busy ? AIErrorCode.BUSY : AIErrorCode.API_ERROR,
        `Gemini ${status}: ${json && json.error && json.error.message}`
      );
    }
  }
}

module.exports = { GeminiProvider, SYSTEM_PROMPT };