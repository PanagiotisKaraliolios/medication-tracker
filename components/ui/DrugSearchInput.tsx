import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  AutocompleteDropdown,
  type AutocompleteDropdownItem,
  type IAutocompleteDropdownRef,
} from 'react-native-autocomplete-dropdown';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { DrugSearchResult } from '../../types/drug';
import { borderRadius, type ColorScheme } from './theme';

const TTY_LABELS = {
  BN: 'Brand Name',
  IN: 'Ingredient',
  PIN: 'Precise Ingredient',
  SBD: 'Branded Drug',
  SBDC: 'Branded Drug Component',
  SBDF: 'Branded Dose Form',
  SBDG: 'Branded Dose Group',
  SCD: 'Clinical Drug',
  SCDC: 'Clinical Drug Component',
  SCDF: 'Clinical Dose Form',
  SCDG: 'Clinical Dose Group',
  DF: 'Dose Form',
  DFG: 'Dose Form Group',
  MIN: 'Multi-Ingredient',
  GPCK: 'Generic Pack',
  BPCK: 'Brand Pack',
} as const satisfies Record<string, string>;

interface DrugSearchInputProps {
  query: string;
  onChangeQuery: (text: string) => void;
  results: DrugSearchResult[];
  isLoading: boolean;
  onSelect: (result: DrugSearchResult) => void;
  onClear: () => void;
  selectedRxcui?: string | null;
}

export function DrugSearchInput({
  query,
  onChangeQuery,
  results,
  isLoading,
  onSelect,
  onClear,
  selectedRxcui,
}: DrugSearchInputProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const controllerRef = useRef<IAutocompleteDropdownRef | null>(null);
  const resultsMapRef = useRef<Map<string, DrugSearchResult>>(new Map());

  // Keep a map of rxcui → DrugSearchResult for lookup on select
  useEffect(() => {
    const map = new Map<string, DrugSearchResult>();
    for (const r of results) map.set(r.rxcui, r);
    resultsMapRef.current = map;
  }, [results]);

  // When parent sets selectedRxcui (after selection), update input text
  useEffect(() => {
    if (selectedRxcui) {
      controllerRef.current?.setInputText(query);
    }
  }, [selectedRxcui, query]);

  const dataSet: AutocompleteDropdownItem[] = useMemo(
    () => results.map((r) => ({ id: r.rxcui, title: r.name })),
    [results],
  );

  const handleSelect = useCallback(
    (item: AutocompleteDropdownItem | null) => {
      if (!item) return;
      const drug = resultsMapRef.current.get(item.id);
      if (drug) onSelect(drug);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

  const hasQuery = query.length >= 2;

  const emptyComponent = useMemo(() => {
    if (!hasQuery) return null;
    if (isLoading) {
      return (
        <View style={styles.emptyResult}>
          <ActivityIndicator size="small" color={c.gray400} />
          <Text style={styles.emptyResultText}>Searching…</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyResult}>
        <Feather name="search" size={22} color={c.gray400} />
        <Text style={styles.emptyResultText}>No results found</Text>
        <Text style={styles.emptyResultHint}>Try a different spelling or search term</Text>
      </View>
    );
  }, [hasQuery, isLoading, styles, c.gray400]);

  const dropdownStyle = useMemo(
    () => (hasQuery || results.length > 0 ? styles.dropdown : styles.dropdownHidden),
    [hasQuery, results.length, styles],
  );

  const renderItem = useCallback(
    (item: AutocompleteDropdownItem) => {
      const drug = resultsMapRef.current.get(item.id);
      const ttyLabel = drug ? ((TTY_LABELS as Record<string, string>)[drug.tty] ?? drug.tty) : '';
      return (
        <View style={styles.resultRow}>
          <View style={styles.resultInfo}>
            <Text style={styles.resultName} numberOfLines={1}>
              {item.title}
            </Text>
            {drug?.synonym ? (
              <Text style={styles.resultSynonym} numberOfLines={1}>
                {drug.synonym}
              </Text>
            ) : null}
          </View>
          <Text style={styles.resultTty}>{ttyLabel}</Text>
        </View>
      );
    },
    [styles],
  );

  return (
    <View style={styles.wrapper}>
      <AutocompleteDropdown
        controller={(c) => {
          controllerRef.current = c;
        }}
        dataSet={dataSet}
        onChangeText={onChangeQuery}
        onSelectItem={handleSelect}
        onClear={handleClear}
        renderItem={renderItem}
        useFilter={false}
        loading={isLoading}
        debounce={0}
        showClear={!!selectedRxcui || query.length > 0}
        showChevron={false}
        clearOnFocus={false}
        closeOnSubmit
        suggestionsListMaxHeight={220}
        textInputProps={{
          placeholder: 'e.g., Amoxicillin',
          placeholderTextColor: c.gray400,
          style: styles.input,
        }}
        inputContainerStyle={styles.inputContainer}
        suggestionsListContainerStyle={dropdownStyle}
        containerStyle={styles.container}
        LeftComponent={
          <View style={styles.leftIcon}>
            <Feather name="search" size={18} color={c.gray400} />
          </View>
        }
        ClearIconComponent={<Feather name="x-circle" size={18} color={c.gray400} />}
        ItemSeparatorComponent={undefined}
        EmptyResultComponent={emptyComponent}
      />

      {selectedRxcui && (
        <View style={styles.linkedBadge}>
          <Feather name="check-circle" size={14} color={c.teal} />
          <Text style={styles.linkedText}>Linked to drug database</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    wrapper: {
      zIndex: 10,
    },
    container: {
      flexGrow: 1,
      flexShrink: 1,
    },
    inputContainer: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.gray200,
      paddingHorizontal: 4,
    },
    input: {
      fontSize: 15,
      color: c.gray900,
      paddingLeft: 0,
    },
    leftIcon: {
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },
    linkedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    linkedText: {
      fontSize: 12,
      color: c.teal,
    },
    dropdown: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.gray200,
    },
    dropdownHidden: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      height: 0,
      overflow: 'hidden',
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.gray200,
    },
    resultInfo: {
      flex: 1,
      marginRight: 8,
    },
    resultName: {
      fontSize: 15,
      color: c.gray900,
      fontWeight: '500',
    },
    resultSynonym: {
      fontSize: 12,
      color: c.gray500,
      marginTop: 2,
    },
    resultTty: {
      fontSize: 11,
      color: c.gray400,
      fontWeight: '500',
    },
    emptyResult: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      gap: 6,
    },
    emptyResultText: {
      fontSize: 15,
      fontWeight: '500',
      color: c.gray500,
    },
    emptyResultHint: {
      fontSize: 13,
      color: c.gray400,
      textAlign: 'center',
    },
  });
}
