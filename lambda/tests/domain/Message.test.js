const { Message, MessageRole } = require('../../src/domain/entities/Message');
const { InvalidMessageError, MessageErrorCode } = require('../../src/domain/errors');

describe('Message', () => {
  it('creates a user message with clean, single-spaced text', () => {
    const message = Message.create({ role: 'user', text: '  ¿cuál   es el río  más largo? ' });
    expect(message.role).toBe(MessageRole.USER);
    expect(message.text).toBe('¿cuál es el río más largo?');
  });

  it('has user() and model() shortcuts', () => {
    expect(Message.user('hola').role).toBe('user');
    expect(Message.model('El Amazonas.').role).toBe('model');
  });

  it('is immutable', () => {
    const message = Message.user('hola');
    expect(Object.isFrozen(message)).toBe(true);
  });

  it('serializes to a plain object', () => {
    expect(Message.model('El Amazonas.').toJSON()).toEqual({ role: 'model', text: 'El Amazonas.' });
    expect(JSON.parse(JSON.stringify(Message.user('hola')))).toEqual({ role: 'user', text: 'hola' });
  });

  it.each(['assistant', 'system', undefined, ''])('rejects the invalid role %p', (role) => {
    expect(() => Message.create({ role, text: 'hola' })).toThrow(InvalidMessageError);
    expect(() => Message.create({ role, text: 'hola' })).toThrow(
      expect.objectContaining({ code: MessageErrorCode.INVALID_ROLE })
    );
  });

  it.each(['', '   ', null, undefined, 42])('rejects the empty or non-text value %p', (text) => {
    expect(() => Message.create({ role: 'user', text })).toThrow(
      expect.objectContaining({ code: MessageErrorCode.EMPTY })
    );
  });

  it('rejects a text longer than MAX_LENGTH', () => {
    const text = 'a'.repeat(Message.MAX_LENGTH + 1);
    expect(() => Message.user(text)).toThrow(expect.objectContaining({ code: MessageErrorCode.TOO_LONG }));
  });

  it('accepts a text of exactly MAX_LENGTH', () => {
    expect(Message.user('a'.repeat(Message.MAX_LENGTH)).text).toHaveLength(Message.MAX_LENGTH);
  });

  it('rejects a call without arguments', () => {
    expect(() => Message.create()).toThrow(InvalidMessageError);
  });
});
