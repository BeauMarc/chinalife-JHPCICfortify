export async function onRequestPost(context) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  try {
    const data = await context.request.json();
    const id = crypto.randomUUID();
    if (context.env.JHPCIC_STORE) {
      await context.env.JHPCIC_STORE.put(`order:${id}`, JSON.stringify({id, timestamp: Date.now(), data}), { expirationTtl: 2592000 });
      return new Response(JSON.stringify({ success: true, id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: "KV unbound" }), { status: 500, headers: corsHeaders });
  } catch (err) { return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders }); }
}
export async function onRequestOptions() { return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } }); }