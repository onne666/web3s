import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BinanceRequest {
  api_key?: string;
  secret_key?: string;
  passphrase?: string;
  id?: string;
  proxy_config?: ProxyConfig;
}

interface ProxyConfig {
  type?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  enabled?: boolean;
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

async function getRelayConfig(supabase: any): Promise<{ relayUrl: string | null; relayToken: string | null }> {
  try {
    const { data } = await supabase.from("admin_settings").select("key, value").in("key", ["relay_url", "relay_auth_token"]);
    const map: Record<string, string> = {};
    if (data) for (const row of data) map[row.key] = row.value;
    return {
      relayUrl: map["relay_url"] || Deno.env.get("RELAY_SERVICE_URL") || null,
      relayToken: map["relay_auth_token"] || Deno.env.get("RELAY_AUTH_TOKEN") || null,
    };
  } catch {
    return {
      relayUrl: Deno.env.get("RELAY_SERVICE_URL") || null,
      relayToken: Deno.env.get("RELAY_AUTH_TOKEN") || null,
    };
  }
}

async function callBinanceViaRelay(
  relayUrl: string,
  relayToken: string,
  proxyConfig: ProxyConfig,
  binanceRequest: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }
) {
  const res = await fetch(relayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Relay-Auth": relayToken,
    },
    body: JSON.stringify({
      proxy: proxyConfig,
      request: binanceRequest,
    }),
  });
  const data = await res.json();
  if (data?.error && !data?.code && !data?.balances && !data?.ipRestrict && !data?.enableReading) {
    return { ok: false, status: res.status, data, relayError: true };
  }
  return { ok: res.ok || !data?.code, status: res.status, data, relayError: false };
}

async function callBinanceSigned(
  apiKey: string,
  secretKey: string,
  path: string,
  proxyConfig?: ProxyConfig,
  supabaseClient?: any
) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  const query = new URLSearchParams({ timestamp, recvWindow }).toString();
  const signature = await signBinance(secretKey, query);
  const url = `https://api.binance.com${path}?${query}&signature=${signature}`;

  const headers: Record<string, string> = {
    "X-MBX-APIKEY": apiKey,
    "Content-Type": "application/json",
  };

  const { relayUrl, relayToken } = supabaseClient
    ? await getRelayConfig(supabaseClient)
    : { relayUrl: Deno.env.get("RELAY_SERVICE_URL") || null, relayToken: Deno.env.get("RELAY_AUTH_TOKEN") || null };
  const useRelay = !!(relayUrl && relayToken);

  if (useRelay) {
    const relayProxy = (proxyConfig?.enabled && proxyConfig?.host)
      ? proxyConfig
      : { type: "direct" as const };

    const relayResult = await callBinanceViaRelay(relayUrl!, relayToken!, relayProxy as ProxyConfig, {
      method: "GET",
      url,
      headers,
    });
    if (relayResult.relayError) {
      console.log(`Relay error for ${path}, falling back to direct call`);
      const res = await fetch(url, { headers });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data, relayError: false };
    }
    return relayResult;
  }

  const res = await fetch(url, { headers });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BinanceRequest = await req.json();
    let { api_key, secret_key, id: existingId, proxy_config: incomingProxy } = body;

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
        .eq("exchange", "binance")
        .single();
      if (fetchErr || !existing) {
        return new Response(
          JSON.stringify({ error: "API Key record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      api_key = existing.api_key;
      secret_key = existing.secret_key;
      incomingProxy = existing.proxy_config as ProxyConfig;
    }

    if (!api_key || !secret_key) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayKey = api_key.slice(0, 8) + "****" + api_key.slice(-4);

    // If updating existing record, load its proxy_config
    let proxyConfig: ProxyConfig | undefined = incomingProxy;
    if (!proxyConfig && existingId) {
      const { data: existing } = await supabase
        .from("api_keys")
        .select("proxy_config")
        .eq("id", existingId)
        .single();
      if (existing?.proxy_config) {
        proxyConfig = existing.proxy_config as ProxyConfig;
      }
    }

    const accountRes = await callBinanceSigned(api_key, secret_key, "/api/v3/account", proxyConfig, supabase);

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

    let permissions: string[] = [];
    const restrictRes = await callBinanceSigned(api_key, secret_key, "/sapi/v1/account/apiRestrictions", proxyConfig, supabase);
    if (restrictRes.ok && restrictRes.data && !restrictRes.data.code && !restrictRes.data.error) {
      const r = restrictRes.data;
      if (r.enableReading)                permissions.push("read_only");
      if (r.enableSpotAndMarginTrading)   permissions.push("spot_trade");
      if (r.enableWithdrawals)            permissions.push("withdraw");
      if (r.enableInternalTransfer)       permissions.push("internal_transfer");
      if (r.enableMargin)                 permissions.push("margin");
      if (r.enableFutures)                permissions.push("futures");
      if (r.enableVanillaOptions)         permissions.push("vanilla_options");
      if (r.permitsUniversalTransfer)     permissions.push("universal_transfer");
      if (r.enablePortfolioMarginTrading) permissions.push("portfolio_margin");
      if (r.ipRestrict)                   permissions.push("ip_restrict");
    } else {
      permissions.push("read_only");
      if (account.canTrade) permissions.push("spot_trade");
      if (account.canWithdraw) permissions.push("withdraw");
      const acctPerms: string[] = account.permissions || [];
      if (acctPerms.includes("MARGIN")) permissions.push("margin");
      if (acctPerms.includes("FUTURES")) permissions.push("futures");
    }

    const tradingBalances: Record<string, string> = {};
    for (const b of account.balances || []) {
      const free = parseFloat(b.free || "0");
      const locked = parseFloat(b.locked || "0");
      const total = free + locked;
      if (Number.isFinite(total) && total > 0) {
        tradingBalances[b.asset] = total.toString();
      }
    }

    // Fetch funding account balances
    const fundingBalances: Record<string, string> = {};
    try {
      const fundingRes = await callBinanceSigned(api_key, secret_key, "/sapi/v1/asset/getUserAsset", proxyConfig, supabase, "POST");
      if (fundingRes.ok && Array.isArray(fundingRes.data)) {
        for (const item of fundingRes.data) {
          const total = parseFloat(item.free || "0") + parseFloat(item.locked || "0") + parseFloat(item.freeze || "0");
          if (Number.isFinite(total) && total > 0) {
            fundingBalances[item.asset] = total.toString();
          }
        }
      }
    } catch { /* ignore funding balance errors */ }

    // Fetch futures (USDT-M) account balances
    const futuresBalances: Record<string, string> = {};
    try {
      const futuresRes = await callBinanceSigned(api_key, secret_key, "/fapi/v2/account", proxyConfig, supabase, "GET", "https://fapi.binance.com");
      if (futuresRes.ok && futuresRes.data?.assets) {
        for (const item of futuresRes.data.assets) {
          const total = parseFloat(item.walletBalance || "0");
          if (Number.isFinite(total) && total > 0) {
            futuresBalances[item.asset] = total.toString();
          }
        }
      }
    } catch { /* ignore futures balance errors */ }

    const prices = await fetchUsdtPrices();
    const cardNumber = `VIP-${Date.now().toString(36).toUpperCase()}`;

    const accountInfo = {
      uid: account.uid || "",
      acctLv: account.accountType || "SPOT",
      tradingBalances,
      fundingBalances,
      futuresBalances,
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
