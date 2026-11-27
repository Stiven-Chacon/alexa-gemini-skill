/* *
 * UserProfileRepository kept in memory. Used in tests and when the skill
 * runs without DynamoDB (for example with the local debugger): profiles
 * only last while the process is alive.
 * Stores plain copies, so callers can never change a saved profile by accident.
 * */
const { UserProfileRepository } = require('../../domain/ports/UserProfileRepository');
const { UserProfile } = require('../../domain/entities/UserProfile');

class InMemoryUserProfileRepository extends UserProfileRepository {
  constructor() {
    super();
    this.items = new Map();
  }

  async get(userId) {
    const item = this.items.get(userId);
    return item ? UserProfile.fromJSON({ ...item, interests: [...item.interests] }) : null;
  }

  async save(profile) {
    const item = profile.toJSON();
    this.items.set(item.id, item);
  }

  async delete(userId) {
    this.items.delete(userId);
  }
}

module.exports = { InMemoryUserProfileRepository };
