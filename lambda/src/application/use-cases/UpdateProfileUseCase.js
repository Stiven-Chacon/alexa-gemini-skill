const { UserProfile } = require('../../domain/entities/UserProfile');
const { MessageRole } = require('../../domain/entities/Message');
const { requireRepository } = require('./GetGreetingUseCase');

/* *
 * Use case: the session is ending. Takes the questions the user asked in
 * this conversation, asks the AI for their general topics and merges them
 * into the stored profile. Resolves with the updated profile, or null when
 * there was nothing to learn.
 * */
class UpdateProfileUseCase {
  constructor({ aiProvider, profileRepository, clock = () => new Date() }) {
    if (!aiProvider || typeof aiProvider.extractInterests !== 'function') {
      throw new TypeError('UpdateProfileUseCase needs an aiProvider with an extractInterests() method');
    }
    requireRepository(profileRepository, 'UpdateProfileUseCase');
    this.aiProvider = aiProvider;
    this.profileRepository = profileRepository;
    this.clock = clock;
  }

  async execute(userId, conversationRepository) {
    if (!userId || !conversationRepository) return null;

    const conversation = await conversationRepository.load();
    const questions = conversation.messages
      .filter((message) => message.role === MessageRole.USER)
      .map((message) => message.text);
    if (questions.length === 0) return null;

    const interests = await this.aiProvider.extractInterests(questions);
    if (!Array.isArray(interests) || interests.length === 0) return null;

    const now = this.clock();
    const profile = (await this.profileRepository.get(userId)) || UserProfile.create(userId, now);
    profile.addInterests(interests, now);
    await this.profileRepository.save(profile);
    return profile;
  }
}

module.exports = { UpdateProfileUseCase };
