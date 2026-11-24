const messages = require('../messages');

/* *
 * Generic error handler for routing or unexpected errors.
 * */
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error && error.stack ? error.stack : JSON.stringify(error)}`);
    return handlerInput.responseBuilder.speak(messages.GENERIC_ERROR).reprompt(messages.GENERIC_ERROR).getResponse();
  },
};

module.exports = { ErrorHandler };
