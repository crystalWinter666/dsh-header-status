/**
 * Header Status — browser half (formal plugin, AMD bundle form consumed by the
 * web module system). Renders the header utilities bar: session-log download
 * capsule, balance capsule (with inline refresh), and session stats badges.
 * Balance data comes from the host route GET /api/header-status/balance.
 */
window.__ModuleLoader__.load({
  id: 'dsh-header-status',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var React = require('react');

    var CSS = [
      '.dsh-bal-hdr { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }',
      '.dsh-bal-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px 0 12px; box-sizing: border-box; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); cursor: pointer; font-size: 12px; line-height: 1; font-family: inherit; white-space: nowrap; }',
      '.dsh-bal-chip:hover { border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); }',
      '.dsh-bal-clabel { color: var(--dsw-alias-label-secondary); }',
      '.dsh-bal-cval { color: var(--dsw-alias-label-primary); font-weight: 600; font-variant-numeric: tabular-nums; }',
      '.dsh-bal-chip-refresh { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 999px; color: var(--dsw-alias-label-secondary); cursor: pointer; font-size: 12px; margin-left: 1px; }',
      '.dsh-bal-chip-refresh:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }',
      '.dsh-bal-badges { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden; }',
      '.dsh-bal-badge { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 10px; box-sizing: border-box; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1; white-space: nowrap; }',
      '.dsh-bal-blabel { color: var(--dsw-alias-label-secondary); }',
      '.dsh-bal-bval { color: var(--dsw-alias-label-primary); font-weight: 600; font-variant-numeric: tabular-nums; }',
      '.dsh-bal-badge-ok .dsh-bal-bval { color: var(--dsw-alias-state-success-primary); }',
      '.dsh-bal-badge-accent .dsh-bal-bval { color: var(--dsw-alias-brand-primary); }',
      '.dsh-bal-overlay { position: fixed; top: 52px; right: 16px; width: 360px; max-width: calc(100vw - 32px); box-sizing: border-box; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; padding: 14px 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.2); z-index: 100; color: var(--dsw-alias-label-primary); pointer-events: auto; font-size: 12px; }',
      '.dsh-bal-overlay h4 { margin: 0; font-size: 13px; font-weight: 600; display: inline; }',
      '.dsh-bal-obar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }',
      '.dsh-bal-obar .dsh-bal-spacer { flex: 1; }',
      '.dsh-bal-refresh { background: none; border: none; cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 13px; padding: 0 2px; }',
      '.dsh-bal-refresh:hover { color: var(--dsw-alias-brand-primary); }',
      '.dsh-bal-close { background: none; border: none; cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 13px; padding: 0 2px; }',
      '.dsh-bal-close:hover { color: var(--dsw-alias-label-primary); }',
      '.dsh-bal-prov { margin-top: 6px; }',
      '.dsh-bal-prov:first-of-type { margin-top: 0; }',
      '.dsh-bal-row { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; border-bottom: 1px dashed var(--dsw-alias-border-l1); font-size: 12px; }',
      '.dsh-bal-row:last-child { border-bottom: none; }',
      '.dsh-bal-ok { color: var(--dsw-alias-state-success-primary); }',
      '.dsh-bal-err { color: var(--dsw-alias-state-error-primary); }',
      '.dsh-bal-warn { color: var(--dsw-alias-state-warn-primary); }',
      '.dsh-bal-muted { color: var(--dsw-alias-label-secondary); }',
      '.dsh-bal-meta { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-top: 8px; line-height: 1.5; }',
    ].join('\n');

    var CSS_TAG = 'dsh-header-status';

    function injectStyle() {
      if (typeof document === 'undefined') return;
      if (document.querySelector('style[data-plugin-css="' + CSS_TAG + '"]') !== null) return;
      var tag = document.createElement('style');
      tag.dataset.pluginCss = CSS_TAG;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    function fmt(n, currency) {
      var sym = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : currency ? currency + ' ' : '';
      return sym + (Number.isFinite(n) ? n.toFixed(2) : '--');
    }
    function totalOf(balance) {
      return (balance || []).reduce(function (s, b) { return s + (b.total || b.available || 0); }, 0);
    }
    function formatTokens(n) {
      function scaled(v) { return v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10); }
      if (n < 1000) return String(n);
      if (n < 1000000) return scaled(n / 1000) + 'K';
      return scaled(n / 1000000) + 'M';
    }
    function formatDuration(ms) {
      var s = ms / 1000;
      if (s < 60) return String(Math.round(s * 10) / 10) + 's';
      var whole = Math.round(s);
      return String(Math.floor(whole / 60)) + 'm' + String(whole % 60) + 's';
    }
    function formatTps(tps) {
      var clamped = Math.max(0, tps);
      return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10);
    }
    function billedInput(usage) {
      return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
    }
    function statsSegments(stats, usage) {
      var segs = [];
      if (stats && stats.steps > 0) {
        segs.push({ key: 'counts', label: '会话', value: stats.turns + ' 轮 · ' + stats.steps + ' 步', title: '轮次 · 步数' });
        if (stats.llmMs > 0) segs.push({ key: 'llm', label: 'LLM', value: formatDuration(stats.llmMs), title: '模型生成耗时' });
        if (stats.toolMs > 0) segs.push({ key: 'tool', label: '工具', value: formatDuration(stats.toolMs), title: '工具调用耗时' });
        if (stats.ttftSteps > 0) segs.push({ key: 'ttft', label: '首token', value: formatDuration(stats.ttftMs / stats.ttftSteps), title: '首 token 平均耗时' });
        if (stats.decodeMs > 0) segs.push({ key: 'tps', label: '速度', value: formatTps(stats.decodeTokens / (stats.decodeMs / 1000)) + ' tok/s', title: '解码速度' });
      }
      if (usage && (billedInput(usage) > 0 || usage.outputTokens > 0)) {
        var denom = billedInput(usage);
        var cacheHit = denom === 0 ? null : Math.round(usage.cacheReadTokens / denom * 100);
        if (cacheHit !== null) segs.push({ key: 'cache', label: '缓存', value: cacheHit + '%', title: '缓存命中率', tone: 'ok' });
        segs.push({ key: 'tokens', label: 'token', value: formatTokens(billedInput(usage)) + ' in · ' + formatTokens(usage.outputTokens) + ' out', title: '输入 · 输出 token', tone: 'accent' });
      }
      return segs;
    }

    var name = 'dsh-header-status';
    var inject = ['slots', 'timer'];

    function apply(ctx) {
      var slots = ctx.get('slots');
      if (slots === undefined) return;
      injectStyle();

      // ---- shared balance store ----
      var store = { open: false, data: null, loading: false, error: null };
      var listeners = new Set();
      function setStore(patch) { Object.assign(store, patch); listeners.forEach(function (l) { l(); }); }
      function subscribe(l) { listeners.add(l); return function () { listeners.delete(l); }; }
      function refreshBalance() {
        setStore({ loading: true });
        fetch('/api/header-status/balance', { method: 'GET' }).then(function (r) { return r.json(); }).then(function (result) {
          setStore({ data: result, loading: false, error: null });
        }).catch(function (e) {
          setStore({ loading: false, error: String((e && e.message) || e) });
        });
      }
      function useBalance() {
        var state = React.useState(store);
        var v = state[0];
        var setV = state[1];
        React.useEffect(function () { return subscribe(function () { setV(store); }); }, []);
        return v;
      }

      function HeaderBalance(props) {
        var bal = useBalance();
        var stats = typeof props.useProjection === 'function' ? props.useProjection('sessionStats') : undefined;
        var usage = typeof props.useProjection === 'function' ? props.useProjection('tokenUsage') : undefined;

        React.useEffect(function () {
          if (store.data === null && store.error === null) refreshBalance();
          return ctx.interval(refreshBalance, 120000);
        }, []);

        var providers = (bal.data && bal.data.providers) || [];
        var oks = providers.filter(function (p) { return p.status === 'ok'; });
        var byCurrency = {};
        oks.forEach(function (p) {
          var money = p.balance && p.balance.length ? totalOf(p.balance) : (p.usage ? p.usage.limit : 0);
          var cur = p.balance && p.balance.length ? p.balance[0].currency : '';
          byCurrency[cur] = (byCurrency[cur] || 0) + money;
        });
        var moneyParts = Object.keys(byCurrency).map(function (c) { return fmt(byCurrency[c], c); });
        var fallback = bal.error ? '余额查询失败' : (providers.some(function (p) { return p.status === 'no-key'; }) ? '未配置 API Key' : (providers.length ? '暂不支持' : '未配置'));
        var segs = statsSegments(stats, usage);

        return React.createElement('div', { className: 'dsh-bal-hdr' },
          React.createElement('button', {
            className: 'dsh-bal-chip',
            onClick: function () { setStore({ open: !store.open }); },
            title: 'API 余额（点击查看明细）',
          },
            moneyParts.length
              ? [
                React.createElement('span', { className: 'dsh-bal-clabel', key: 'l' }, '余额'),
                React.createElement('span', { className: 'dsh-bal-cval', key: 'v' }, moneyParts.join(' · ')),
              ]
              : React.createElement('span', { key: 'f' }, fallback),
            React.createElement('span', {
              className: 'dsh-bal-chip-refresh',
              key: 'r',
              role: 'button',
              tabIndex: 0,
              title: '刷新余额',
              onClick: function (e) { e.stopPropagation(); refreshBalance(); },
              onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); refreshBalance(); } },
            }, '↻'),
          ),
          segs.length > 0 ? React.createElement('div', { className: 'dsh-bal-badges' },
            segs.map(function (seg) {
              return React.createElement('span', {
                className: 'dsh-bal-badge' + (seg.tone ? ' dsh-bal-badge-' + seg.tone : ''),
                key: seg.key,
                title: seg.title + '：' + seg.label + ' ' + seg.value,
              },
                React.createElement('span', { className: 'dsh-bal-blabel' }, seg.label),
                React.createElement('span', { className: 'dsh-bal-bval' }, seg.value)
              );
            })
          ) : null
        );
      }

      function DownloadCapsule(props) {
        var sessionId = props.sessionId;
        function download() {
          if (!sessionId) return;
          var origin = (typeof location !== 'undefined' && location.origin && location.origin !== 'null') ? location.origin : 'http://dsh.internal';
          var url = new URL('/api/session.export', origin);
          url.searchParams.set('sessionId', sessionId);
          url.searchParams.set('includeDescendants', 'true');
          var anchor = document.createElement('a');
          anchor.href = url.toString();
          anchor.download = 'dsh-session-' + String(sessionId).replace(/[^A-Za-z0-9_-]/g, '_') + '.zip';
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        }
        return React.createElement('button', {
          className: 'dsh-bal-chip',
          onClick: download,
          title: '下载会话日志（含子会话与附件）',
        },
          React.createElement('span', null, '下载'),
          React.createElement('span', { className: 'dsh-bal-chip-refresh', 'aria-hidden': true }, '⬇')
        );
      }

      function BalancePanel() {
        var bal = useBalance();
        if (!bal.open) return null;
        var providers = (bal.data && bal.data.providers) || [];
        function statusLabel(p) {
          return p.status === 'ok' ? '正常' : p.status === 'error' ? '失败' : p.status === 'no-key' ? '未配置密钥' : p.status === 'unsupported' ? '暂不支持' : '未配置';
        }
        function statusClass(p) {
          return p.status === 'ok' ? 'dsh-bal-ok' : p.status === 'error' ? 'dsh-bal-err' : 'dsh-bal-warn';
        }
        return React.createElement('div', { className: 'dsh-bal-overlay' },
          React.createElement('div', { className: 'dsh-bal-obar' },
            React.createElement('h4', null, 'API 余额'),
            React.createElement('span', { className: 'dsh-bal-spacer' }),
            React.createElement('button', { className: 'dsh-bal-refresh', onClick: function () { refreshBalance(); }, title: '刷新' }, '↻'),
            React.createElement('button', { className: 'dsh-bal-close', onClick: function () { setStore({ open: false }); }, title: '关闭' }, '✕')
          ),
          providers.length === 0
            ? React.createElement('div', { className: 'dsh-bal-muted' }, bal.error || '未发现已配置的 LLM Provider')
            : null,
          providers.map(function (p) {
            return React.createElement('div', { className: 'dsh-bal-prov', key: p.provider },
              React.createElement('div', { className: 'dsh-bal-row' },
                React.createElement('span', null, p.name),
                React.createElement('span', { className: statusClass(p) }, statusLabel(p))
              ),
              (p.balance || []).map(function (b, i) {
                return React.createElement('div', { className: 'dsh-bal-row', key: 'total' + i },
                  React.createElement('span', null, '总额 ' + fmt(b.total, b.currency)),
                  React.createElement('span', { className: 'dsh-bal-ok' }, '可用 ' + fmt(b.available, b.currency))
                );
              }),
              (p.balance || []).map(function (b, i) {
                return React.createElement('div', { className: 'dsh-bal-row dsh-bal-muted', key: 'split' + i },
                  React.createElement('span', null, '赠送 ' + fmt(b.granted, b.currency)),
                  React.createElement('span', null, '充值 ' + fmt(b.toppedUp, b.currency))
                );
              }),
              p.usage ? React.createElement('div', { className: 'dsh-bal-row' },
                React.createElement('span', null, '已用 ' + fmt(p.usage.used, '')),
                React.createElement('span', null, '额度 ' + fmt(p.usage.limit, ''))
              ) : null,
              p.error ? React.createElement('div', { className: 'dsh-bal-err dsh-bal-meta' }, p.error) : null,
              p.baseURL ? React.createElement('div', { className: 'dsh-bal-meta' }, p.baseURL) : null
            );
          }),
          React.createElement('div', { className: 'dsh-bal-meta' },
            '更新于 ' + (bal.data && bal.data.queriedAt ? new Date(bal.data.queriedAt).toLocaleTimeString() : '--'),
            bal.loading ? ' · 刷新中…' : ''
          )
        );
      }

      slots.inject('conversation.session.header.utilities', function () {
        return slots.register(
          { name: 'conversation.session.header.utilities', id: 'session-log-download', order: 0 },
          function (props) { return React.createElement(DownloadCapsule, props); }
        );
      });
      slots.inject('conversation.session.header.utilities', function () {
        return slots.register(
          { name: 'conversation.session.header.utilities', id: 'api-balance', order: 10 },
          function (props) { return React.createElement(HeaderBalance, props); }
        );
      });
      slots.inject('shell.overlay', function () {
        return slots.register(
          { name: 'shell.overlay', id: 'api-balance-detail' },
          function () { return React.createElement(BalancePanel); }
        );
      });
      // 内置 StatsLine 与本插件的标题栏统计徽章重复；同一 cell（id: stats）默认
      // priority 0 会与内置条目冲突抛错，需用更低优先级遮蔽使其不再渲染。
      slots.inject('conversation.composer.dock', function () {
        return slots.register(
          { name: 'conversation.composer.dock', id: 'stats', order: 0, priority: -1 },
          function () { return null; }
        );
      });
    }

    exports.name = name;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
