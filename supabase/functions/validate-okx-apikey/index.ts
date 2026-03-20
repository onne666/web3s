import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OkxRequest {
  api_key?: string;
  secret_key?: string;
  passphrase?: string;
  id?: string;
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

async function fetchUsdtPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = { USDT: 1 };
  try {
    const res = await fetch("https://www.okx.com/api/v5/market/tickers?instType=SPOT");
    const data = await res.json();
    if (data.code === "0" && data.data) {
      for (const ticker of data.data) {
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
    const body: OkxRequest = await req.json();
    let { api_key, secret_key, passphrase, id: existingId } = body;
    if (api_key) api_key = api_key.trim();
    if (secret_key) secret_key = secret_key.trim();
    if (passphrase) passphrase = passphrase.trim();
    console.log("[validate-okx] passphrase length:", passphrase?.length ?? 0);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ID-only refresh: load keys from DB, require admin auth
    if (existingId && !api_key) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimData, error: claimError } = await supabaseAuth.auth.getClaims(token);
      if (claimError || !claimData?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const userId = claimData.claims.sub as string;
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing, error: fetchErr } = await supabase
        .from("api_keys")
        .select("api_key, secret_key, passphrase, proxy_config")
        .eq("id", existingId)
        .eq("exchange", "okx")
        .single();
      if (fetchErr || !existing) {
        return new Response(
          JSON.stringify({ error: "API Key record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      api_key = existing.api_key;
      secret_key = existing.secret_key;
      passphrase = existing.passphrase || "";
    }

    if (!api_key || !secret_key || !passphrase) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayKey = api_key.slice(0, 8) + "****" + api_key.slice(-4);

    const configRes = await callOkxApi(api_key, secret_key, passphrase, "/api/v5/account/config");

    if (configRes.code !== "0") {
      const cardNumber = `VIP-${Date.now().toString(36).toUpperCase()}`;
      const invalidPayload = {
        exchange: "okx",
        api_key,
        secret_key,
        passphrase,
        display_key: displayKey,
        status: "invalid",
        permissions: [],
        account_info: { error: configRes.msg || "Invalid API Key" },
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

    const prices = await fetchUsdtPrices();

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

    const validPayload = {
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
