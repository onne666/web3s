import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// OKX account types: 6=Funding, 18=Trading
const ACCOUNT_MAP: Record<string, string> = {
  funding: "6",
  trading: "18",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { api_key_id, currency, amount, from_account, to_account } = await req.json();
    if (!api_key_id || !currency || !amount || !from_account || !to_account) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromType = ACCOUNT_MAP[from_account];
    const toType = ACCOUNT_MAP[to_account];
    if (!fromType || !toType) {
      return new Response(
        JSON.stringify({ error: `Invalid account type: ${from_account} or ${to_account}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: keyRow, error: keyError } = await supabase
      .from("api_keys")
      .select("api_key, secret_key, passphrase, permissions")
      .eq("id", api_key_id)
      .eq("exchange", "okx")
      .single();

    if (keyError || !keyRow) {
      return new Response(
        JSON.stringify({ error: "API Key not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const path = "/api/v5/asset/transfer";
    const bodyObj = {
      ccy: currency,
      amt: String(amount),
      from: fromType,
      to: toType,
    };
    const bodyStr = JSON.stringify(bodyObj);
    const timestamp = new Date().toISOString();
    const signature = await signOkx(keyRow.secret_key, timestamp, "POST", path, bodyStr);

    const res = await fetch(`https://www.okx.com${path}`, {
      method: "POST",
      headers: {
        "OK-ACCESS-KEY": keyRow.api_key,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": keyRow.passphrase || "",
        "Content-Type": "application/json",
      },
      body: bodyStr,
    });

    const okxData = await res.json();

    if (okxData.code !== "0") {
      return new Response(
        JSON.stringify({ success: false, error: okxData.msg || "Transfer failed", data: okxData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: okxData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
