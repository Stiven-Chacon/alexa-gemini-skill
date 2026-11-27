const {
  DynamoUserProfileRepository,
  KEY_ATTRIBUTE,
} = require('../../src/infrastructure/persistence/DynamoUserProfileRepository');
const { UserProfileRepository } = require('../../src/domain/ports/UserProfileRepository');
const { UserProfile } = require('../../src/domain/entities/UserProfile');

const NOW = new Date('2026-11-26T14:30:00.000Z');
const TABLE = 'nova-table';

// Same shape as aws-sdk v2: each method returns an object with promise().
function buildDocumentClient({ item, error } = {}) {
  const reply = (value) => ({ promise: () => (error ? Promise.reject(error) : Promise.resolve(value)) });
  return {
    get: jest.fn(() => reply(item ? { Item: item } : {})),
    put: jest.fn(() => reply({})),
    delete: jest.fn(() => reply({})),
  };
}

describe('DynamoUserProfileRepository', () => {
  it('implements the UserProfileRepository port and uses "id" as key', () => {
    const repository = new DynamoUserProfileRepository({ tableName: TABLE, documentClient: buildDocumentClient() });
    expect(repository).toBeInstanceOf(UserProfileRepository);
    expect(KEY_ATTRIBUTE).toBe('id');
  });

  it.each([undefined, '', '  '])('needs a table name (%p)', (tableName) => {
    expect(() => new DynamoUserProfileRepository({ tableName, documentClient: buildDocumentClient() })).toThrow(
      TypeError
    );
  });

  it('creates an aws-sdk DocumentClient when none is given', () => {
    jest.isolateModules(() => {
      jest.doMock(
        'aws-sdk',
        () => ({
          DynamoDB: {
            DocumentClient: jest.fn(function DocumentClient(options) {
              this.options = options;
            }),
          },
        }),
        { virtual: true }
      );
      const {
        DynamoUserProfileRepository: Repository,
      } = require('../../src/infrastructure/persistence/DynamoUserProfileRepository');
      const repository = new Repository({ tableName: TABLE, region: 'us-east-1' });

      expect(repository.client.options).toMatchObject({ region: 'us-east-1', maxRetries: 1 });
      expect(repository.client.options.httpOptions.timeout).toBeLessThanOrEqual(1500);
    });
    jest.dontMock('aws-sdk');
  });

  it('reads a profile by userId', async () => {
    const stored = UserProfile.create('user-1', NOW).addInterests(['cine'], NOW).toJSON();
    const client = buildDocumentClient({ item: stored });
    const repository = new DynamoUserProfileRepository({ tableName: TABLE, documentClient: client });

    const profile = await repository.get('user-1');

    expect(client.get).toHaveBeenCalledWith({ TableName: TABLE, Key: { id: 'user-1' } });
    expect(profile).toBeInstanceOf(UserProfile);
    expect(profile.toJSON()).toEqual(stored);
  });

  it('returns null when the user has no profile', async () => {
    const repository = new DynamoUserProfileRepository({ tableName: TABLE, documentClient: buildDocumentClient() });
    await expect(repository.get('user-1')).resolves.toBeNull();
  });

  it('saves the plain profile as the item', async () => {
    const client = buildDocumentClient();
    const repository = new DynamoUserProfileRepository({ tableName: TABLE, documentClient: client });
    const profile = UserProfile.create('user-1', NOW);

    await repository.save(profile);

    expect(client.put).toHaveBeenCalledWith({ TableName: TABLE, Item: profile.toJSON() });
  });

  it('deletes a profile by userId', async () => {
    const client = buildDocumentClient();
    const repository = new DynamoUserProfileRepository({ tableName: TABLE, documentClient: client });

    await repository.delete('user-1');

    expect(client.delete).toHaveBeenCalledWith({ TableName: TABLE, Key: { id: 'user-1' } });
  });

  it('lets DynamoDB errors reach the caller', async () => {
    const error = new Error('throttled');
    const repository = new DynamoUserProfileRepository({
      tableName: TABLE,
      documentClient: buildDocumentClient({ error }),
    });
    await expect(repository.get('user-1')).rejects.toBe(error);
  });
});
