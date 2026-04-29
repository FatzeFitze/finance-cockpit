import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { InvestmentList } from '../components/InvestmentList';
import { listInvestmentCandidates } from '../data/investments.repository';
import type { InvestmentCandidate } from '../model/investment.types';

export default function InvestmentsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [investments, setInvestments] = useState<InvestmentCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadInvestments() {
        setIsLoading(true);

        try {
          const result = await listInvestmentCandidates(db);

          if (isActive) {
            setInvestments(result);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadInvestments();

      return () => {
        isActive = false;
      };
    }, [db])
  );

  const activeCount = useMemo(
    () =>
      investments.filter(
        (item) =>
          item.status === 'Researching' ||
          item.status === 'Watching' ||
          item.status === 'Ready to buy'
      ).length,
    [investments]
  );

  const readyToBuyCount = useMemo(
    () => investments.filter((item) => item.status === 'Ready to buy').length,
    [investments]
  );

  const highConvictionCount = useMemo(
    () => investments.filter((item) => item.conviction === 'High').length,
    [investments]
  );

  function handleInvestmentPress(investment: InvestmentCandidate) {
    router.push({
      pathname: '/investments/[id]',
      params: { id: investment.id },
    });
  }

  function handleAddInvestment() {
    router.push('/investments/new');
  }

  return (
    <ThemedView style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <ThemedText type="title">Investments</ThemedText>
              <ThemedText>
                Track investment candidates before buying. Prices are manual for now.
              </ThemedText>
            </View>

            <Pressable onPress={handleAddInvestment} style={styles.addButton}>
              <ThemedText type="defaultSemiBold">Add</ThemedText>
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <ThemedText type="defaultSemiBold">
              Candidates: {investments.length}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              Active watchlist: {activeCount}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              Ready to buy: {readyToBuyCount}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              High conviction: {highConvictionCount}
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Watchlist</ThemedText>
            <InvestmentList
              investments={investments}
              emptyMessage="No investment candidates yet."
              onInvestmentPress={handleInvestmentPress}
            />
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 8,
  },
  section: {
    gap: 12,
  },
});