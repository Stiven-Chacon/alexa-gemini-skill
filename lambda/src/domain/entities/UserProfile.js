const SCHEMA_VERSION = 1;
const MAX_INTERESTS = 5;
const MAX_INTEREST_LENGTH = 40;

// "Astronomía", " astronomia " and "ASTRONOMÍA" are the same interest.
const interestKey = (topic) =>
  topic
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const cleanInterest = (topic) =>
  typeof topic === 'string' ? topic.trim().replace(/\s+/g, ' ').slice(0, MAX_INTEREST_LENGTH).trim() : '';

// Keeps the first occurrence of each topic, so the list must come ordered
// from the most recent to the oldest.
function mergeInterests(topics, maxInterests = MAX_INTERESTS) {
  const seen = new Set();
  const merged = [];
  (Array.isArray(topics) ? topics : []).forEach((topic) => {
    const clean = cleanInterest(topic);
    const key = clean && interestKey(clean);
    if (!clean || seen.has(key)) return;
    seen.add(key);
    merged.push(clean);
  });
  return merged.slice(0, maxInterests);
}

const toIsoOrNull = (value) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null);
const toIso = (date) => (date instanceof Date ? date : new Date(date)).toISOString();

/* *
 * What Nova remembers about a user between sessions: a few topics they
 * like and how often they come back. Never the full conversations.
 * interests is ordered from the most recent topic to the oldest.
 * */
class UserProfile {
  constructor({
    id,
    interests = [],
    visitCount = 0,
    lastVisitAt = null,
    createdAt = null,
    updatedAt = null,
    maxInterests = MAX_INTERESTS,
  } = {}) {
    if (typeof id !== 'string' || !id.trim()) {
      throw new TypeError('UserProfile needs a non-empty id (the Alexa userId)');
    }
    this.id = id;
    this.maxInterests = maxInterests;
    this._interests = mergeInterests(interests, maxInterests);
    this.visitCount = Number.isInteger(visitCount) && visitCount > 0 ? visitCount : 0;
    this.lastVisitAt = toIsoOrNull(lastVisitAt);
    this.createdAt = toIsoOrNull(createdAt);
    this.updatedAt = toIsoOrNull(updatedAt);
    this.schemaVersion = SCHEMA_VERSION;
  }

  static create(id, now = new Date()) {
    const timestamp = toIso(now);
    return new UserProfile({ id, createdAt: timestamp, updatedAt: timestamp });
  }

  get interests() {
    return [...this._interests];
  }

  hasInterests() {
    return this._interests.length > 0;
  }

  // True when the user already opened Nova before.
  isReturning() {
    return this.visitCount > 0;
  }

  registerVisit(now = new Date()) {
    const timestamp = toIso(now);
    this.visitCount += 1;
    this.lastVisitAt = timestamp;
    this.createdAt = this.createdAt || timestamp;
    this.updatedAt = timestamp;
    return this;
  }

  // New topics go first; repeated ones move to the front and the oldest
  // are dropped when there are more than maxInterests.
  addInterests(topics, now = new Date()) {
    const timestamp = toIso(now);
    this._interests = mergeInterests([...(Array.isArray(topics) ? topics : []), ...this._interests], this.maxInterests);
    this.createdAt = this.createdAt || timestamp;
    this.updatedAt = timestamp;
    return this;
  }

  // Plain object, safe to store in DynamoDB.
  toJSON() {
    return {
      id: this.id,
      interests: this.interests,
      visitCount: this.visitCount,
      lastVisitAt: this.lastVisitAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      schemaVersion: this.schemaVersion,
    };
  }

  // Rebuilds a profile from a stored record. Missing or invalid fields
  // (for example in records saved by an older version) get defaults.
  // Returns null when the record has no valid id.
  static fromJSON(data) {
    if (!data || typeof data.id !== 'string' || !data.id.trim()) return null;
    return new UserProfile({
      id: data.id,
      interests: data.interests,
      visitCount: data.visitCount,
      lastVisitAt: data.lastVisitAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}

UserProfile.SCHEMA_VERSION = SCHEMA_VERSION;
UserProfile.MAX_INTERESTS = MAX_INTERESTS;
UserProfile.MAX_INTEREST_LENGTH = MAX_INTEREST_LENGTH;

module.exports = { UserProfile, mergeInterests };
