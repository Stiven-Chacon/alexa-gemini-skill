/* *
 * Use case: read the stored user profile without changing it.
 * Used when Nova needs the interests already known about the user
 * (for example in the fallback message) without counting a new visit.
 * */
class GetProfileUseCase {
  constructor({ profileRepository }) {
    if (!profileRepository || typeof profileRepository.get !== 'function') {
      throw new TypeError('GetProfileUseCase needs a profileRepository with a get() method');
    }
    this.profileRepository = profileRepository;
  }

  async execute(userId) {
    if (!userId) return null;
    return this.profileRepository.get(userId);
  }
}

module.exports = { GetProfileUseCase };
