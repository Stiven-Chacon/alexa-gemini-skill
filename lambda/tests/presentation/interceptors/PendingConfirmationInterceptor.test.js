const {
  PendingConfirmationInterceptor,
} = require('../../../src/presentation/alexa/interceptors/PendingConfirmationInterceptor');
const { PENDING_ACTION_KEY } = require('../../../src/presentation/alexa/handlers/ForgetMeIntentHandler');
const { buildHandlerInput } = require('../../helpers/handlerInput');

const PENDING = { [PENDING_ACTION_KEY]: 'FORGET_ME', other: 'value' };

describe('PendingConfirmationInterceptor', () => {
  it.each(['AMAZON.YesIntent', 'AMAZON.NoIntent'])('keeps the pending action for %s', (intentName) => {
    const input = buildHandlerInput({ intentName, sessionAttributes: PENDING });
    PendingConfirmationInterceptor.process(input);
    expect(input.attributesManager.getSessionAttributes()).toEqual(PENDING);
  });

  it.each([[{ intentName: 'AskGeminiIntent' }], [{ intentName: 'AMAZON.StopIntent' }], [{ type: 'LaunchRequest' }]])(
    'drops the pending action for any other request (%p)',
    (request) => {
      const input = buildHandlerInput({ ...request, sessionAttributes: PENDING });
      PendingConfirmationInterceptor.process(input);
      expect(input.attributesManager.getSessionAttributes()).toEqual({ other: 'value' });
    }
  );

  it('does not write the session when nothing is pending', () => {
    const input = buildHandlerInput({ intentName: 'AskGeminiIntent' });
    PendingConfirmationInterceptor.process(input);
    expect(input.attributesManager.setSessionAttributes).not.toHaveBeenCalled();
  });
});
