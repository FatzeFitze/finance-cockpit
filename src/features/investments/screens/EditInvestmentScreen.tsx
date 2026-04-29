import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { InvestmentForm } from '../components/InvestmentForm';
import {
    getInvestmentCandidateById,
    updateInvestmentCandidate,
} from '../data/investments.repository';
import type {
    CreateInvestmentCandidateInput,
    InvestmentCandidate,
} from '../model/investment.types';

function formatInitialNumber(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

export default function EditInvestmentScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const investmentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [investment, setInvestment] = useState<InvestmentCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadInvestment() {
      if (!investmentId) {
        setInvestment(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const result = await getInvestmentCandidateById(db, investmentId);

        if (isActive) {
          setInvestment(result);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadInvestment();

    return () => {
      isActive = false;
    };
  }, [db, investmentId]);

  async function handleSubmit(input: CreateInvestmentCandidateInput) {
    if (!investmentId) {
      return;
    }

    try {
      setIsSaving(true);
      await updateInvestmentCandidate(db, investmentId, input);

      Alert.alert('Saved', 'Investment candidate updated.');
      router.replace({
        pathname: '/investments/[id]',
        params: { id: investmentId },
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Update failed', 'Could not update the investment candidate.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{ title: investment ? `Edit ${investment.name}` : 'Edit investment' }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : !investment ? (
        <View style={styles.centered}>
          <ThemedText type="title">Investment not found</ThemedText>
          <ThemedText>The requested investment candidate could not be loaded.</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Edit Investment</ThemedText>
          <ThemedText>Update your watchlist candidate below.</ThemedText>

          <InvestmentForm
            key={investment.id}
            submitLabel="Save changes"
            isSubmitting={isSaving}
            onSubmit={handleSubmit}
            initialValues={{
              name: investment.name,
              symbol: investment.symbol ?? '',
              assetType: investment.assetType,
              status: investment.status,
              conviction: investment.conviction,
              currency: investment.currency,
              targetBuyPrice: formatInitialNumber(investment.targetBuyPrice),
              referencePrice: formatInitialNumber(investment.referencePrice),
              thesis: investment.thesis ?? '',
              riskNotes: investment.riskNotes ?? '',
            }}
          />
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
});