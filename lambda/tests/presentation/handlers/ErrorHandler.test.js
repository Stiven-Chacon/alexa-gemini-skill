const { ErrorHandler } = require('../../../src/presentation/alexa/handlers/ErrorHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });
  it('handles any error', () => {
    expect(ErrorHandler.canHandle()).toBe(true);
    expect(ErrorHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }), new Error('x'))).toBe(true);
  });

  it('speaks the generic error message and keeps the session open', () => {
    const input = buildHandlerInput({ type: 'LaunchRequest' });
    const response = ErrorHandler.handle(input, new Error('boom'));

    expect(response.speak).toBe(messages.GENERIC_ERROR);
    expect(response.reprompt).toBe(messages.GENERIC_ERROR);
  });
});
