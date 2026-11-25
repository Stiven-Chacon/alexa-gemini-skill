/* *
 * Entry point of the "asistente nova" Alexa skill (Alexa-hosted Lambda).
 * Wires the handlers from src/presentation with the use cases from the container.
 * */
const Alexa = require('ask-sdk-core');
const { buildContainer } = require('./src/container');
const {
  createLaunchRequestHandler,
  createAskGeminiIntentHandler,
  createResetConversationIntentHandler,
  createFollowUpIntentHandler,
  createRepeatIntentHandler,
  SmallTalkIntentHandler,
  YesIntentHandler,
  HelpIntentHandler,
  CancelAndStopIntentHandler,
  FallbackIntentHandler,
  SessionEndedRequestHandler,
  UnhandledIntentHandler,
  ErrorHandler,
} = require('./src/presentation/alexa/handlers');

const { askQuestion, resetConversation, conversationRepositoryFor } = buildContainer();

// Order matters: handlers are evaluated top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    createLaunchRequestHandler({ resetConversation, conversationRepositoryFor }),
    createAskGeminiIntentHandler({ askQuestion, conversationRepositoryFor }),
    createResetConversationIntentHandler({ resetConversation, conversationRepositoryFor }),
    createFollowUpIntentHandler({ askQuestion, conversationRepositoryFor }),
    createRepeatIntentHandler({ conversationRepositoryFor }),
    SmallTalkIntentHandler,
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
