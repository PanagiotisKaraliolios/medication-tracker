/** Result from RxNorm drug name search. */
export type DrugSearchResult = {
  rxcui: string;
  name: string;
  synonym: string;
  tty: string;
};

/** Detailed drug properties from RxNorm. */
export type DrugProperties = {
  rxcui: string;
  name: string;
  genericName: string;
  brandNames: string[];
  doseFormGroup: string;
  strength: string;
};

/** Interaction between two drugs (from OpenFDA label data). */
export type InteractionResult = {
  drug1: string;
  drug2: string;
  severity: 'high' | 'moderate' | 'low';
  description: string;
  source: string;
};
