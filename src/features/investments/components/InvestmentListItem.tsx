import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { InvestmentCandidate } from '../model/investment.types';

type InvestmentListItemProps = {
  investment: InvestmentCandidate;
  onPress?: () => void;
};

function formatOptionalCurrency(amount: number | null | undefined, currency: string): string {
  if (amount == null) {
    return 'Not set';
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function InvestmentListItem({ investment, onPress }: InvestmentListItemProps) {
  const symbolLabel = investment.symbol ? ` · ${investment.symbol}` : '';

  const content = (
    <View style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold">
          {investment.name}
          {symbolLabel}
        </ThemedText>
        <ThemedText>{investment.status}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText>{investment.assetType}</ThemedText>
        <ThemedText>Conviction: {investment.conviction}</ThemedText>
      </View>

      <ThemedText style={styles.secondaryText}>
        Target buy price:{' '}
        {formatOptionalCurrency(investment.targetBuyPrice, investment.currency)}
      </ThemedText>

      {investment.thesis?.trim() ? (
        <ThemedText numberOfLines={2} style={styles.secondaryText}>
          {investment.thesis}
        </ThemedText>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryText: {
    opacity: 0.75,
  },
});