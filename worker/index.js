import { createRemoteJWKSet, jwtVerify } from "jose";

const ASSETS_PREFIX = "/_maintenance/";
const LOGIN_PATH = "/maintenance";
const RETRY_AFTER = "3600";

const SETTINGS_TTL = 60_000;

const settings = new Map();
const keySets = new Map();

async function hostSettings(env, host) {
  const cached = settings.get(host);
  if (cached && Date.now() - cached.at < SETTINGS_TTL) return cached.value;
  const value = await env.MAINTENANCE.get(host, { type: "json", cacheTtl: 60 }).catch(() => null);
  settings.set(host, { value, at: Date.now() });
  return value;
}

function keySet(teamDomain) {
  if (!keySets.has(teamDomain)) {
    keySets.set(teamDomain, createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`)));
  }
  return keySets.get(teamDomain);
}

function cookies(request, name) {
  const header = request.headers.get("cookie") || "";
  return header
    .split(";")
    .map((part) => part.trim().split("="))
    .filter(([key]) => key === name)
    .map(([, ...value]) => value.join("="));
}

async function isStaff(request, env, host) {
  const access = await hostSettings(env, host);
  if (!access?.team_domain || !access?.aud) return false;
  const tokens = [request.headers.get("cf-access-jwt-assertion"), ...cookies(request, "CF_Authorization")].filter(Boolean);
  for (const token of tokens) {
    try {
      await jwtVerify(token, keySet(access.team_domain), {
        issuer: access.team_domain,
        audience: access.aud,
        algorithms: ["RS256"],
      });
      return true;
    } catch {}
  }
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (await isStaff(request, env, url.hostname)) {
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
