const https = require('https');
const { EventEmitter } = require('events');
const { GeminiProvider, SYSTEM_PROMPT } = require('../../src/infrastructure/ai/GeminiProvider');
const { AIErrorCode } = require('../../src/domain/errors');

const TEST_KEY = 'test-gemini-key';
const TEST_MODEL = 'gemini-3.1-flash-lite';
const silentLogger = { log: jest.fn() };

function successJson(text) {
  const parts = Array.isArray(text) ? text : [{ text }];
  return { candidates: [{ content: { parts } }] };
}

function mockHttps(responses) {
  const queue = Array.isArray(responses) ? [...responses] : [responses];
  const calls = [];

  jest.spyOn(https, 'request').mockImplementation((url, options, callback) => {
    const req = new EventEmitter();
    let payload = '';

    req.write = jest.fn((chunk) => {
      payload += chunk;
    });
    req.destroy = jest.fn((err) => {
      if (err) req.emit('error', err);
    });
    req.end = jest.fn((chunk) => {
      if (chunk) payload += chunk;
      calls.push({
        url,
        options,
        payload: payload ? JSON.parse(payload) : undefined,
      });

      const next = queue.shift() || { unexpected: true };
      if (next.unexpected) {
        req.emit('error', new Error('unexpected extra request'));
        return;
      }
      if (next.networkError) {
        req.emit('error', next.networkError);
        return;
      }
      if (next.hang) {
        return;
      }

      const res = new EventEmitter();
      res.statusCode = next.status;
      callback(res);
      const body = next.raw !== undefined ? next.raw : JSON.stringify(next.json);
      res.emit('data', body);
      res.emit('end');
    });

    return req;
  });

  return { calls };
}

function makeProvider(overrides = {}) {
  return new GeminiProvider({
    apiKey: TEST_KEY,
    model: TEST_MODEL,
    logger: silentLogger,
    ...overrides,
  });
}

describe('GeminiProvider', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    silentLogger.log.mockClear();
  });

  it('parses a successful response and returns the trimmed answer', async () => {
    mockHttps({ status: 200, json: successJson('  El Amazonas.  ') });
    const provider = makeProvider();

    await expect(provider.ask({ text: 'río más largo' })).resolves.toBe('El Amazonas.');
    expect(https.request).toHaveBeenCalledTimes(1);
  });

  it('joins multiple text parts', async () => {
    mockHttps({ status: 200, json: successJson([{ text: 'Hola' }, { text: 'mundo' }]) });
    await expect(makeProvider().ask({ text: 'hola' })).resolves.toBe('Hola mundo');
  });

  it('sends the expected URL, API key header, system prompt and generation config', async () => {
    const { calls } = mockHttps({ status: 200, json: successJson('ok') });

    await makeProvider().ask({ text: 'cuál es la capital de Francia' });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${TEST_MODEL}:generateContent`);
    expect(calls[0].options.method).toBe('POST');
    expect(calls[0].options.headers['Content-Type']).toBe('application/json');
    expect(calls[0].options.headers['x-goog-api-key']).toBe(TEST_KEY);
    expect(calls[0].payload).toEqual({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: 'cuál es la capital de Francia' }] }],
      generationConfig: { maxOutputTokens: 120, temperature: 0.5 },
    });
  });

  it('fails with EMPTY when the answer has no text', async () => {
    mockHttps({ status: 200, json: { candidates: [{ content: { parts: [{ text: '   ' }] } }] } });
    await expect(makeProvider().ask({ text: 'hola' })).rejects.toMatchObject({ code: AIErrorCode.EMPTY });
  });

  it('fails with EMPTY when candidates are missing', async () => {
    mockHttps({ status: 200, json: {} });
    await expect(makeProvider().ask({ text: 'hola' })).rejects.toMatchObject({ code: AIErrorCode.EMPTY });
  });

  it('retries once on 503 and then succeeds', async () => {
    jest.useFakeTimers();
    const { calls } = mockHttps([
      { status: 503, json: { error: { message: 'unavailable' } } },
      { status: 200, json: successJson('El Amazonas.') },
    ]);

    const promise = makeProvider().ask({ text: 'río' });
    await jest.advanceTimersByTimeAsync(300);

    await expect(promise).resolves.toBe('El Amazonas.');
    expect(calls).toHaveLength(2);
  });

  it('retries once on 429 and then succeeds', async () => {
    jest.useFakeTimers();
    const { calls } = mockHttps([
      { status: 429, json: { error: { message: 'rate limited' } } },
      { status: 200, json: successJson('Paris.') },
    ]);

    const promise = makeProvider().ask({ text: 'capital' });
    await jest.advanceTimersByTimeAsync(300);

    await expect(promise).resolves.toBe('Paris.');
    expect(calls).toHaveLength(2);
  });

  it('fails with BUSY after two 503 responses', async () => {
    jest.useFakeTimers();
    const { calls } = mockHttps([
      { status: 503, json: { error: { message: 'unavailable' } } },
      { status: 503, json: { error: { message: 'still unavailable' } } },
    ]);

    const settled = makeProvider()
      .ask({ text: 'río' })
      .then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error })
      );
    await jest.advanceTimersByTimeAsync(300);
    const result = await settled;
    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ code: AIErrorCode.BUSY });
    expect(calls).toHaveLength(2);
  });

  it('does not retry a 503 when the remaining budget is below minRetryBudgetMs', async () => {
    const { calls } = mockHttps({ status: 503, json: { error: { message: 'unavailable' } } });
    const provider = makeProvider({
      options: { totalBudgetMs: 2000, minRetryBudgetMs: 2500, retryDelayMs: 300 },
    });

    await expect(provider.ask({ text: 'río' })).rejects.toMatchObject({ code: AIErrorCode.BUSY });
    expect(calls).toHaveLength(1);
  });

  it('fails with TIMEOUT when the request hangs past the budget', async () => {
    jest.useFakeTimers();
    mockHttps({ hang: true });

    const settled = makeProvider({ options: { totalBudgetMs: 1000 } })
      .ask({ text: 'río' })
      .then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error })
      );
    await jest.advanceTimersByTimeAsync(1000);
    const result = await settled;
    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ code: AIErrorCode.TIMEOUT, name: 'AIProviderError' });
    expect(https.request).toHaveBeenCalledTimes(1);
  });

  it('fails with NO_API_KEY when the api key is missing, without calling the network', async () => {
    const request = jest.spyOn(https, 'request');
    const provider = makeProvider({ apiKey: '' });

    await expect(provider.ask({ text: 'hola' })).rejects.toMatchObject({ code: AIErrorCode.NO_API_KEY });
    expect(request).not.toHaveBeenCalled();
  });

  it.each([400, 500])('fails with API_ERROR and does not retry on %s', async (status) => {
    const { calls } = mockHttps({ status, json: { error: { message: 'bad request' } } });

    await expect(makeProvider().ask({ text: 'hola' })).rejects.toMatchObject({
      code: AIErrorCode.API_ERROR,
    });
    expect(calls).toHaveLength(1);
  });

  it('fails with API_ERROR when the body is not valid JSON', async () => {
    mockHttps({ status: 200, raw: '<html>nope</html>' });
    await expect(makeProvider().ask({ text: 'hola' })).rejects.toMatchObject({ code: AIErrorCode.API_ERROR });
  });

  it('fails with API_ERROR on a network failure', async () => {
    mockHttps({ networkError: new Error('socket hang up') });
    await expect(makeProvider().ask({ text: 'hola' })).rejects.toMatchObject({
      code: AIErrorCode.API_ERROR,
      message: 'socket hang up',
    });
  });
});
