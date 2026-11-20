module.exports = {
  ...require('./LaunchRequestHandler'),
  ...require('./AskGeminiIntentHandler'),
  ...require('./YesIntentHandler'),
  ...require('./HelpIntentHandler'),
  ...require('./CancelAndStopIntentHandler'),
  ...require('./FallbackIntentHandler'),
  ...require('./SessionEndedRequestHandler'),
  ...require('./UnhandledIntentHandler'),
  ...require('./ErrorHandler'),
};