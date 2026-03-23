import { checkInteractions, getDrugProperties, searchDrugs } from './drugApi';

function mockFetchResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  // Ensure fetch exists on global so jest.spyOn works in jsdom (Web) env
  if (typeof global.fetch === 'undefined') {
    global.fetch = jest.fn();
  }
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------- searchDrugs ----------

describe('searchDrugs', () => {
  test('returns [] for empty query', async () => {
    expect(await searchDrugs('')).toEqual([]);
  });

  test('returns [] for query shorter than 2 chars', async () => {
    expect(await searchDrugs('a')).toEqual([]);
  });

  test('returns [] when API responds with !ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse({}, false));
    expect(await searchDrugs('aspirin')).toEqual([]);
  });

  test('returns mapped results for a valid query', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('approximateTerm')) {
        return mockFetchResponse({
          approximateGroup: {
            candidate: [{ rxcui: '1191' }],
          },
        });
      }
      // properties fetch
      return mockFetchResponse({
        properties: { name: 'Aspirin', synonym: 'ASA', tty: 'IN' },
      });
    });

    const results = await searchDrugs('aspirin');
    expect(results).toEqual([{ rxcui: '1191', name: 'Aspirin', synonym: 'ASA', tty: 'IN' }]);
  });

  test('deduplicates candidates by rxcui', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('approximateTerm')) {
        return mockFetchResponse({
          approximateGroup: {
            candidate: [{ rxcui: '100' }, { rxcui: '100' }, { rxcui: '200' }],
          },
        });
      }
      return mockFetchResponse({
        properties: { name: 'Drug', synonym: '', tty: 'IN' },
      });
    });

    const results = await searchDrugs('test');
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.rxcui)).toEqual(['100', '200']);
  });

  test('respects maxResults', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('approximateTerm')) {
        return mockFetchResponse({
          approximateGroup: {
            candidate: [{ rxcui: '1' }, { rxcui: '2' }, { rxcui: '3' }],
          },
        });
      }
      return mockFetchResponse({
        properties: { name: 'Drug', synonym: '', tty: 'IN' },
      });
    });

    const results = await searchDrugs('test', 2);
    expect(results).toHaveLength(2);
  });
});

// ---------- getDrugProperties ----------

describe('getDrugProperties', () => {
  test('returns null for empty rxcui', async () => {
    expect(await getDrugProperties('')).toBeNull();
  });

  test('returns null when fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse({}, false));
    expect(await getDrugProperties('1191')).toBeNull();
  });

  test('returns mapped properties with brand names', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('related.json')) {
        return mockFetchResponse({
          relatedGroup: {
            conceptGroup: [{ conceptProperties: [{ name: 'Bayer' }, { name: 'Ecotrin' }] }],
          },
        });
      }
      return mockFetchResponse({
        properties: { name: 'Aspirin', doseForms: 'Tablet', strength: '325 mg' },
      });
    });

    const result = await getDrugProperties('1191');
    expect(result).toEqual({
      rxcui: '1191',
      name: 'Aspirin',
      genericName: 'Aspirin',
      brandNames: ['Bayer', 'Ecotrin'],
      doseFormGroup: 'Tablet',
      strength: '325 mg',
    });
  });

  test('returns empty brandNames when brand lookup fails', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('related.json')) {
        return mockFetchResponse({}, false);
      }
      return mockFetchResponse({
        properties: { name: 'Aspirin', doseForms: '', strength: '' },
      });
    });

    const result = await getDrugProperties('1191');
    expect(result).not.toBeNull();
    expect(result?.brandNames).toEqual([]);
  });
});

// ---------- checkInteractions ----------

describe('checkInteractions', () => {
  test('returns [] for fewer than 2 drug names', async () => {
    expect(await checkInteractions([])).toEqual([]);
    expect(await checkInteractions(['Aspirin'])).toEqual([]);
  });

  test('returns interaction results when found', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      mockFetchResponse({
        results: [
          {
            drug_interactions: [
              'Avoid concomitant use with warfarin due to serious bleeding risk.',
            ],
          },
        ],
      }),
    );

    const results = await checkInteractions(['Aspirin', 'Warfarin']);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].drug1).toBe('Aspirin');
    expect(results[0].drug2).toBe('Warfarin');
    expect(results[0].source).toBe('OpenFDA Drug Labeling');
  });

  test('handles API errors gracefully', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse({}, false));
    const results = await checkInteractions(['Aspirin', 'Ibuprofen']);
    expect(results).toEqual([]);
  });

  test('deduplicates interaction pairs', async () => {
    // Both drugs will search and find the other mentioned — only one pair should appear
    jest.spyOn(global, 'fetch').mockResolvedValue(
      mockFetchResponse({
        results: [
          {
            drug_interactions: ['Caution when used with ibuprofen. Also caution with aspirin.'],
          },
        ],
      }),
    );

    const results = await checkInteractions(['Aspirin', 'Ibuprofen']);
    const pairKeys = results.map((r) => [r.drug1, r.drug2].sort().join('|'));
    const uniqueKeys = [...new Set(pairKeys)];
    expect(pairKeys.length).toBe(uniqueKeys.length);
  });
});

// ─── Branch coverage: searchDrugs ───────────────────────────────────

