/* *
 * UserProfileRepository backed by DynamoDB. Alexa-hosted skills already
 * include a table: its name comes in DYNAMODB_PERSISTENCE_TABLE_NAME and its
 * partition key is "id", where we store the Alexa userId.
 * Uses aws-sdk v2 (already in lambda/package.json) with short timeouts and
 * one retry, so a slow table never makes Alexa wait too long.
 * */
const { UserProfileRepository } = require('../../domain/ports/UserProfileRepository');
const { UserProfile } = require('../../domain/entities/UserProfile');

const KEY_ATTRIBUTE = 'id';
const CLIENT_DEFAULTS = Object.freeze({
  maxRetries: 1,
  httpOptions: { connectTimeout: 1000, timeout: 1500 },
});

function createDocumentClient(region) {
  // Required lazily: tests and local runs without DynamoDB never load the SDK.
  const AWS = require('aws-sdk');
  return new AWS.DynamoDB.DocumentClient({ ...CLIENT_DEFAULTS, ...(region ? { region } : {}) });
}

class DynamoUserProfileRepository extends UserProfileRepository {
  constructor({ tableName, region, documentClient } = {}) {
    super();
    if (typeof tableName !== 'string' || !tableName.trim()) {
      throw new TypeError('DynamoUserProfileRepository needs a table name');
    }
    this.tableName = tableName;
    this.client = documentClient || createDocumentClient(region);
  }

  async get(userId) {
    const { Item } = await this.client.get({ TableName: this.tableName, Key: { [KEY_ATTRIBUTE]: userId } }).promise();
    return Item ? UserProfile.fromJSON(Item) : null;
  }

  async save(profile) {
    await this.client.put({ TableName: this.tableName, Item: profile.toJSON() }).promise();
  }

  async delete(userId) {
    await this.client.delete({ TableName: this.tableName, Key: { [KEY_ATTRIBUTE]: userId } }).promise();
  }
}

module.exports = { DynamoUserProfileRepository, KEY_ATTRIBUTE };
