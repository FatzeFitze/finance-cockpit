import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { InvestmentCandidate } from '../model/investment.types';
import { InvestmentListItem } from './InvestmentListItem';

type InvestmentListProps = {
  investments: InvestmentCandidate[];
  emptyMessage: string;
  onInvestmentPress?: (investment: InvestmentCandidate) => void;
};

export function InvestmentList({
  investments,
  emptyMessage,
  onInvestmentPress,
}: InvestmentListProps) {
  if (investments.length === 0) {
    return <ThemedText>{emptyMessage}</ThemedText>;
  }

  return (
    <View style={styles.list}>
      {investments.map((investment) => (
        <InvestmentListItem
          key={investment.id}
          investment={investment}
          onPress={
            onInvestmentPress ? () => onInvestmentPress(investment) : undefined
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
});