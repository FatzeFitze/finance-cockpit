import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function AddExpenseScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Add Expense</ThemedText>
      <ThemedText>This screen will hold the manual expense form.</ThemedText>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Next step</ThemedText>
        <ThemedText>- merchant</ThemedText>
        <ThemedText>- amount</ThemedText>
        <ThemedText>- date</ThemedText>
        <ThemedText>- category</ThemedText>
        <ThemedText>- note</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 8,
  },
});