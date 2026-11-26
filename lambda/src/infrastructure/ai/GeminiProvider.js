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
  'Si la pregunta depende de lo que se habló antes en la conversación, usa ese contexto.',
  'La pregunta viene de la voz y a veces llega sin sus primeras palabras, como qué es, cómo o cuál es la diferencia entre; deduce qué quiere saber el usuario.',
].join(' ');

const INTERESTS_PROMPT = [
  'Recibes las preguntas que un usuario le hizo a una asistente de voz.',
  'Devuelve solo un arreglo JSON con 1 a 3 temas generales de interés del usuario, en español y en minúsculas,',
  'de una a tres palabras cada uno, por ejemplo ["astronomía", "cocina"].',
  'Si no hay un tema claro devuelve []. Sin texto adicional.',
].join(' ');

const MAX_INTERESTS = 3;
const MAX_INTEREST_QUESTIONS = 10;

const DEFAULTS = Object.freeze({
  totalBudgetMs: 7000, // whole ask() call, retries included
  minRetryBudgetMs: 2500, // only retry if at least this much time is left
  retryDelayMs: 300,
  maxOutputTokens: 120,
  temperature: 0.5,
  interestsBudgetMs: 2500, // extractInterests() runs when the session ends
  interestsMaxOutputTokens: 60,
});

// Reused across invocations while the Lambda container stays warm,
// so TLS handshakes with Google are not repeated on every question.
const sharedAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

// Gemini uses the same role names as our Message entity: "user" and "model".
const toContents = (history) =>
  (Array.isArray(history) ? history : []).map((message) => ({ role: message.role, parts: [{ text: message.text }] }));

// Reads the topic list from Gemini's answer. Accepts code fences or extra
// text around the JSON array; anything else becomes an empty list.
function parseInterests(text) {
  const raw = String(text || '');
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end <= start) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set();
  return parsed
    .filter((topic) => typeof topic === 'string')
    .map((topic) => topic.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter((topic) => topic && topic.length <= 40 && !seen.has(topic) && seen.add(topic))
    .slice(0, MAX_INTERESTS);
}

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
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          clearTimeout(timer);
          try {
            resolve({ status: response.statusCode, json: JSON.parse(data) });
          } catch {
            reject(
              new AIProviderError(AIErrorCode.API_ERROR, `Invalid JSON from Gemini (status ${response.statusCode})`)
            );
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

  // history: previous Message entities (oldest first), sent as Gemini contents
  // so the model can answer follow-up questions with context.
  async ask(question, history = []) {
    if (!this.apiKey) {
      throw new AIProviderError(AIErrorCode.NO_API_KEY, 'Missing GEMINI_API_KEY');
    }

    const { totalBudgetMs, maxOutputTokens, temperature } = this.options;
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [...toContents(history), { role: 'user', parts: [{ text: question.text }] }],
      generationConfig: { maxOutputTokens, temperature },
    };

    const startedAt = Date.now();
    const answer = await this._generate(body, totalBudgetMs);
    this.logger.log(`~~~~ GeminiProvider.ask total: ${Date.now() - startedAt} ms`);
    return answer;
  }

  // questions: what the user asked during the session (strings).
  // Resolves with 0 to 3 general topics in Spanish and never rejects,
  // because the user profile is an extra that must not break the skill.
  async extractInterests(questions = []) {
    const clean = (Array.isArray(questions) ? questions : [])
      .filter((question) => typeof question === 'string' && question.trim())
      .map((question) => question.trim())
      .slice(-MAX_INTEREST_QUESTIONS);
    if (!this.apiKey || clean.length === 0) return [];

    const { interestsBudgetMs, interestsMaxOutputTokens } = this.options;
    const body = {
      systemInstruction: { parts: [{ text: INTERESTS_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: clean.map((question) => `- ${question}`).join('\n') }] }],
      generationConfig: {
        maxOutputTokens: interestsMaxOutputTokens,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    try {
      const startedAt = Date.now();
      const interests = parseInterests(await this._generate(body, interestsBudgetMs));
      this.logger.log(`~~~~ GeminiProvider.extractInterests total: ${Date.now() - startedAt} ms`);
      return interests;
    } catch (error) {
      this.logger.log(`~~~~ GeminiProvider.extractInterests failed: ${error.code || error.name}`);
      return [];
    }
  }

  // Sends one generateContent request within totalBudgetMs, retrying once
  // on 503/429 when there is time left. Resolves with the joined text.
  async _generate(body, totalBudgetMs) {
    const { minRetryBudgetMs, retryDelayMs } = this.options;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
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
        this.logger.log(
          `~~~~ generateContent attempt ${attempt} (${this.model}): ${Date.now() - callStart} ms, status ${status || 'n/a'}`
        );
      }

      if (status === 200) {
        const parts =
          (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) ||
          [];
        const answer = parts
          .map((part) => part.text || '')
          .join(' ')
          .trim();
        if (!answer) {
          throw new AIProviderError(AIErrorCode.EMPTY, 'Empty answer from Gemini');
        }
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

module.exports = { GeminiProvider, SYSTEM_PROMPT, INTERESTS_PROMPT, parseInterests };
