const { SessionEndedRequestHandler } = require('../../../src/presentation/alexa/handlers/SessionEndedRequestHandler');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('SessionEndedRequestHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });
  it('handles SessionEndedRequest only', () => {
    expect(SessionEndedRequestHandler.canHandle(buildHandlerInput({ type: 'SessionEndedRequest' }))).toBe(true);
    expect(SessionEndedRequestHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it('returns an empty response', () => {
    const input = buildHandlerInput({ type: 'SessionEndedRequest', reason: 'USER_INITIATED' });
    const response = SessionEndedRequestHandler.handle(input);

    expect(response).toBe(input.response);
    expect(input.responseBuilder.speak).not.toHaveBeenCalled();
    expect(input.responseBuilder.getResponse).toHaveBeenCalled();
  });
});
