# Header Status（标题栏状态条）

标题栏右侧常驻状态条：**API 余额**（多 Provider 自动发现）、**会话统计徽章**（轮次/步数、LLM/工具耗时、首 token/速度、缓存命中、token 用量）、**会话日志下载**。

由动态插件正式化而来（原 `bal-1/pkg-12`），打包为可挂载的双面包正式插件，重启 DSH 后依然生效。

## 目录结构

```
dsh-header-status/
├── package.json        # main → node 半；exports["./client"] → 浏览器半；dsh.client 清单
├── lib/
│   ├── index.js        # node 半：余额查询 + GET /api/header-status/balance 路由
│   └── client.js       # 浏览器半：标题栏 UI（AMD bundle 形式）
└── README.md
```

## 挂载方法

1. 把 `dsh-header-status` 目录放到部署配置（`cordis.yml` 所在目录）的 `plugins/` 下：

   ```
   <部署目录>/
   ├── cordis.yml
   └── plugins/
       └── dsh-header-status/
   ```

2. 在 `cordis.yml`（或部署的 patch 文件）追加一行：

   ```yaml
   - id: dsh-header-status
     name: ./plugins/dsh-header-status
   ```

3. 重启 DSH Web。重启后标题栏右侧即出现状态条。

> 相对路径 `./plugins/dsh-header-status` 基于 `cordis.yml` 的 baseUrl 解析。若放在其他位置，改 `name` 指向即可。

## 工作机制

- **余额**：Host 半遍历 `llm.listConfigurableProviders()` → `settings` 解析 profile（`apiKeyEnv`/`baseURL`）→ `credentials` 解析 API Key → 识别余额端点（DeepSeek `/user/balance`、Moonshot、智谱、OpenRouter、SiliconFlow）→ 通过 `subprocess` 跑 `node` 发起带 `Authorization` 头的请求（本机 curl/.NET TLS 不可用，Node OpenSSL 栈可用）→ 通过 Host 路由 `GET /api/header-status/balance` 供浏览器半同源拉取。浏览器半每 2 分钟自动刷新，胶囊内 ↻ 手动刷新。
- **统计**：浏览器半直接读会话投影 `sessionStats` / `tokenUsage`，实时更新。
- **下载**：浏览器半创建 `<a download>` 指向官方 `GET /api/session.export?sessionId=…&includeDescendants=true`，与原生按钮同端点。

## 依赖的服务

`llm`、`settings`、`credentials`、`subprocess`（node 半，inject）；`webServer`（node 半，`ctx.get` 可选——非 Web 部署下仅不注册路由，不报错）；`slots`、`timer`（浏览器半）。

## 注意

- 浏览器半的 client bundle 由 DSH 的 Web 插件表（`dsh.client` 清单）自动发现与加载；`package.json` 中 `dsh.client.platform: "web"` 不可省略。
- 样式以 `document` 注入（`data-plugin-css="dsh-header-status"` 去重），随插件卸载自动移除。
- 余额数据不包含任何机密：API Key 只在 Host 侧解析与使用，从不进入 HTTP 响应或浏览器。
