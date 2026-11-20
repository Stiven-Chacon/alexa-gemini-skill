/* *
 * Removes characters that sound bad when Alexa reads them aloud
 * and escapes symbols that break SSML.
 * */
function sanitizeSpeech(text) {
  return String(text || '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[*_#`>~]/g, '')
    .replace(/&/g, ' y ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { sanitizeSpeech };