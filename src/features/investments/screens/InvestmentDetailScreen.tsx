import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    deleteInvestmentCandidate,
    getInvestmentCandidateById,
} from '../data/investments.repository';
import type { InvestmentCandidate } from '../model/investment.types';

function formatOptionalCurrency(
  amount: number | null | undefined,
  currency: string
): string {
  if (amount == null) {
    return 'Not set';
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function InvestmentDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const investmentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [investment, setInvestment] = useState<InvestmentCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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

  function handleEdit() {
    if (!investment) {
      return;
    }

    router.push({
      pathname: '/investments/[id]/edit',
      params: { id: investment.id },
    });
  }

  function handleDelete() {
    if (!investment) {
      return;
    }

    Alert.alert(
      'Delete investment candidate?',
      `Delete "${investment.name}" permanently? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteInvestmentCandidate(db, investment.id);
              router.replace('/investments');
            } catch (error) {
              console.error(error);
              Alert.alert('Delete failed', 'Could not delete the investment candidate.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: investment?.symbol || investment?.name || 'Investment' }} />

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
          <ThemedText type="title">{investment.name}</ThemedText>
          {investment.symbol ? <ThemedText>{investment.symbol}</ThemedText> : null}

          <View style={styles.actionsRow}>
            <Pressable onPress={handleEdit} style={styles.secondaryButton}>
              <ThemedText type="defaultSemiBold">Edit</ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              disabled={isDeleting}
              style={[styles.deleteButton, isDeleting && styles.disabledButton]}
            >
              <ThemedText type="defaultSemiBold">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Asset type</ThemedText>
              <ThemedText>{investment.assetType}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Status</ThemedText>
              <ThemedText>{investment.status}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Conviction</ThemedText>
              <ThemedText>{investment.conviction}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Currency</ThemedText>
              <ThemedText>{investment.currency}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Target buy price</ThemedText>
              <ThemedText>
                {formatOptionalCurrency(investment.targetBuyPrice, investment.currency)}
              </ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Reference price</ThemedText>
              <ThemedText>
                {formatOptionalCurrency(investment.referencePrice, investment.currency)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Investment thesis</ThemedText>
            <View style={styles.card}>
              <ThemedText>
                {investment.thesis?.trim() ? investment.thesis : 'No thesis written yet.'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Risk notes</ThemedText>
            <View style={styles.card}>
              <ThemedText>
                {investment.riskNotes?.trim()
                  ? investment.riskNotes
                  : 'No risk notes written yet.'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.secondaryText}>
              Created: {formatDateTime(investment.createdAt)}
            </ThemedText>
            <ThemedText style={styles.secondaryText}>
              Updated: {formatDateTime(investment.updatedAt)}
            </ThemedText>
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
  section: {
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d88',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryText: {
    opacity: 0.75,
  },
});