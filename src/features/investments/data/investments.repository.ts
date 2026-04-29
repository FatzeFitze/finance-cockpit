import type { SQLiteDatabase } from 'expo-sqlite';

import type {
    CreateInvestmentCandidateInput,
    InvestmentAssetType,
    InvestmentCandidate,
    InvestmentConviction,
    InvestmentCurrency,
    InvestmentStatus,
} from '../model/investment.types';

type InvestmentCandidateRow = {
  id: string;
  name: string;
  symbol: string | null;
  asset_type: string;
  status: string;
  conviction: string;
  currency: string;
  target_buy_price: number | null;
  reference_price: number | null;
  thesis: string | null;
  risk_notes: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function mapRowToInvestmentCandidate(row: InvestmentCandidateRow): InvestmentCandidate {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    assetType: row.asset_type as InvestmentAssetType,
    status: row.status as InvestmentStatus,
    conviction: row.conviction as InvestmentConviction,
    currency: row.currency as InvestmentCurrency,
    targetBuyPrice: row.target_buy_price,
    referencePrice: row.reference_price,
    thesis: row.thesis,
    riskNotes: row.risk_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listInvestmentCandidates(
  db: SQLiteDatabase
): Promise<InvestmentCandidate[]> {
  const rows = await db.getAllAsync<InvestmentCandidateRow>(
    `SELECT id, name, symbol, asset_type, status, conviction, currency,
            target_buy_price, reference_price, thesis, risk_notes,
            created_at, updated_at
     FROM investment_candidates
     ORDER BY updated_at DESC, name COLLATE NOCASE ASC`
  );

  return rows.map(mapRowToInvestmentCandidate);
}

export async function getInvestmentCandidateById(
  db: SQLiteDatabase,
  id: string
): Promise<InvestmentCandidate | null> {
  const row = await db.getFirstAsync<InvestmentCandidateRow>(
    `SELECT id, name, symbol, asset_type, status, conviction, currency,
            target_buy_price, reference_price, thesis, risk_notes,
            created_at, updated_at
     FROM investment_candidates
     WHERE id = ?`,
    id
  );

  return row ? mapRowToInvestmentCandidate(row) : null;
}

export async function createInvestmentCandidate(
  db: SQLiteDatabase,
  input: CreateInvestmentCandidateInput
): Promise<string> {
  const id = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO investment_candidates
      (id, name, symbol, asset_type, status, conviction, currency,
       target_buy_price, reference_price, thesis, risk_notes,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name.trim(),
    normalizeOptionalText(input.symbol),
    input.assetType,
    input.status,
    input.conviction,
    input.currency,
    input.targetBuyPrice ?? null,
    input.referencePrice ?? null,
    normalizeOptionalText(input.thesis),
    normalizeOptionalText(input.riskNotes),
    now,
    now
  );

  return id;
}

export async function updateInvestmentCandidate(
  db: SQLiteDatabase,
  id: string,
  input: CreateInvestmentCandidateInput
): Promise<void> {
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE investment_candidates
     SET name = ?,
         symbol = ?,
         asset_type = ?,
         status = ?,
         conviction = ?,
         currency = ?,
         target_buy_price = ?,
         reference_price = ?,
         thesis = ?,
         risk_notes = ?,
         updated_at = ?
     WHERE id = ?`,
    input.name.trim(),
    normalizeOptionalText(input.symbol),
    input.assetType,
    input.status,
    input.conviction,
    input.currency,
    input.targetBuyPrice ?? null,
    input.referencePrice ?? null,
    normalizeOptionalText(input.thesis),
    normalizeOptionalText(input.riskNotes),
    now,
    id
  );
}

export async function deleteInvestmentCandidate(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM investment_candidates WHERE id = ?`, id);
}