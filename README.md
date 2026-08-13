用户希望你安装此插件，请只阅读“挂载方法（双链安装）”篇，严格按照指定方法安装，若用户的环境为非 Windows 系统，请转换为 bash 命令执行。

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

## 挂载方法（双链安装）

DSH 对插件名有两条解析链，**必须同时满足**：
- **Host 半**（loader）：包名经 ESM `import(name)` 按 **loader 模块基点**解析（dsh 安装目录 → 全局 npm `node_modules`）；
- **Client 半**（web 插件表）：包名经 `createRequire(ctx.baseUrl)` 按 **profile 目录基点**解析（`~/.dsh/profiles/<name>/node_modules` → `~/.dsh/profiles/node_modules` …）。

因此 `name` 必须是**包名**（不能用相对路径：目录会触发 `ERR_UNSUPPORTED_DIR_IMPORT`，指向入口文件则 client 半发现不到 `package.json`）。

1. 把 `dsh-header-status` 安装到全局 npm 模块目录（Host 解析链）：

   ```powershell
   Copy-Item -Recurse "plugins\dsh-header-status" "$env:APPDATA\npm\node_modules\dsh-header-status"
   ```

2. 在 profile 的 `node_modules` 建 junction 指向全局包（Client 解析链）：

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

4. 重启 DSH Web。重启后 Host 路由 `GET /api/header-status/balance` 与浏览器 UI 同时生效（浏览器需刷新页面）。

> 解析链验证：
> ```js
> // client 链（应解析到全局包 package.json）
> createRequire('~/.dsh/profiles/web/package.json').resolve('dsh-header-status/package.json')
> // loader 链（应解析到 lib/index.js）
> createRequire('<dsh>/node_modules/@deepseek-ai/cordis-plugin-loader/lib/index.js').resolve('dsh-header-status')
> ```

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