describe('searchDrugs – branch coverage', () => {
  test('skips candidate when property fetch returns ok:false', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('approximateTerm')) {
        return mockFetchResponse({
          approximateGroup: { candidate: [{ rxcui: '111' }, { rxcui: '222' }] },
        });
      }
      if (url.includes('/111/')) return mockFetchResponse({}, false);
      return mockFetchResponse({
        properties: { name: 'DrugB', synonym: 'SynB', tty: 'BN' },
      });
    });

    const results = await searchDrugs('test');
    expect(results).toHaveLength(1);
    expect(results[0].rxcui).toBe('222');
  });

  test('skips candidate when propJson.properties is null', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('approximateTerm')) {
        return mockFetchResponse({
          approximateGroup: { candidate: [{ rxcui: '111' }, { rxcui: '222' }] },
        });
      }
      if (url.includes('/111/')) return mockFetchResponse({ properties: null });
      return mockFetchResponse({
        properties: { name: 'DrugB', synonym: 'SynB', tty: 'BN' },
      });
    });

    const results = await searchDrugs('test');
    expect(results).toHaveLength(1);
    expect(results[0].rxcui).toBe('222');
  });

  test('defaults name/synonym/tty to empty string when null', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('approximateTerm')) {
        return mockFetchResponse({
          approximateGroup: { candidate: [{ rxcui: '999' }] },
        });
      }
      return mockFetchResponse({
        properties: { name: null, synonym: null, tty: null },
      });
    });

    const results = await searchDrugs('test');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ rxcui: '999', name: '', synonym: '', tty: '' });
  });
});

// ─── Branch coverage: getDrugProperties ─────────────────────────────

describe('getDrugProperties – branch coverage', () => {
  test('returns empty brandNames when groups is not an array', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('related.json')) {
        return mockFetchResponse({
          relatedGroup: { conceptGroup: 'not-an-array' },
        });
      }
      return mockFetchResponse({
        properties: { name: 'TestDrug', doseForms: '', strength: '' },
      });
    });

    const result = await getDrugProperties('123');
    expect(result?.brandNames).toEqual([]);
  });

  test('returns empty brandNames when conceptProperties is not an array', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('related.json')) {
        return mockFetchResponse({
          relatedGroup: {
            conceptGroup: [{ conceptProperties: 'not-an-array' }],
          },
        });
      }
      return mockFetchResponse({
        properties: { name: 'TestDrug', doseForms: '', strength: '' },
      });
    });

    const result = await getDrugProperties('123');
    expect(result?.brandNames).toEqual([]);
  });

  test('defaults props values to empty string when null', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('related.json')) return mockFetchResponse({}, false);
      return mockFetchResponse({
        properties: { name: null, doseForms: null, strength: null },
      });
    });

    const result = await getDrugProperties('456');
    expect(result).toEqual({
      rxcui: '456',
      name: '',
      genericName: '',
      brandNames: [],
      doseFormGroup: '',
      strength: '',
    });
  });
});

// ─── Branch coverage: checkInteractions (extractRelevantSentence / inferSeverity) ──

describe('checkInteractions – branch coverage', () => {
  test('handles interaction text with no period after drug mention (sentenceEnd === -1)', async () => {
    // Text mentions "ibuprofen" but has no period after the mention
    jest.spyOn(global, 'fetch').mockResolvedValue(
      mockFetchResponse({
        results: [
          {
            drug_interactions: [
              'Avoid concurrent use with ibuprofen due to increased bleeding risk',
            ],
          },
        ],
      }),
    );

    const results = await checkInteractions(['Aspirin', 'Ibuprofen']);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].description).toContain('ibuprofen');
  });

  test('truncates extracted sentence longer than 300 chars', async () => {
    const padding = 'x'.repeat(350);
    const longText = `This interaction with ibuprofen ${padding} is dangerous`;
    jest.spyOn(global, 'fetch').mockResolvedValue(
      mockFetchResponse({
        results: [{ drug_interactions: [longText] }],
      }),
    );

    const results = await checkInteractions(['Aspirin', 'Ibuprofen']);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // Truncated to 300 chars + ellipsis
    expect(results[0].description.length).toBeLessThanOrEqual(301);
    expect(results[0].description).toContain('…');
  });

  test('extractRelevantSentence returns first 200 chars when drug not found in text', async () => {
    // The drug mention check uses the lowered first word of drug2.
    // We craft text where "ibu" (length >= 3) appears via includes but the actual
    // extractRelevantSentence receives text where the drug is at the start (idx=0).
    // To trigger idx === -1 we'd need the function called with a name not in text,
    // which can't happen through checkInteractions. So we test the boundary instead:
    // text with drug at very start (idx = 0) with no preceding period.
    jest.spyOn(global, 'fetch').mockResolvedValue(
      mockFetchResponse({
        results: [
          {
            drug_interactions: [
              'ibuprofen may increase bleeding when combined with anticoagulants.',
            ],
          },
        ],
      }),
    );

    const results = await checkInteractions(['Aspirin', 'Ibuprofen']);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // sentenceStart backs up to 0 since no period before idx
    expect(results[0].description).toMatch(/^ibuprofen/i);
  });
});
