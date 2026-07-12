import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppTextInput } from '@/src/components/app-text-input';
import { KeyboardAwareScrollView } from '@/src/components/keyboard-aware-scroll-view';
import { createPriceObservation, listAssets } from '../data/wealth.repository';
import { parseNonNegativeDecimal } from '../model/decimal';
import type { Asset } from '../model/wealth.types';

export default function NewPriceScreen() { const db = useSQLiteContext(); const router = useRouter(); const [assets, setAssets] = useState<Asset[]>([]); const [assetId, setAssetId] = useState<string>(); const [price, setPrice] = useState(''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [saving, setSaving] = useState(false);
  useFocusEffect(useCallback(() => { let active = true; void listAssets(db).then((items) => { if (active) { setAssets(items); setAssetId((current) => current ?? items[0]?.id); } }); return () => { active = false; }; }, [db]));
  async function save() { if (!assetId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Missing information', 'Choose an asset and use YYYY-MM-DD for the observation date.'); try { setSaving(true); const asset = assets.find((item) => item.id === assetId); await createPriceObservation(db, { assetId: assetId as never, observedAt: date as never, price: parseNonNegativeDecimal(price), currency: asset?.tradingCurrency ?? ('EUR' as never), source: 'MANUAL' }); router.replace('/wealth'); } catch { Alert.alert('Invalid price', 'Enter a non-negative price using a dot as decimal separator.'); } finally { setSaving(false); } }
  return <ThemedView style={styles.container}><KeyboardAwareScrollView contentContainerStyle={styles.content}><ThemedText type="title">Update price</ThemedText><ThemedText>Manual prices are stored as dated observations. Enter them in the asset’s trading currency.</ThemedText><View style={styles.chips}>{assets.map((asset) => <Pressable key={asset.id} onPress={() => setAssetId(asset.id)} style={[styles.chip, assetId === asset.id && styles.selected]}><ThemedText>{asset.name}</ThemedText></Pressable>)}</View><Field label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /><Field label="Observation date (YYYY-MM-DD)" value={date} onChangeText={setDate} /><Pressable onPress={() => void save()} disabled={saving} style={styles.save}><ThemedText type="defaultSemiBold">{saving ? 'Saving...' : 'Save price'}</ThemedText></Pressable></KeyboardAwareScrollView></ThemedView>; }
function Field({ label, ...props }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'decimal-pad' }) { return <View style={styles.field}><ThemedText type="defaultSemiBold">{label}</ThemedText><AppTextInput {...props} placeholder={label} /></View>; }
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 24, gap: 16 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10 }, selected: { borderColor: '#4f46e5', backgroundColor: '#e0e7ff' }, field: { gap: 8 }, save: { padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#e0e7ff' } });
