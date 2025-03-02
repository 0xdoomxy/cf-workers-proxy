const WHITELIST_PATHS = ["/bot8178658513:"];
const TARGET_HOST = "api.telegram.org";

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      
      // 验证请求路径
      if (!WHITELIST_PATHS.some(path => url.pathname.startsWith(path))) {
        return new Response('Forbidden', { status: 403 });
      }

      const newRequest = new Request(
        new URL(url.pathname + url.search, `https://${TARGET_HOST}`),
        {
          method: request.method,
          headers: request.headers,
          body: request.body
        }
      );
      const response = await fetch(newRequest);
      const newHeaders = new Headers(response.headers);
      newHeaders.set("X-Content-Type-Options", "nosniff");
      newHeaders.set("X-Frame-Options", "DENY");

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    } catch (err) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};