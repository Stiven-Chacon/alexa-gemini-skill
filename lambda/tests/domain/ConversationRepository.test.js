const { ConversationRepository } = require('../../src/domain/ports/ConversationRepository');
const { AIProvider } = require('../../src/domain/ports/AIProvider');

describe('ports', () => {
  it('ConversationRepository methods must be implemented', async () => {
    const port = new ConversationRepository();
    await expect(port.load()).rejects.toThrow('not implemented');
    await expect(port.save({})).rejects.toThrow('not implemented');
    await expect(port.clear()).rejects.toThrow('not implemented');
  });

  it('AIProvider.ask must be implemented', async () => {
    await expect(new AIProvider().ask({ text: 'hola' }, [])).rejects.toThrow('not implemented');
  });
});
