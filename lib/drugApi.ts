import type { DrugProperties, DrugSearchResult, InteractionResult } from '../types/drug';

const RXNORM_BASE = 'https://rxnav.nlm.nih.gov/REST';
const OPENFDA_BASE = 'https://api.fda.gov/drug/label.json';

/**
 * Search for drugs by name using RxNorm approximate term endpoint.
 * Returns up to `maxResults` matches.
 */
export async function searchDrugs(query: string, maxResults = 10): Promise<DrugSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(query.trim())}&maxEntries=${maxResults}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  const candidates = json?.approximateGroup?.candidate;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  // Fetch display names for each rxcui
  const seen = new Set<string>();
  const results: DrugSearchResult[] = [];

  for (const c of candidates) {
    const rxcui = c.rxcui as string;
    if (!rxcui || seen.has(rxcui)) continue;
    seen.add(rxcui);

    const propUrl = `${RXNORM_BASE}/rxcui/${rxcui}/properties.json`;
    const propRes = await fetch(propUrl);
    if (!propRes.ok) continue;

    const propJson = await propRes.json();
    const props = propJson?.properties;
    if (!props) continue;

    results.push({
      rxcui,
      name: props.name ?? '',
      synonym: props.synonym ?? '',
      tty: props.tty ?? '',
    });

    if (results.length >= maxResults) break;
  }

  return results;
}

/**
 * Get detailed drug properties from RxNorm.
 */
export async function getDrugProperties(rxcui: string): Promise<DrugProperties | null> {
  if (!rxcui) return null;

  const url = `${RXNORM_BASE}/rxcui/${encodeURIComponent(rxcui)}/properties.json`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json();
  const props = json?.properties;
  if (!props) return null;

  // Try to get related brand names
  let brandNames: string[] = [];
  try {
    const bnUrl = `${RXNORM_BASE}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=BN`;
    const bnRes = await fetch(bnUrl);
    if (bnRes.ok) {
      const bnJson = await bnRes.json();
      const groups = bnJson?.relatedGroup?.conceptGroup;
      if (Array.isArray(groups)) {
        for (const g of groups) {
          if (Array.isArray(g.conceptProperties)) {
            brandNames = g.conceptProperties.map((cp: { name: string }) => cp.name);
          }
        }
      }
    }
  } catch {
    // brand name lookup is best-effort
  }

  return {
    rxcui,
    name: props.name ?? '',
    genericName: props.name ?? '',
    brandNames,
    doseFormGroup: props.doseForms ?? '',
    strength: props.strength ?? '',
  };
}

/**
 * Check drug interactions using OpenFDA drug labeling data.
 * Searches the drug_interactions field for mentions of all other drug names.
 */
export async function checkInteractions(drugNames: string[]): Promise<InteractionResult[]> {
  if (drugNames.length < 2) return [];

  const results: InteractionResult[] = [];

  for (let i = 0; i < drugNames.length; i++) {
    const drug1 = drugNames[i];
    const searchName = drug1.split(' ')[0]; // Use first word (generic name) for broader matches

    try {
      const url = `${OPENFDA_BASE}?search=drug_interactions:${encodeURIComponent(searchName)}&limit=5`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const json = await res.json();
      const labelsArray = json?.results;
      if (!Array.isArray(labelsArray)) continue;

      for (const label of labelsArray) {
        const interactionText = Array.isArray(label.drug_interactions)
          ? label.drug_interactions.join(' ')
          : '';
        if (!interactionText) continue;

        const lowerText = interactionText.toLowerCase();

        // Check if any other drug in the user's list is mentioned
        for (let j = 0; j < drugNames.length; j++) {
          if (i === j) continue;
          const drug2 = drugNames[j];
          const drug2First = drug2.split(' ')[0].toLowerCase();

          if (drug2First.length >= 3 && lowerText.includes(drug2First)) {
            // Determine severity heuristically from the label text
            const severity = inferSeverity(lowerText, drug2First);

            // Avoid duplicate pairs
            const pairKey = [drug1, drug2].sort().join('|');
            if (!results.some((r) => [r.drug1, r.drug2].sort().join('|') === pairKey)) {
              results.push({
                drug1,
                drug2,
                severity,
                description: extractRelevantSentence(interactionText, drug2First),
                source: 'OpenFDA Drug Labeling',
              });
            }
          }
        }
      }
    } catch {
      // Network errors are non-fatal for interaction checks
    }
  }

  return results;
}

function inferSeverity(text: string, drugName: string): 'high' | 'moderate' | 'low' {
  // Look for severity indicators near the drug mention
  const highIndicators = [
    'contraindicated',
    'do not use',
    'avoid',
    'serious',
    'fatal',
    'life-threatening',
    'prohibited',
    'never',
  ];
  const moderateIndicators = [
    'caution',
    'monitor',
    'adjust dose',
    'reduce',
    'may increase',
    'may decrease',
    'potential',
    'risk',
  ];

  const drugIdx = text.indexOf(drugName);
  // Check a window of 200 chars around the mention
  const start = Math.max(0, drugIdx - 100);
  const end = Math.min(text.length, drugIdx + drugName.length + 100);
  const context = text.substring(start, end).toLowerCase();

  if (highIndicators.some((ind) => context.includes(ind))) return 'high';
  if (moderateIndicators.some((ind) => context.includes(ind))) return 'moderate';
  return 'low';
}

function extractRelevantSentence(text: string, drugName: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(drugName);
  if (idx === -1) return text.substring(0, 200);

  // Find sentence boundaries
  let sentenceStart = idx;
  while (sentenceStart > 0 && text[sentenceStart - 1] !== '.') sentenceStart--;
  let sentenceEnd = lower.indexOf('.', idx);
  if (sentenceEnd === -1) sentenceEnd = text.length;
  else sentenceEnd += 1;

  const sentence = text.substring(sentenceStart, sentenceEnd).trim();
  return sentence.length > 300 ? `${sentence.substring(0, 300)}…` : sentence;
}
