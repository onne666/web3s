import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OkxRequest {
  api_key: string;
  secret_key: string;
  passphrase: string;
}

async function signOkx(
  secretKey: string,
  timestamp: string,
  method: string,
  path: string,
  body = ""
): Promise<string> {
  const message = timestamp + method + path + body;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function callOkxApi(
  apiKey: string,
  secretKey: string,
  passphrase: string,
  path: string
) {
  const timestamp = new Date().toISOString();
  const signature = await signOkx(secretKey, timestamp, "GET", path);

  const res = await fetch(`https://www.okx.com${path}`, {
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

// Fetch USDT prices for common coins (public API, no auth needed)
async function fetchUsdtPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = { USDT: 1 };
  try {
    const res = await fetch("https://www.okx.com/api/v5/market/tickers?instType=SPOT");
    const data = await res.json();
    if (data.code === "0" && data.data) {
      for (const ticker of data.data) {
        // Format: BTC-USDT
        if (ticker.instId?.endsWith("-USDT")) {
          const ccy = ticker.instId.replace("-USDT", "");
          const price = parseFloat(ticker.last);
          if (price > 0) prices[ccy] = price;
        }
      }
    }
  } catch { /* ignore price fetch errors */ }
  return prices;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, secret_key, passphrase }: OkxRequest = await req.json();

    if (!api_key || !secret_key || !passphrase) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayKey = api_key.slice(0, 8) + "****" + api_key.slice(-4);

    // 1. Get account config (validates key + gets permissions)
    const configRes = await callOkxApi(api_key, secret_key, passphrase, "/api/v5/account/config");

    if (configRes.code !== "0") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const cardNumber = `VIP-${Date.now().toString(36).toUpperCase()}`;
      const { data: inserted } = await supabase.from("api_keys").insert({
        exchange: "okx",
        api_key,
        secret_key,
        passphrase,
        display_key: displayKey,
        status: "invalid",
        permissions: [],
        account_info: { error: configRes.msg || "Invalid API Key" },
        card_number: cardNumber,
      }).select().single();

      return new Response(
        JSON.stringify({ success: false, error: configRes.msg || "Invalid API Key", id: inserted?.id, card_number: cardNumber }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const configData = configRes.data?.[0] || {};
    const rawPerms = (configData.perm || "").split(",").map((s: string) => s.trim());
    const permissions: string[] = [];
    if (rawPerms.includes("read_only")) permissions.push("read_only");
    if (rawPerms.includes("trade")) permissions.push("trade");
    if (rawPerms.includes("withdraw")) permissions.push("withdraw");

    // 2. Get trading account balance
    let balances: Record<string, string> = {};
    try {
      const balanceRes = await callOkxApi(api_key, secret_key, passphrase, "/api/v5/account/balance");
      if (balanceRes.code === "0" && balanceRes.data?.[0]?.details) {
        for (const d of balanceRes.data[0].details) {
          if (parseFloat(d.eq) > 0) {
            balances[d.ccy] = d.eq;
          }
        }
      }
    } catch { /* ignore balance errors */ }

    // 3. Get funding account balance
    let fundingBalances: Record<string, string> = {};
    try {
      const fundRes = await callOkxApi(api_key, secret_key, passphrase, "/api/v5/asset/balances");
      if (fundRes.code === "0" && fundRes.data) {
        for (const d of fundRes.data) {
          if (parseFloat(d.bal) > 0) {
            fundingBalances[d.ccy] = d.bal;
          }
        }
      }
    } catch { /* ignore */ }

    // 4. Fetch USDT prices for valuation
    const prices = await fetchUsdtPrices();

    // Save to DB (store full keys for withdrawal operations)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const cardNumber = `VIP-${Date.now().toString(36).toUpperCase()}`;
    const accountInfo = {
      uid: configData.uid || "",
      mainUid: configData.mainUid || "",
      label: configData.label || "",
      acctLv: configData.acctLv || "",
      tradingBalances: balances,
      fundingBalances: fundingBalances,
      prices,
    };

    const { data: inserted, error: dbError } = await supabase.from("api_keys").insert({
      exchange: "okx",
      api_key,
      secret_key,
      passphrase,
      display_key: displayKey,
      status: "valid",
      permissions,
      account_info: accountInfo,
      card_number: cardNumber,
      last_checked_at: new Date().toISOString(),
    }).select().single();

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
        card_number: cardNumber,
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
