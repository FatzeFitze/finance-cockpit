import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type {
    CategoryBreakdownItem,
    MonthlySpendingPoint,
} from '../model/expense.analytics';

const MONTHLY_CHART_HEIGHT = 120;

type MonthlySpendingChartProps = {
  data: MonthlySpendingPoint[];
};

type CategorySpendingChartProps = {
  data: CategoryBreakdownItem[];
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

function getMonthlyBarHeight(total: number, maxTotal: number): number {
  if (maxTotal <= 0 || total <= 0) {
    return 2;
  }

  return Math.max(8, (total / maxTotal) * MONTHLY_CHART_HEIGHT);
}

export function MonthlySpendingChart({ data }: MonthlySpendingChartProps) {
  const maxTotal = Math.max(0, ...data.map((item) => item.total));
  const hasSpendingData = data.some((item) => item.total > 0);

  return (
    <View style={styles.chartCard}>
      <ThemedText type="subtitle">Spending trend</ThemedText>
      <ThemedText style={styles.secondaryText}>
        Last {data.length} months based on saved expense dates.
      </ThemedText>

      {!hasSpendingData ? (
        <ThemedText>No spending data available for the last {data.length} months.</ThemedText>
      ) : (
        <View style={styles.monthlyChart}>
          {data.map((item) => {
            const barHeight = getMonthlyBarHeight(item.total, maxTotal);

            return (
              <View key={item.monthKey} style={styles.monthlyBarGroup}>
                <ThemedText numberOfLines={1} style={styles.monthlyValueLabel}>
                  {formatCurrency(item.total)}
                </ThemedText>

                <View style={styles.monthlyBarTrack}>
                  <View style={[styles.monthlyBarFill, { height: barHeight }]} />
                </View>

                <ThemedText numberOfLines={1} style={styles.axisLabel}>
                  {item.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function CategorySpendingChart({ data }: CategorySpendingChartProps) {
  const hasCategoryData = data.some((item) => item.total > 0);

  if (!hasCategoryData) {
    return <ThemedText>No category chart available yet.</ThemedText>;
  }

  return (
    <View style={styles.categoryChart}>
      {data.map((item) => {
        const filledFlex = Math.max(3, item.percentage);
        const emptyFlex = Math.max(0, 100 - filledFlex);

        return (
          <View key={item.category} style={styles.categoryRow}>
            <View style={styles.categoryHeader}>
              <ThemedText type="defaultSemiBold">{item.category}</ThemedText>
              <ThemedText>{formatCurrency(item.total)}</ThemedText>
            </View>

            <View style={styles.horizontalBarTrack}>
              <View style={[styles.horizontalBarFill, { flex: filledFlex }]} />
              <View style={{ flex: emptyFlex }} />
            </View>

            <ThemedText style={styles.secondaryText}>
              {item.count} items · {Math.round(item.percentage)}%
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 12,
  },
  secondaryText: {
    opacity: 0.75,
  },
  monthlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  monthlyBarGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  monthlyValueLabel: {
    fontSize: 11,
    opacity: 0.8,
    textAlign: 'center',
  },
  monthlyBarTrack: {
    height: MONTHLY_CHART_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  monthlyBarFill: {
    width: '70%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#7aa7ff',
  },
  axisLabel: {
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
  categoryChart: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 14,
  },
  categoryRow: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  horizontalBarTrack: {
    height: 10,
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  horizontalBarFill: {
    borderRadius: 999,
    backgroundColor: '#7aa7ff',
  },
});