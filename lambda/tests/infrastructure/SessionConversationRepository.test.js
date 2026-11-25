const {
  SessionConversationRepository,
  SESSION_KEY,
} = require('../../src/infrastructure/persistence/SessionConversationRepository');
const { ConversationRepository } = require('../../src/domain/ports/ConversationRepository');
const { Conversation } = require('../../src/domain/entities/Conversation');
const { buildAttributesManager } = require('../helpers/handlerInput');

describe('SessionConversationRepository', () => {
  it('implements the ConversationRepository port', () => {
    const repository = new SessionConversationRepository({ attributesManager: buildAttributesManager() });
    expect(repository).toBeInstanceOf(ConversationRepository);
  });

  it.each([undefined, {}, { getSessionAttributes: () => ({}) }])(
    'requires a valid attributesManager (%p)',
    (attributesManager) => {
      expect(() => new SessionConversationRepository({ attributesManager })).toThrow(TypeError);
    }
  );

  it('loads an empty conversation when nothing is stored', async () => {
    const repository = new SessionConversationRepository({ attributesManager: buildAttributesManager() });
    const conversation = await repository.load();
    expect(conversation).toBeInstanceOf(Conversation);
    expect(conversation.isEmpty()).toBe(true);
  });

  it('loads an empty conversation when the session attributes are null', async () => {
    const attributesManager = { getSessionAttributes: () => null, setSessionAttributes: jest.fn() };
    const repository = new SessionConversationRepository({ attributesManager });
    await expect(repository.load()).resolves.toMatchObject({ size: 0 });
  });

  it('loads the stored history', async () => {
    const attributesManager = buildAttributesManager({
      [SESSION_KEY]: [
        { role: 'user', text: 'hola' },
        { role: 'model', text: 'Hola.' },
      ],
    });
    const conversation = await new SessionConversationRepository({ attributesManager }).load();
    expect(conversation.toJSON()).toEqual([
      { role: 'user', text: 'hola' },
      { role: 'model', text: 'Hola.' },
    ]);
  });

  it('saves plain objects and keeps other session attributes', async () => {
    const attributesManager = buildAttributesManager({ other: 'value' });
    const repository = new SessionConversationRepository({ attributesManager });

    await repository.save(new Conversation().addExchange('hola', 'Hola.'));

    expect(attributesManager.getSessionAttributes()).toEqual({
      other: 'value',
      conversation: [
        { role: 'user', text: 'hola' },
        { role: 'model', text: 'Hola.' },
      ],
    });
  });

  it('applies the configured cap when loading', async () => {
    const stored = [];
    for (let i = 1; i <= 4; i += 1) stored.push({ role: 'user', text: `p${i}` }, { role: 'model', text: `r${i}` });
    const attributesManager = buildAttributesManager({ conversation: stored });

    const conversation = await new SessionConversationRepository({ attributesManager, maxMessages: 2 }).load();
    expect(conversation.toJSON()).toEqual([
      { role: 'user', text: 'p4' },
      { role: 'model', text: 'r4' },
    ]);
  });

  it('clears only the conversation key', async () => {
    const attributesManager = buildAttributesManager({ other: 'value', conversation: [{ role: 'user', text: 'x' }] });
    await new SessionConversationRepository({ attributesManager }).clear();
    expect(attributesManager.getSessionAttributes()).toEqual({ other: 'value' });
  });

  it('supports a custom session key', async () => {
    const attributesManager = buildAttributesManager();
    const repository = new SessionConversationRepository({ attributesManager, key: 'history' });
    await repository.save(new Conversation().addUserMessage('hola'));
    expect(attributesManager.getSessionAttributes()).toEqual({ history: [{ role: 'user', text: 'hola' }] });
  });
});
