const { Conversation } = require('../../src/domain/entities/Conversation');
const { Message } = require('../../src/domain/entities/Message');

describe('Conversation', () => {
  it('starts empty with the default cap', () => {
    const conversation = new Conversation();
    expect(conversation.isEmpty()).toBe(true);
    expect(conversation.size).toBe(0);
    expect(conversation.maxMessages).toBe(Conversation.DEFAULT_MAX_MESSAGES);
    expect(Conversation.DEFAULT_MAX_MESSAGES).toBe(10);
  });

  it('keeps user and model turns in order', () => {
    const conversation = new Conversation().addUserMessage('río más largo').addModelMessage('El Amazonas.');

    expect(conversation.toJSON()).toEqual([
      { role: 'user', text: 'río más largo' },
      { role: 'model', text: 'El Amazonas.' },
    ]);
  });

  it('adds a full question/answer exchange', () => {
    const conversation = new Conversation().addExchange('hola', 'Hola, ¿qué tal?');
    expect(conversation.messages.map((m) => m.role)).toEqual(['user', 'model']);
  });

  it('does not add half an exchange when the answer is invalid', () => {
    const conversation = new Conversation();
    expect(() => conversation.addExchange('hola', '   ')).toThrow();
    expect(conversation.isEmpty()).toBe(true);
  });

  it('returns a copy of the messages, so the history cannot be changed from outside', () => {
    const conversation = new Conversation().addUserMessage('hola');
    conversation.messages.push(Message.model('hack'));
    expect(conversation.size).toBe(1);
  });

  it('keeps only the most recent messages when the cap is reached', () => {
    const conversation = new Conversation({ maxMessages: 4 });
    for (let i = 1; i <= 5; i += 1) {
      conversation.addExchange(`pregunta ${i}`, `respuesta ${i}`);
    }

    expect(conversation.toJSON()).toEqual([
      { role: 'user', text: 'pregunta 4' },
      { role: 'model', text: 'respuesta 4' },
      { role: 'user', text: 'pregunta 5' },
      { role: 'model', text: 'respuesta 5' },
    ]);
  });

  it('never starts the history with a model turn after trimming', () => {
    const conversation = new Conversation({ maxMessages: 3 });
    conversation.addExchange('p1', 'r1').addExchange('p2', 'r2');

    expect(conversation.messages[0].role).toBe('user');
    expect(conversation.toJSON()).toEqual([
      { role: 'user', text: 'p2' },
      { role: 'model', text: 'r2' },
    ]);
  });

  it('drops a leading model message given in the constructor', () => {
    const conversation = new Conversation({ messages: [Message.model('suelto'), Message.user('hola')] });
    expect(conversation.toJSON()).toEqual([{ role: 'user', text: 'hola' }]);
  });

  it('clears the history', () => {
    const conversation = new Conversation().addExchange('hola', 'Hola.');
    conversation.clear();
    expect(conversation.isEmpty()).toBe(true);
  });

  it.each([0, 1, 2.5, '10', null])('rejects the invalid cap %p', (maxMessages) => {
    expect(() => new Conversation({ maxMessages })).toThrow(TypeError);
  });

  it('only accepts Message entities', () => {
    expect(() => new Conversation({ messages: [{ role: 'user', text: 'hola' }] })).toThrow(TypeError);
  });

  describe('fromJSON', () => {
    it('rebuilds a conversation from plain objects', () => {
      const data = [
        { role: 'user', text: 'hola' },
        { role: 'model', text: 'Hola.' },
      ];
      const conversation = Conversation.fromJSON(data);
      expect(conversation.messages.every((m) => m instanceof Message)).toBe(true);
      expect(conversation.toJSON()).toEqual(data);
    });

    it('round-trips through JSON', () => {
      const original = new Conversation().addExchange('hola', 'Hola.');
      const copy = Conversation.fromJSON(JSON.parse(JSON.stringify(original)));
      expect(copy.toJSON()).toEqual(original.toJSON());
    });

    it('skips invalid stored entries', () => {
      const conversation = Conversation.fromJSON([
        { role: 'user', text: 'hola' },
        null,
        { role: 'system', text: 'x' },
        { role: 'model', text: '' },
        'texto suelto',
        { role: 'model', text: 'Hola.' },
      ]);
      expect(conversation.toJSON()).toEqual([
        { role: 'user', text: 'hola' },
        { role: 'model', text: 'Hola.' },
      ]);
    });

    it.each([undefined, null, {}, 'x'])('returns an empty conversation for %p', (data) => {
      expect(Conversation.fromJSON(data).isEmpty()).toBe(true);
    });

    it('applies the cap to stored history', () => {
      const data = [];
      for (let i = 1; i <= 6; i += 1) {
        data.push({ role: 'user', text: `p${i}` }, { role: 'model', text: `r${i}` });
      }
      const conversation = Conversation.fromJSON(data, { maxMessages: 4 });
      expect(conversation.size).toBe(4);
      expect(conversation.messages[0].text).toBe('p5');
    });
  });
});
