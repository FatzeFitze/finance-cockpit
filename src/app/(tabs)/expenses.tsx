import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ExpensesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Expenses</ThemedText>
      <ThemedText>Your saved expenses will appear here.</ThemedText>
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