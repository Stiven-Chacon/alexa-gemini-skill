function buildHandlerInput({ type = 'IntentRequest', intentName, slots, reason = 'USER_INITIATED' } = {}) {
  const response = {};
  const responseBuilder = {
    speak: jest.fn((text) => {
      response.speak = text;
      return responseBuilder;
    }),
    reprompt: jest.fn((text) => {
      response.reprompt = text;
      return responseBuilder;
    }),
    withShouldEndSession: jest.fn((value) => {
      response.shouldEndSession = value;
      return responseBuilder;
    }),
    getResponse: jest.fn(() => response),
  };

  const request = { type };
  if (type === 'IntentRequest') {
    request.intent = { name: intentName, slots: slots || {} };
  }
  if (type === 'SessionEndedRequest') {
    request.reason = reason;
  }

  return {
    requestEnvelope: { request },
    responseBuilder,
    response,
  };
}

module.exports = { buildHandlerInput };
