import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  // --- Static .all keys ---

  describe('static keys', () => {
    test('medications.all returns ["medications"]', () => {
      expect(queryKeys.medications.all).toEqual(['medications']);
    });

    test('schedules.all returns ["schedules"]', () => {
      expect(queryKeys.schedules.all).toEqual(['schedules']);
    });

    test('doseLogs.all returns ["doseLogs"]', () => {
      expect(queryKeys.doseLogs.all).toEqual(['doseLogs']);
    });

    test('symptoms.all returns ["symptoms"]', () => {
      expect(queryKeys.symptoms.all).toEqual(['symptoms']);
    });

    test('profile.current returns ["profile"]', () => {
      expect(queryKeys.profile.current).toEqual(['profile']);
    });
  });

  // --- Factory functions ---

  describe('medications', () => {
    test('detail() includes the id', () => {
      expect(queryKeys.medications.detail('med-1')).toEqual(['medications', 'med-1']);
    });
  });

  describe('schedules', () => {
    test('byMedication() includes medicationId', () => {
      expect(queryKeys.schedules.byMedication('med-1')).toEqual([
        'schedules',
        'byMedication',
        'med-1',
      ]);
    });

    test('detail() includes the id', () => {
      expect(queryKeys.schedules.detail('sched-1')).toEqual(['schedules', 'detail', 'sched-1']);
    });
  });

  describe('doseLogs', () => {
    test('byDate() includes the date string', () => {
      expect(queryKeys.doseLogs.byDate('2026-03-23')).toEqual(['doseLogs', 'byDate', '2026-03-23']);
    });

    test('byRange() includes start and end', () => {
      expect(queryKeys.doseLogs.byRange('2026-03-01', '2026-03-31')).toEqual([
        'doseLogs',
        'byRange',
        '2026-03-01',
        '2026-03-31',
      ]);
    });

    test('prnByMedication() includes medicationId', () => {
      expect(queryKeys.doseLogs.prnByMedication('med-1')).toEqual(['doseLogs', 'prn', 'med-1']);
    });
  });

  describe('symptoms', () => {
    test('byDate() includes the date string', () => {
      expect(queryKeys.symptoms.byDate('2026-03-23')).toEqual(['symptoms', 'byDate', '2026-03-23']);
    });

    test('byRange() includes start and end', () => {
      expect(queryKeys.symptoms.byRange('2026-01-01', '2026-12-31')).toEqual([
        'symptoms',
        'byRange',
        '2026-01-01',
        '2026-12-31',
      ]);
    });

    test('byMedication() includes medicationId', () => {
      expect(queryKeys.symptoms.byMedication('med-5')).toEqual([
        'symptoms',
        'byMedication',
        'med-5',
      ]);
    });
  });

  describe('drugSearch', () => {
    test('byQuery() includes the query string', () => {
      expect(queryKeys.drugSearch.byQuery('aspirin')).toEqual(['drugSearch', 'aspirin']);
    });
  });

  describe('drugInteractions', () => {
    test('byRxcuis() spreads sorted rxcuis', () => {
      expect(queryKeys.drugInteractions.byRxcuis(['123', '456'])).toEqual([
        'drugInteractions',
        '123',
        '456',
      ]);
    });

    test('byRxcuis() sorts input for cache consistency', () => {
      expect(queryKeys.drugInteractions.byRxcuis(['b', 'a'])).toEqual([
        'drugInteractions',
        'a',
        'b',
      ]);
    });

    test('byRxcuis() handles single rxcui', () => {
      expect(queryKeys.drugInteractions.byRxcuis(['999'])).toEqual(['drugInteractions', '999']);
    });
  });

  // --- New instances ---

  describe('factory functions return new array instances', () => {
    test('medications.detail returns new array each call', () => {
      const a = queryKeys.medications.detail('x');
      const b = queryKeys.medications.detail('x');
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    test('doseLogs.byDate returns new array each call', () => {
      const a = queryKeys.doseLogs.byDate('2026-01-01');
      const b = queryKeys.doseLogs.byDate('2026-01-01');
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    test('empty string id in medications.detail', () => {
      expect(queryKeys.medications.detail('')).toEqual(['medications', '']);
    });

    test('special characters in schedule id', () => {
      expect(queryKeys.schedules.detail('id/with?special&chars')).toEqual([
        'schedules',
        'detail',
        'id/with?special&chars',
      ]);
    });

    test('drugInteractions.byRxcuis with empty array', () => {
      expect(queryKeys.drugInteractions.byRxcuis([])).toEqual(['drugInteractions']);
    });
  });
});
