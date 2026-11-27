const { UserProfile } = require('../../domain/entities/UserProfile');

const requireRepository = (profileRepository, name) => {
  if (
    !profileRepository ||
    typeof profileRepository.get !== 'function' ||
    typeof profileRepository.save !== 'function'
  ) {
    throw new TypeError(`${name} needs a profileRepository with get() and save() methods`);
  }
};

/* *
 * Use case: the user opens the skill. Registers the visit in their profile
 * and tells the presentation layer how to greet them:
 * - isReturning: they opened Nova before
 * - interests: topics they like (most recent first), empty if unknown
 * Without a userId nothing is stored and the normal greeting is used.
 * */
class GetGreetingUseCase {
  constructor({ profileRepository, clock = () => new Date() }) {
    requireRepository(profileRepository, 'GetGreetingUseCase');
    this.profileRepository = profileRepository;
    this.clock = clock;
  }

  async execute(userId) {
    if (!userId) return { isReturning: false, interests: [] };

    const now = this.clock();
    const profile = (await this.profileRepository.get(userId)) || UserProfile.create(userId, now);
    const greeting = { isReturning: profile.isReturning(), interests: profile.interests };

    profile.registerVisit(now);
    await this.profileRepository.save(profile);

    return greeting;
  }
}

module.exports = { GetGreetingUseCase, requireRepository };
