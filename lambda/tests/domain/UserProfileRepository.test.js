const { UserProfileRepository } = require('../../src/domain/ports/UserProfileRepository');
const { AIProvider } = require('../../src/domain/ports/AIProvider');

describe('user profile ports', () => {
  it('UserProfileRepository methods must be implemented', async () => {
    const port = new UserProfileRepository();
    await expect(port.get('user-1')).rejects.toThrow('not implemented');
    await expect(port.save({})).rejects.toThrow('not implemented');
    await expect(port.delete('user-1')).rejects.toThrow('not implemented');
  });

  it('AIProvider.extractInterests must be implemented', async () => {
    await expect(new AIProvider().extractInterests(['hola'])).rejects.toThrow('not implemented');
  });
});
