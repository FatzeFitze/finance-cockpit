import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KeyboardAwareScrollView } from '@/src/components/keyboard-aware-scroll-view';
import { InvestmentForm } from '../components/InvestmentForm';
import { createInvestmentCandidate } from '../data/investments.repository';
import type { CreateInvestmentCandidateInput } from '../model/investment.types';

export default function NewInvestmentScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(input: CreateInvestmentCandidateInput) {
    try {
      setIsSaving(true);
      const id = await createInvestmentCandidate(db, input);

      Alert.alert('Saved', 'Investment candidate saved.');
      router.replace({
        pathname: '/investments/[id]',
        params: { id },
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Save failed', 'Could not save the investment candidate.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Add Investment</ThemedText>
        <ThemedText>
          Start with a simple manual watchlist entry. No broker or market-data integration yet.
        </ThemedText>

        <InvestmentForm
          submitLabel="Save candidate"
          isSubmitting={isSaving}
          onSubmit={handleSubmit}
        />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
});