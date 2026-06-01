/**
 * Cloudflare Pages Function — API 流式代理
 * 匹配所有 /api/* 请求 → 代理到 Worker 后端（支持 SSE 流式）
 */

export const onRequest = async (context) => {
  const { request } = context;
  const WORKER_URL = 'https://api.wq.abrdns.eu.cc';

  const url = new URL(request.url);
  const targetUrl = WORKER_URL + url.pathname + url.search;

  try {
    const headers = new Headers(request.headers);
    headers.set('host', 'api.wq.abrdns.eu.cc');

    const workerRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'follow',
    });

    const response = await fetch(workerRequest);

    const respHeaders = new Headers(response.headers);
    respHeaders.delete('content-encoding');
    respHeaders.delete('transfer-encoding');
    respHeaders.set('access-control-allow-origin', '*');
    respHeaders.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    respHeaders.set('access-control-allow-headers', 'Content-Type, Authorization');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy error: ' + (err && err.message ? err.message : String(err)) }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
};
