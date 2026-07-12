import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppTextInput } from '@/src/components/app-text-input';
import { commitWorkbookImport, listAccountsByPortfolio, listAssets, listPortfolios, listTransactions } from '../data/wealth.repository';
import { canCommitWorkbookImport, parsePortfolioWorkbook, toWorkbookImportCommit, validateWorkbookImport, type StagedWorkbookTransaction, type WorkbookImportExistingData, type WorkbookImportPreview } from '../services/workbook-import';

export default function WorkbookImportScreen() {
  const db = useSQLiteContext(); const router = useRouter();
  const [preview, setPreview] = useState<WorkbookImportPreview>(); const [existing, setExisting] = useState<WorkbookImportExistingData>(); const [busy, setBusy] = useState(false);
  const restage = (next: WorkbookImportPreview, data = existing) => { if (!data) return; setPreview(validateWorkbookImport(next, data)); };
  async function select() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', copyToCacheDirectory: true });
      if (result.canceled) return;
      const [portfolios, assets, transactions] = await Promise.all([listPortfolios(db), listAssets(db), listTransactions(db)]);
      const portfolio = portfolios[0]; const accounts = portfolio ? await listAccountsByPortfolio(db, portfolio.id) : [];
      const data = { portfolio, accounts, assets, transactions }; setExisting(data);
      restage(parsePortfolioWorkbook(await (await fetch(result.assets[0].uri)).arrayBuffer()), data);
    } catch { Alert.alert('Could not read workbook', 'Choose an XLSX workbook with a Transactions sheet. Nothing was imported.'); }
  }
  function updateTransaction(row: number, field: keyof StagedWorkbookTransaction, value: string | boolean) {
    if (!preview) return; restage({ ...preview, transactions: preview.transactions.map((item) => item.row === row ? { ...item, [field]: value } : item) });
  }
  async function commit() {
    if (!preview || !existing) return;
    try {
      setBusy(true); const result = await commitWorkbookImport(db, toWorkbookImportCommit(preview, existing.portfolio?.baseCurrency ?? 'EUR'));
      const differences = result.reconciliation.filter((item) => item.difference && item.difference !== '0');
      Alert.alert('Import complete', `${result.transactionCount} transactions, ${result.priceCount} prices, and ${result.snapshotCount} snapshots were imported.${differences.length ? ` ${differences.length} snapshot total(s) differ from the broker-reported amount; review them on Wealth.` : ''}`);
      router.replace('/wealth');
    } catch { Alert.alert('Import was not committed', 'The atomic import failed, so no staged records were saved. Review the rows and try again.'); } finally { setBusy(false); }
  }
  const blocking = preview?.issues.filter((issue) => issue.severity === 'blocking') ?? [];
  return <ThemedView style={styles.container}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <ThemedText type="title">Import workbook</ThemedText>
    <ThemedText>The workbook is processed locally. Review, correct, or exclude rows before one atomic commit; it never silently changes the ledger.</ThemedText>
    <Pressable onPress={() => void select()} style={styles.button}><ThemedText type="defaultSemiBold">Select XLSX workbook</ThemedText></Pressable>
    {preview ? <>
      <View style={styles.card}><ThemedText type="defaultSemiBold">Staged: {preview.transactions.filter((item) => item.included).length} transactions · {preview.prices.filter((item) => item.included).length} prices · {preview.snapshots.filter((item) => item.included).length} snapshots</ThemedText><ThemedText>{blocking.length ? `${blocking.length} blocking issue(s) must be corrected or excluded.` : 'Ready for reviewed atomic import.'}</ThemedText></View>
      {preview.issues.map((issue, index) => <View key={`${issue.code}-${issue.row}-${index}`} style={[styles.issue, issue.severity === 'blocking' && styles.blocking]}><ThemedText type="defaultSemiBold">{issue.severity === 'blocking' ? 'Blocked' : 'Review'}{issue.row ? ` · row ${issue.row}` : ''}</ThemedText><ThemedText>{issue.message}</ThemedText></View>)}
      <ThemedText type="subtitle">Transactions</ThemedText>
      {preview.transactions.map((row) => <TransactionCard key={row.row} row={row} issues={preview.issues.filter((issue) => issue.row === row.row)} onChange={updateTransaction} />)}
      {preview.prices.length ? <Section title="Price observations" rows={preview.prices.map((row) => `${row.row}: ${row.date} · ${row.assetName || row.identifier} · ${row.price} ${row.currency}`)} /> : null}
      {preview.snapshots.length ? <Section title="Snapshots / reconciliation evidence" rows={preview.snapshots.map((row) => `${row.row}: ${row.date} · ${row.totalValue} ${row.currency}${row.reportedTotalValue ? ` · broker ${row.reportedTotalValue}` : ''}`)} /> : null}
      <Pressable disabled={!canCommitWorkbookImport(preview) || busy} onPress={() => void commit()} style={[styles.commit, (!canCommitWorkbookImport(preview) || busy) && styles.disabled]}><ThemedText type="defaultSemiBold">{busy ? 'Importing…' : 'Confirm atomic import'}</ThemedText></Pressable>
    </> : null}
  </ScrollView></ThemedView>;
}

