/* *
 * Entry point of the "asistente nova" Alexa skill (Alexa-hosted Lambda).
 * Wires the handlers from src/presentation with the use cases from the container.
 * */
const Alexa = require('ask-sdk-core');
const { buildContainer } = require('./src/container');
const {
  LaunchRequestHandler,
  createAskGeminiIntentHandler,
  YesIntentHandler,
  HelpIntentHandler,
  CancelAndStopIntentHandler,
  FallbackIntentHandler,
  SessionEndedRequestHandler,
  UnhandledIntentHandler,
  ErrorHandler,
} = require('./src/presentation/alexa/handlers');

const { askQuestion } = buildContainer();

// Order matters: handlers are evaluated top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    createAskGeminiIntentHandler({ askQuestion }),
    YesIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    UnhandledIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('asistente-nova/v1')
  .lambda();