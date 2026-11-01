import { createRemoteJWKSet, jwtVerify } from "jose";

const ASSETS_PREFIX = "/_maintenance/";
const LOGIN_PATH = "/maintenance";
const RETRY_AFTER = "3600";

let jwks;

function cookies(request, name) {
  const header = request.headers.get("cookie") || "";
  return header
    .split(";")
    .map((part) => part.trim().split("="))
    .filter(([key]) => key === name)
    .map(([, ...value]) => value.join("="));
}

async function isStaff(request, env) {
  if (!env.TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  const options = { issuer: env.TEAM_DOMAIN, algorithms: ["RS256"] };
  if (env.ACCESS_AUD !== "*") options.audience = env.ACCESS_AUD;
  const tokens = [request.headers.get("cf-access-jwt-assertion"), ...cookies(request, "CF_Authorization")].filter(Boolean);
  jwks ??= createRemoteJWKSet(new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`));
  for (const token of tokens) {
    try {
      await jwtVerify(token, jwks, options);
      return true;
    } catch {}
  }
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (await isStaff(request, env)) {
      if (url.pathname === LOGIN_PATH || url.pathname.startsWith(`${LOGIN_PATH}/`)) {
        return Response.redirect(`${url.origin}/`, 302);
      }
      return fetch(request);
    }

    if (url.pathname.startsWith(ASSETS_PREFIX)) {
      url.pathname = url.pathname.slice(ASSETS_PREFIX.length - 1);
      return env.ASSETS.fetch(new Request(url, request));
    }

    const page = await env.ASSETS.fetch(new Request(new URL("/", url)));
    return new Response(request.method === "HEAD" ? null : page.body, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": RETRY_AFTER,
      },
    });
  },
};