function TransactionCard({ row, issues, onChange }: { row: StagedWorkbookTransaction; issues: WorkbookImportPreview['issues']; onChange: (row: number, field: keyof StagedWorkbookTransaction, value: string | boolean) => void }) {
  return <View style={[styles.card, !row.included && styles.excluded]}><View style={styles.row}><ThemedText type="defaultSemiBold">Row {row.row}</ThemedText><Pressable onPress={() => onChange(row.row, 'included', !row.included)} style={styles.smallButton}><ThemedText>{row.included ? 'Exclude' : 'Include'}</ThemedText></Pressable></View>{row.included ? <><Edit label="Type" value={row.type} onChangeText={(value) => onChange(row.row, 'type', value.toUpperCase())} /><Edit label="Date" value={row.date} onChangeText={(value) => onChange(row.row, 'date', value)} /><Edit label="Account" value={row.account} onChangeText={(value) => onChange(row.row, 'account', value)} /><Edit label="Asset name" value={row.assetName} onChangeText={(value) => onChange(row.row, 'assetName', value)} /><Edit label="ISIN / ticker" value={row.identifier} onChangeText={(value) => onChange(row.row, 'identifier', value)} />{row.type === 'CONTRIBUTION' || row.type === 'WITHDRAWAL' ? <Edit label="Amount" value={row.amount} onChangeText={(value) => onChange(row.row, 'amount', value)} /> : <><Edit label="Quantity" value={row.quantity} onChangeText={(value) => onChange(row.row, 'quantity', value)} /><Edit label="Unit price" value={row.unitPrice} onChangeText={(value) => onChange(row.row, 'unitPrice', value)} /><Edit label="Fees" value={row.fees} onChangeText={(value) => onChange(row.row, 'fees', value)} /><Edit label="Taxes" value={row.taxes} onChangeText={(value) => onChange(row.row, 'taxes', value)} /></>}<Edit label="Currency" value={row.currency} onChangeText={(value) => onChange(row.row, 'currency', value.toUpperCase())} /><Edit label="FX rate to base (if needed)" value={row.fxRateToBase} onChangeText={(value) => onChange(row.row, 'fxRateToBase', value)} />{issues.map((issue, index) => <ThemedText key={index}>{issue.severity === 'blocking' ? 'Blocked: ' : 'Review: '}{issue.message}</ThemedText>)}</> : <ThemedText>Excluded rows are not validated or imported.</ThemedText>}</View>;
}
function Edit({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) { return <View style={styles.field}><ThemedText>{label}</ThemedText><AppTextInput value={value} onChangeText={onChangeText} /></View>; }
function Section({ title, rows }: { title: string; rows: string[] }) { return <View style={styles.section}><ThemedText type="subtitle">{title}</ThemedText>{rows.map((row) => <View key={row} style={styles.card}><ThemedText>{row}</ThemedText></View>)}</View>; }
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 24, gap: 14 }, button: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 14, alignItems: 'center' }, commit: { borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#e0e7ff' }, disabled: { opacity: 0.5 }, card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 12, gap: 8 }, issue: { borderWidth: 1, borderColor: '#d6b76a', borderRadius: 12, padding: 12, gap: 4 }, blocking: { borderColor: '#c95050' }, excluded: { opacity: 0.55 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, smallButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 7 }, field: { gap: 3 }, section: { gap: 8 } });
