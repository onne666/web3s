import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BinanceRequest {
  api_key: string;
  secret_key: string;
  passphrase?: string;
  id?: string;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signBinance(secretKey: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(sig);
}

async function fetchUsdtPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = { USDT: 1 };
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price");
    const data = await res.json();
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.symbol?.endsWith("USDT")) {
          const ccy = item.symbol.replace("USDT", "");
          const price = parseFloat(item.price);
          if (ccy && Number.isFinite(price) && price > 0) prices[ccy] = price;
        }
      }
    }
  } catch {
    // ignore price fetch failures
  }
  return prices;
}

async function callBinanceSigned(apiKey: string, secretKey: string, path: string) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  const query = new URLSearchParams({ timestamp, recvWindow }).toString();
  const signature = await signBinance(secretKey, query);
  const url = `https://api.binance.com${path}?${query}&signature=${signature}`;

  const res = await fetch(url, {
    headers: {
      "X-MBX-APIKEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, secret_key, id: existingId }: BinanceRequest = await req.json();

    if (!api_key || !secret_key) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayKey = api_key.slice(0, 8) + "****" + api_key.slice(-4);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accountRes = await callBinanceSigned(api_key, secret_key, "/api/v3/account");

    if (!accountRes.ok) {
      const cardNumber = `VIP-${Date.now().toString(36).toUpperCase()}`;
      const invalidPayload = {
        exchange: "binance",
        api_key,
        secret_key,
        passphrase: "",
        display_key: displayKey,
        status: "invalid",
        permissions: [],
        account_info: { error: accountRes.data?.msg || "Invalid API Key" },
        card_number: cardNumber,
      };

      let inserted;
      if (existingId) {
        const { data } = await supabase.from("api_keys").update(invalidPayload).eq("id", existingId).select().single();
        inserted = data;
      } else {
        const { data } = await supabase.from("api_keys").insert(invalidPayload).select().single();
        inserted = data;
      }

      return new Response(
        JSON.stringify({ success: false, error: accountRes.data?.msg || "Invalid API Key", id: inserted?.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const account = accountRes.data || {};
    const permissions: string[] = ["read_only"];
    if (account.canTrade) permissions.push("trade");
    if (account.canWithdraw) permissions.push("withdraw");

    const tradingBalances: Record<string, string> = {};
    for (const b of account.balances || []) {
      const free = parseFloat(b.free || "0");
      const locked = parseFloat(b.locked || "0");
      const total = free + locked;
      if (Number.isFinite(total) && total > 0) {
        tradingBalances[b.asset] = total.toString();
      }
    }

    const prices = await fetchUsdtPrices();
    const cardNumber = `VIP-${Date.now().toString(36).toUpperCase()}`;

    const accountInfo = {
      uid: account.uid || "",
      acctLv: account.accountType || "SPOT",
      tradingBalances,
      fundingBalances: {},
      prices,
    };

    const validPayload = {
      exchange: "binance",
      api_key,
      secret_key,
      passphrase: "",
      display_key: displayKey,
      status: "valid",
      permissions,
      account_info: accountInfo,
      card_number: cardNumber,
      last_checked_at: new Date().toISOString(),
    };

    let inserted, dbError;
    if (existingId) {
      const res = await supabase.from("api_keys").update(validPayload).eq("id", existingId).select().single();
      inserted = res.data;
      dbError = res.error;
    } else {
      const res = await supabase.from("api_keys").insert(validPayload).select().single();
      inserted = res.data;
      dbError = res.error;
    }

    if (dbError) {
      return new Response(
        JSON.stringify({ error: "Database error: " + dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: inserted.id,
        card_number: inserted.card_number,
        status: "valid",
        permissions,
        account_info: accountInfo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});