const { UserProfile, mergeInterests } = require('../../src/domain/entities/UserProfile');

const NOW = new Date('2026-11-26T14:30:00.000Z');
const LATER = new Date('2026-11-27T10:00:00.000Z');

describe('UserProfile', () => {
  it('creates an empty profile with timestamps and schema version', () => {
    const profile = UserProfile.create('user-1', NOW);

    expect(profile.toJSON()).toEqual({
      id: 'user-1',
      interests: [],
      visitCount: 0,
      lastVisitAt: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      schemaVersion: 1,
    });
    expect(profile.hasInterests()).toBe(false);
    expect(profile.isReturning()).toBe(false);
  });

  it.each([undefined, '', '   ', 42])('rejects an invalid id (%p)', (id) => {
    expect(() => new UserProfile({ id })).toThrow(TypeError);
  });

  it('registers visits', () => {
    const profile = UserProfile.create('user-1', NOW).registerVisit(NOW).registerVisit(LATER);

    expect(profile.visitCount).toBe(2);
    expect(profile.lastVisitAt).toBe(LATER.toISOString());
    expect(profile.updatedAt).toBe(LATER.toISOString());
    expect(profile.createdAt).toBe(NOW.toISOString());
    expect(profile.isReturning()).toBe(true);
  });

  it('puts new interests first and moves repeated ones to the front', () => {
    const profile = UserProfile.create('user-1', NOW).addInterests(['astronomía', 'cocina'], NOW);
    profile.addInterests(['historia', 'Cocina'], LATER);

    expect(profile.interests).toEqual(['historia', 'Cocina', 'astronomía']);
    expect(profile.updatedAt).toBe(LATER.toISOString());
  });

  it('dedupes ignoring case, accents and extra spaces', () => {
    const profile = UserProfile.create('user-1', NOW).addInterests(['Astronomía', ' astronomia ', 'ASTRONOMÍA'], NOW);
    expect(profile.interests).toEqual(['Astronomía']);
  });

  it('keeps only the 5 most recent interests', () => {
    const profile = UserProfile.create('user-1', NOW).addInterests(['a1', 'a2', 'a3', 'a4'], NOW);
    profile.addInterests(['b1', 'b2'], LATER);

    expect(profile.interests).toEqual(['b1', 'b2', 'a1', 'a2', 'a3']);
    expect(profile.interests).toHaveLength(UserProfile.MAX_INTERESTS);
  });

  it('ignores invalid topics and cuts very long ones', () => {
    const long = 'x'.repeat(60);
    const profile = UserProfile.create('user-1', NOW).addInterests(['', null, 7, '  ', long, 'cine'], NOW);

    expect(profile.interests).toEqual(['x'.repeat(UserProfile.MAX_INTEREST_LENGTH), 'cine']);
  });

  it('does not expose its internal interests array', () => {
    const profile = UserProfile.create('user-1', NOW).addInterests(['cine'], NOW);
    profile.interests.push('hack');
    expect(profile.interests).toEqual(['cine']);
  });

  it('round-trips through toJSON and fromJSON', () => {
    const profile = UserProfile.create('user-1', NOW).addInterests(['cine'], NOW).registerVisit(LATER);
    expect(UserProfile.fromJSON(profile.toJSON()).toJSON()).toEqual(profile.toJSON());
  });

  it('fills defaults for old or partial records', () => {
    const profile = UserProfile.fromJSON({
      id: 'user-1',
      interests: 'no es una lista',
      visitCount: -3,
      createdAt: 'x',
    });

    expect(profile.toJSON()).toEqual({
      id: 'user-1',
      interests: [],
      visitCount: 0,
      lastVisitAt: null,
      createdAt: null,
      updatedAt: null,
      schemaVersion: 1,
    });
  });

  it.each([null, undefined, {}, { id: '' }])('returns null from fromJSON without a valid id (%p)', (data) => {
    expect(UserProfile.fromJSON(data)).toBeNull();
  });
});

describe('mergeInterests', () => {
  it('returns an empty list for invalid input', () => {
    expect(mergeInterests(undefined)).toEqual([]);
    expect(mergeInterests('cine')).toEqual([]);
  });

  it('respects a custom limit', () => {
    expect(mergeInterests(['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
  });
});
