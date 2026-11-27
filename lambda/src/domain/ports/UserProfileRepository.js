/* *
 * Port (interface) for storing user profiles between sessions. The
 * application layer depends on this contract, never on DynamoDB directly.
 *
 * Implementations must:
 * - get(userId) resolve with a UserProfile, or null if none is stored
 * - save(profile) persist the given UserProfile
 * - delete(userId) remove the stored profile (no error if it does not exist)
 * */
class UserProfileRepository {
  // eslint-disable-next-line no-unused-vars
  async get(userId) {
    throw new Error('UserProfileRepository.get() is not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async save(profile) {
    throw new Error('UserProfileRepository.save() is not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async delete(userId) {
    throw new Error('UserProfileRepository.delete() is not implemented');
  }
}

module.exports = { UserProfileRepository };
