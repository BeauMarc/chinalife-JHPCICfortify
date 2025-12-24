export async function onRequestGet(context) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return new Response('Missing ID', { status: 400, headers: corsHeaders });
  try {
    if (!context.env.JHPCIC_STORE) return new Response('KV unbound', { status: 500, headers: corsHeaders });
    const raw = await context.env.JHPCIC_STORE.get(`order:${id}`);
    if (!raw) return new Response('Not Found', { status: 404, headers: corsHeaders });
    return new Response(JSON.stringify(JSON.parse(raw).data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) { return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders }); }
}
export async function onRequestOptions() { return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } }); }