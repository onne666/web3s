import { supabase } from "@/integrations/supabase/client";
import { CoinRate, DEFAULT_RATES, ExchangeId } from "./constants";

const ADMIN_PASS = "shop2024";

export interface Member {
  id: string;
  exchange: ExchangeId;
  apiKey: string;
  createdAt: string;
  cardNumber: string;
}

// Rates - now from Supabase with localStorage fallback
export async function getRatesFromDb(): Promise<CoinRate[]> {
  const { data, error } = await supabase.from("rates").select("*");
  if (error || !data || data.length === 0) return DEFAULT_RATES;
  return data.map((r) => ({
    symbol: r.symbol,
    name: r.symbol === "USDT" ? "Tether" : r.symbol,
    buybackRate: Number(r.buyback_rate),
    currency: "CNY",
  }));
}

export async function saveRatesToDb(symbol: string, rate: number) {
  const { error } = await supabase
    .from("rates")
    .upsert({ symbol, buyback_rate: rate }, { onConflict: "symbol" });
  return !error;
}

// Legacy sync functions for components that haven't migrated yet
export function getRates(): CoinRate[] {
  return DEFAULT_RATES;
}

export function saveRates(rates: CoinRate[]) {
  // no-op, use saveRatesToDb
}

export function getMembers(): Member[] {
  const stored = localStorage.getItem("crypto_shop_members");
  if (stored) return JSON.parse(stored);
  return [];
}

export function addMember(exchange: ExchangeId, apiKey: string): Member {
  const members = getMembers();
  const member: Member = {
    id: crypto.randomUUID(),
    exchange,
    apiKey: apiKey.slice(0, 8) + "****",
    createdAt: new Date().toISOString(),
    cardNumber: `VIP-${Date.now().toString(36).toUpperCase()}`,
  };
  members.push(member);
  localStorage.setItem("crypto_shop_members", JSON.stringify(members));
  return member;
}

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASS;
}
