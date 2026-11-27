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
  createForgetMeIntentHandler,
  createForgetMeConfirmationHandler,
  createFollowUpIntentHandler,
  createRepeatIntentHandler,
  createCancelAndStopIntentHandler,
  createSessionEndedRequestHandler,
  SmallTalkIntentHandler,
  YesIntentHandler,
  HelpIntentHandler,
  FallbackIntentHandler,
  UnhandledIntentHandler,
  ErrorHandler,
} = require('./src/presentation/alexa/handlers');
const { PendingConfirmationInterceptor } = require('./src/presentation/alexa/interceptors');

const { askQuestion, resetConversation, conversationRepositoryFor, getGreeting, updateProfile, forgetMe } =
  buildContainer();

// Order matters: handlers are evaluated top to bottom.
// The forget-me confirmation must come before YesIntentHandler and
// CancelAndStopIntentHandler, which also handle "sí" and "no".
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestInterceptors(PendingConfirmationInterceptor)
  .addRequestHandlers(
    createLaunchRequestHandler({ resetConversation, conversationRepositoryFor, getGreeting }),
    createForgetMeConfirmationHandler({ forgetMe, resetConversation, conversationRepositoryFor }),
    createAskGeminiIntentHandler({ askQuestion, conversationRepositoryFor }),
    createResetConversationIntentHandler({ resetConversation, conversationRepositoryFor }),
    createForgetMeIntentHandler(),
    createFollowUpIntentHandler({ askQuestion, conversationRepositoryFor }),
    createRepeatIntentHandler({ conversationRepositoryFor }),
    SmallTalkIntentHandler,
    YesIntentHandler,
    HelpIntentHandler,
    createCancelAndStopIntentHandler({ updateProfile, conversationRepositoryFor }),
    FallbackIntentHandler,
    createSessionEndedRequestHandler({ updateProfile, conversationRepositoryFor }),
    UnhandledIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('asistente-nova/v1')
  .lambda();
