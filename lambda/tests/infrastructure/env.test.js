const fs = require('fs');
const {
  parseEnvFile,
  getConfig,
  resetConfigCache,
  DEFAULT_GEMINI_MODEL,
} = require('../../src/infrastructure/config/env');

describe('parseEnvFile', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an empty object when the file does not exist', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const read = jest.spyOn(fs, 'readFileSync');

    expect(parseEnvFile('missing.env')).toEqual({});
    expect(read).not.toHaveBeenCalled();
  });

  it('parses keys, skips comments and blank lines, keeps quotes and allows = in values', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(
        [
          '# this is a comment',
          '',
          '  # indented comment',
          'GEMINI_API_KEY=from-file',
          'GEMINI_MODEL="quoted-model"',
          'NOTE=foo=bar=baz',
          'SPACED =  value with spaces  ',
          'NOEQUALS',
        ].join('\n')
      );

    expect(parseEnvFile('fake.env')).toEqual({
      GEMINI_API_KEY: 'from-file',
      GEMINI_MODEL: '"quoted-model"',
      NOTE: 'foo=bar=baz',
      SPACED: 'value with spaces',
    });
  });

  it('accepts CRLF line endings', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('A=1\r\nB=2\r\n');

    expect(parseEnvFile('fake.env')).toEqual({ A: '1', B: '2' });
  });
});

describe('getConfig', () => {
  const envKeys = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'DYNAMODB_PERSISTENCE_TABLE_NAME', 'DYNAMODB_PERSISTENCE_REGION'];
  const previous = {};

  beforeEach(() => {
    envKeys.forEach((key) => {
      previous[key] = Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined;
      delete process.env[key];
    });
    resetConfigCache();
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('GEMINI_API_KEY=file-key\nGEMINI_MODEL=file-model\n');
  });

  afterEach(() => {
    resetConfigCache();
    envKeys.forEach((key) => {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    });
    jest.restoreAllMocks();
  });

  it('reads values from the env file when process.env is empty', () => {
    const config = getConfig({ envPath: 'fake.env' });
    expect(config).toEqual({ geminiApiKey: 'file-key', geminiModel: 'file-model' });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('gives process.env precedence over the file', () => {
    process.env.GEMINI_API_KEY = 'env-key';
    process.env.GEMINI_MODEL = 'env-model';

    expect(getConfig({ envPath: 'fake.env' })).toEqual({
      geminiApiKey: 'env-key',
      geminiModel: 'env-model',
    });
  });

  it('uses the default model when neither env nor file provide one', () => {
    fs.readFileSync.mockReturnValue('GEMINI_API_KEY=file-key\n');

    const config = getConfig({ envPath: 'fake.env' });
    expect(config.geminiApiKey).toBe('file-key');
    expect(config.geminiModel).toBe(DEFAULT_GEMINI_MODEL);
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.1-flash-lite');
  });

  it('caches the result until resetConfigCache is called', () => {
    const first = getConfig({ envPath: 'fake.env' });
    const second = getConfig({ envPath: 'another.env' });

    expect(second).toBe(first);
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);

    resetConfigCache();
    process.env.GEMINI_MODEL = 'after-reset';
    const third = getConfig({ envPath: 'fake.env' });

    expect(third).not.toBe(first);
    expect(third.geminiModel).toBe('after-reset');
    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
  });

  it('reads the DynamoDB table name and region provided by Alexa-hosted', () => {
    process.env.DYNAMODB_PERSISTENCE_TABLE_NAME = 'nova-table';
    process.env.DYNAMODB_PERSISTENCE_REGION = 'us-east-1';

    const config = getConfig({ envPath: 'fake.env' });
    expect(config.profileTableName).toBe('nova-table');
    expect(config.profileTableRegion).toBe('us-east-1');
  });

  it('leaves the profile table undefined when it is not configured', () => {
    const config = getConfig({ envPath: 'fake.env' });
    expect(config.profileTableName).toBeUndefined();
    expect(config.profileTableRegion).toBeUndefined();
  });
});
