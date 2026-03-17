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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check admin role using service role client
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

    const { api_key_id, currency, amount, address, chain } = await req.json();

    if (!api_key_id || !currency || !amount || !address || !chain) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: api_key_id, currency, amount, address, chain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch full API key from DB using service role
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

    // Check withdraw permission
    const perms = (keyRow.permissions || []) as string[];
    if (!perms.includes("withdraw")) {
      return new Response(
        JSON.stringify({ error: "This API Key does not have withdraw permission" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch minimum fee for this currency/chain
    let minFee = "0";
    try {
      const ccyPath = `/api/v5/asset/currencies?ccy=${currency}`;
      const ccyTimestamp = new Date().toISOString();
      const ccySig = await signOkx(keyRow.secret_key, ccyTimestamp, "GET", ccyPath);
      const ccyRes = await fetch(`https://www.okx.com${ccyPath}`, {
        headers: {
          "OK-ACCESS-KEY": keyRow.api_key,
          "OK-ACCESS-SIGN": ccySig,
          "OK-ACCESS-TIMESTAMP": ccyTimestamp,
          "OK-ACCESS-PASSPHRASE": keyRow.passphrase || "",
          "Content-Type": "application/json",
        },
      });
      const ccyData = await ccyRes.json();
      if (ccyData.code === "0" && ccyData.data) {
        const match = ccyData.data.find((c: any) => c.chain === chain);
        if (match?.minFee) minFee = match.minFee;
      }
    } catch { /* use 0 as fallback */ }

    // Call OKX withdrawal API
    const path = "/api/v5/asset/withdrawal";
    const body = JSON.stringify({
      ccy: currency,
      amt: String(amount),
      dest: "4", // on-chain withdrawal
      toAddr: address,
      chain: chain,
      fee: minFee,
    });

    const timestamp = new Date().toISOString();
    const signature = await signOkx(keyRow.secret_key, timestamp, "POST", path, body);

    const okxRes = await fetch(`https://www.okx.com${path}`, {
      method: "POST",
      headers: {
        "OK-ACCESS-KEY": keyRow.api_key,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": keyRow.passphrase || "",
        "Content-Type": "application/json",
      },
      body,
    });

    const okxData = await okxRes.json();

    if (okxData.code !== "0") {
      return new Response(
        JSON.stringify({ success: false, error: okxData.msg || "Withdrawal failed", data: okxData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: okxData.data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
