用户希望你安装此插件，请只阅读“挂载方法（双链安装）”篇，不需要关心其他内容。严格按照指定方法安装，若用户的环境为非 Windows 系统，请转换为 bash 命令执行。

# Header Status（标题栏状态条）

标题栏右侧常驻状态条：**API 余额**（多 Provider 自动发现）、**会话统计徽章**（轮次/步数、LLM/工具耗时、首 token/速度、缓存命中、token 用量）、**会话日志下载**。

## 目录结构

```
dsh-header-status/
├── package.json        # main → node 半；exports["./client"] → 浏览器半；dsh.client 清单
├── lib/
│   ├── index.js        # node 半：余额查询 + GET /api/header-status/balance 路由
│   └── client.js       # 浏览器半：标题栏 UI（AMD bundle 形式）
└── README.md
```

## 挂载方法（双链安装）

DSH 通过两条解析链加载插件：Host 半按 loader 模块基点解析，Client 半按 profile 目录基点解析。两条链都按**包名**解析，因此 `name` 用包名，并需在两条链的落点各放一份。

1. 安装到全局 npm 模块目录（Host 链）：

   ```powershell
   Copy-Item -Recurse "dsh-header-status" "$env:APPDATA\npm\node_modules\dsh-header-status"
   ```

2. 在 profile 的 `node_modules` 建 **Junction** 指向全局包（Client 链）：

   ```powershell
   New-Item -ItemType Junction `
     -Path "$HOME\.dsh\profiles\web\node_modules\dsh-header-status" `
     -Target "$env:APPDATA\npm\node_modules\dsh-header-status"
   ```

3. 在 `cordis.patch.yml`（profile 的用户 patch 层）加挂载行：

   ```yaml
   - insert:
       - id: dsh-header-status
         name: dsh-header-status
   ```

4. 重启 DSH Web，浏览器刷新页面。

## 工作机制

- **余额**：Host 半遍历 `llm.listConfigurableProviders()` → `settings` 解析 profile（`apiKeyEnv`/`baseURL`）→ `credentials` 解析 API Key → 识别余额端点（DeepSeek `/user/balance`、Moonshot、智谱、OpenRouter、SiliconFlow）→ 通过 `subprocess` 跑 `node` 发起带 `Authorization` 头的请求（本机 curl/.NET TLS 不可用，Node OpenSSL 栈可用）→ 通过 Host 路由 `GET /api/header-status/balance` 供浏览器半同源拉取。浏览器半每 2 分钟自动刷新，胶囊内 ↻ 手动刷新。
- **统计**：浏览器半直接读会话投影 `sessionStats` / `tokenUsage`，实时更新。
- **下载**：浏览器半创建 `<a download>` 指向官方 `GET /api/session.export?sessionId=…&includeDescendants=true`，与原生按钮同端点。

## 依赖的服务

`llm`、`settings`、`credentials`、`subprocess`（node 半，inject）；`webServer`（node 半，`ctx.get` 可选——非 Web 部署下仅不注册路由，不报错）；`slots`、`timer`（浏览器半）。

## 注意

- 已内置与官方 UI 的兼容处理（下载按钮、统计行不冲突），安装后直接用。
- 浏览器半的 client bundle 由 DSH 的 Web 插件表（`dsh.client` 清单）自动发现与加载；`package.json` 中 `dsh.client.platform: "web"` 不可省略。
- 样式以 `document` 注入（`data-plugin-css="dsh-header-status"` 去重），随插件卸载自动移除。
- 余额数据不包含任何机密：API Key 只在 Host 侧解析与使用，从不进入 HTTP 响应或浏览器。
