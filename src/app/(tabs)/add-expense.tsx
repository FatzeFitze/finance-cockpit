import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function AddExpenseScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Add Expense</ThemedText>
      <ThemedText>This screen will contain the manual expense form.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
});