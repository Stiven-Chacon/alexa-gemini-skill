const { sanitizeSpeech } = require('../../src/presentation/alexa/speech');

describe('sanitizeSpeech', () => {
  it('removes markdown symbols', () => {
    expect(sanitizeSpeech('**Hola** _mundo_ # `x`')).toBe('Hola mundo x');
  });

  it('keeps link text and drops the url', () => {
    expect(sanitizeSpeech('Mira [Wikipedia](https://es.wikipedia.org)')).toBe('Mira Wikipedia');
  });

  it('replaces & and removes < >', () => {
    expect(sanitizeSpeech('pan & café <b>')).toBe('pan y café b');
  });

  it('handles empty values', () => {
    expect(sanitizeSpeech(undefined)).toBe('');
  });
});