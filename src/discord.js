const crypto = require("crypto");
const querystring = require("querystring");
const { config } = require("./config");

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_SCOPES = ["identify", "guilds"];

function createStateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getDiscordAuthUrl(state) {
  const params = querystring.stringify({
    client_id: config.discordClientId,
    redirect_uri: config.discordRedirectUri,
    response_type: "code",
    scope: DISCORD_SCOPES.join(" "),
    prompt: "consent",
    state,
  });

  return `https://discord.com/oauth2/authorize?${params}`;
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: config.discordClientId,
    client_secret: config.discordClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.discordRedirectUri,
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord token exchange failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function getDiscordUser(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord user lookup failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function getDiscordGuilds(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord guild lookup failed (${response.status}): ${text}`);
  }

  return response.json();
}

module.exports = {
  createStateToken,
  getDiscordAuthUrl,
  exchangeCodeForToken,
  getDiscordUser,
  getDiscordGuilds,
};
