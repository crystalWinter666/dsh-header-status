/**
 * Header Status — host half (formal plugin).
 *
 * Queries configured LLM provider API balances over the model route directory
 * (`llm.listConfigurableProviders` + `settings` + `credentials`), issuing the
 * authenticated balance HTTP request through a spawned `node` subprocess (the
 * only TLS stack proven to work on this machine), and serves the result to the
 * browser half as a same-origin JSON route: GET /api/header-status/balance.
 */

const name = 'dsh-header-status';
const inject = ['llm', 'settings', 'credentials', 'subprocess'];

function hostOf(url) {
  const m = String(url).match(/^https?:\/\/([^\/?#]+)/i);
  return m ? m[1].toLowerCase() : '';
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function strip(url) {
  return String(url).replace(/\/+$/, '');
}
function balanceSpec(provider, baseURL) {
  const host = hostOf(baseURL);
  const base = strip(baseURL);
  if (provider === 'deepseek-official' || host.indexOf('deepseek.com') !== -1) {
    return {
      url: base + '/user/balance',
      parse(raw) {
        const list = raw && raw.balance_infos ? raw.balance_infos : [];
        return {
          available: raw ? raw.is_available !== false : true,
          balance: list.map((x) => ({
            currency: x.currency,
            total: num(x.total_balance),
            granted: num(x.granted_balance),
            toppedUp: num(x.topped_up_balance),
            available: num(x.total_balance),
          })),
        };
      },
    };
  }
  if (host.indexOf('moonshot.cn') !== -1) {
    return {
      url: base + '/users/me/balance',
      parse(raw) {
        const d = raw && raw.data ? raw.data : {};
        return {
          balance: [{
            currency: 'CNY',
            total: num(d.available_balance),
            granted: num(d.voucher_balance),
            toppedUp: num(d.cash_balance),
            available: num(d.available_balance),
          }],
        };
      },
    };
  }
  if (host.indexOf('open.bigmodel.cn') !== -1) {
    return {
      url: base + '/balance',
      parse(raw) {
        const list = raw && raw.balance ? raw.balance : [];
        return {
          balance: list.map((x) => ({
            currency: x.currency,
            total: num(x.total_balance),
            granted: 0,
            toppedUp: 0,
            available: num(x.available_balance),
          })),
        };
      },
    };
  }
  if (host.indexOf('openrouter.ai') !== -1) {
    return {
      url: 'https://openrouter.ai/api/v1/auth/key',
      parse(raw) {
        const d = raw && raw.data ? raw.data : {};
        return {
          usage: { label: d.label, used: num(d.usage), limit: num(d.limit), free: !!d.is_free_tier },
        };
      },
    };
  }
  if (host.indexOf('siliconflow.cn') !== -1) {
    return {
      url: base + '/user/info',
      parse(raw) {
        const d = raw && raw.data ? raw.data : {};
        return {
          balance: [{
            currency: 'CNY',
            total: num(d.totalBalance),
            granted: 0,
            toppedUp: 0,
            available: num(d.balance),
          }],
        };
      },
    };
  }
  return null;
}

/** Authenticated GET via a node subprocess (Node's OpenSSL TLS is the one stack that works here). */
async function httpGetJSON(ctx, url, key) {
  const script = [
    "fetch(process.env.BAL_URL,{headers:{Authorization:'Bearer '+process.env.BAL_KEY,Accept:'application/json'},signal:AbortSignal.timeout(20000)})",
    ".then(async r=>{process.stdout.write('S'+r.status+'\\n'+await r.text())})",
    ".catch(e=>{process.stderr.write(String(e&&e.message||e));process.exit(1)})",
  ].join('');
  let nodePath = 'node';
  try {
    nodePath = await ctx.subprocess.resolveExecutable('node');
  } catch (e) { /* keep the bare name */ }
  const policy = ctx.get('sandboxPolicy');
  const handle = ctx.subprocess.spawn({
    argv: [nodePath, '-e', script],
    cwd: (policy && policy.workspaceRoot) || '.',
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: 400000 },
      stderr: { maxBytes: 100000 },
    },
    graceMs: 3000,
    env: { BAL_URL: url, BAL_KEY: key },
  });
  const outcome = await handle.done;
  const out = handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : '';
  const err = handle.collected.stderr ? handle.collected.stderr.readFrom(0).text : '';
  if (outcome.exitCode !== 0) {
    throw new Error(err ? 'node: ' + err : 'node exited with code ' + outcome.exitCode);
  }
  const nl = out.indexOf('\n');
  const status = Number(out.slice(0, nl));
  const body = out.slice(nl + 1);
  if (status >= 400) throw new Error('HTTP ' + status + ': ' + body.slice(0, 300));
  try {
    return JSON.parse(body);
  } catch (e) {
    throw new Error('invalid JSON from ' + url);
  }
}

async function queryBalance(ctx) {
  const entries = ctx.llm.listConfigurableProviders();
  const providers = [];
  for (const entry of entries) {
    const info = { provider: entry.provider, name: entry.displayName };
    try {
      let section;
      try { section = ctx.settings.get(entry.settingsNs); } catch (e) { section = undefined; }
      let profile = section;
      for (const p of (entry.settingsPath || [])) profile = profile ? profile[p] : undefined;
      if (!profile && entry.provider !== 'deepseek-official') continue;
      const isDeepseek = entry.provider === 'deepseek-official';
      const apiKeyEnv = (profile && profile.apiKeyEnv) || (isDeepseek ? 'DEEPSEEK_API_KEY' : undefined);
      const baseURL = (profile && profile.baseURL) || (isDeepseek ? 'https://api.deepseek.com' : undefined);
      if (!apiKeyEnv || !baseURL) {
        providers.push(Object.assign({}, info, { status: 'not-configured' }));
        continue;
      }
      const cred = await ctx.credentials.resolve(apiKeyEnv);
      if (!cred || !cred.value) {
        providers.push(Object.assign({}, info, { baseURL, status: 'no-key' }));
        continue;
      }
      const spec = balanceSpec(entry.provider, baseURL);
      if (!spec) {
        providers.push(Object.assign({}, info, { baseURL, status: 'unsupported' }));
        continue;
      }
      const raw = await httpGetJSON(ctx, spec.url, cred.value);
      providers.push(Object.assign({}, info, { baseURL, status: 'ok' }, spec.parse(raw)));
    } catch (error) {
      providers.push(Object.assign({}, info, { status: 'error', error: String((error && error.message) || error) }));
    }
  }
  return { queriedAt: new Date().toISOString(), providers };
}

function apply(ctx) {
  const webServer = ctx.get('webServer');
  if (webServer === undefined) return;

  webServer.register({
    kind: 'exact',
    path: '/api/header-status/balance',
    async handler(req, res) {
      try {
        const data = await queryBalance(ctx);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          queriedAt: new Date().toISOString(),
          error: String((error && error.message) || error),
          providers: [],
        }));
      }
    },
  });
}

export { name, inject, apply };
