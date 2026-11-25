function buildAttributesManager(initial = {}) {
  let sessionAttributes = { ...initial };
  return {
    getSessionAttributes: jest.fn(() => sessionAttributes),
    setSessionAttributes: jest.fn((attributes) => {
      sessionAttributes = attributes;
    }),
  };
}

function buildHandlerInput({
  type = 'IntentRequest',
  intentName,
  slots,
  reason = 'USER_INITIATED',
  sessionAttributes = {},
} = {}) {
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
    attributesManager: buildAttributesManager(sessionAttributes),
    response,
  };
}

module.exports = { buildHandlerInput, buildAttributesManager };
