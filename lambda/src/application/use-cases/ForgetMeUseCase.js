/* *
 * Use case: the user asks Nova to forget them. Deletes their stored profile.
 * */
class ForgetMeUseCase {
  constructor({ profileRepository }) {
    if (!profileRepository || typeof profileRepository.delete !== 'function') {
      throw new TypeError('ForgetMeUseCase needs a profileRepository with a delete() method');
    }
    this.profileRepository = profileRepository;
  }

  async execute(userId) {
    if (!userId) return;
    await this.profileRepository.delete(userId);
  }
}

module.exports = { ForgetMeUseCase };
