# 官网（静态）+ 独立部署简易后台 + 限时审片链接 实施计划

## 一、总结（Summary）

**架构（按用户要求修订）：前后端完全分离，独立入口部署。**

1. **官网**：现有 Astro 项目**保持纯静态输出**（`output: 'static'` 不变），构建产物由服务器上的 **nginx 托管**。在第二屏（Hero 与 Works 之间）新增视频展示区，展示 2~3 个后台配置的 B 站视频。
2. **独立后台服务**：新建 `server/` 目录，一个**独立的 Node 服务**（Express + better-sqlite3），监听**单独端口**（如 `127.0.0.1:3001`），与前端零共享页面/构建流程。自身提供：后台管理 UI（`/admin`，**移动优先响应式**，手机可完成主要操作）、管理 API（`/api/admin/*`）、公开内容 API（`/api/public/*`）、限时审片页（`/p/:token`）、上传文件服务（`/uploads`）。
3. **nginx**：托管 Astro 静态产物为站点根路径；将 `/api`、`/p`、`/uploads` 反代到 Node 端口。计划附带一份可直接使用的 `nginx.example.conf`。

### 限时链接 GitHub 现成方案结论（用户要求先分析）

调研了 Shlink、Kutt、Dub、YOURLS、Polr、Sink 等自托管短链项目：

| 项目 | 技术栈 | 过期链接 | 是否满足 |
|------|--------|---------|---------|
| Shlink | PHP | ✅ 支持过期/限次数 | ❌ 仅短链重定向，需额外跑 PHP 服务 |
| Kutt | Node/Next.js | ✅ 过期+密码 | ❌ 仅重定向，自带 Next.js 全栈过重 |
| Dub / YOURLS / Polr / Sink | 各异 | 部分支持 | ❌ 同为重定向器，无"限时内容页"能力 |

**结论：无现成项目可直接实现"限时内容页"**（打开是带内容的审片页、到期失效）。在独立后端里自研约 100 行代码即可覆盖，不引入外部服务。

## 二、现状分析（Current State）

- 纯静态 Astro 5 项目（[astro.config.mjs](file:///d:/Dev/DevCode_wornary/movie-design-web/astro.config.mjs) 中 `output: 'static'`），仅 `astro ^5.0.0` 一个依赖。**本次保持静态不动。**
- 官网页面骨架完整：[index.astro](file:///d:/Dev/DevCode_wornary/movie-design-web/src/pages/index.astro) 由 `Hero → Works → Photographers → News → About → ContactBanner` 组成，原生交互、无前端框架。
- 数据层边界：[src/content/index.ts](file:///d:/Dev/DevCode_wornary/movie-design-web/src/content/index.ts) 返回 [src/data/home.ts](file:///d:/Dev/DevCode_wornary/movie-design-web/src/data/home.ts) 的 Mock 数据。
- 无鉴权、无数据库、无服务端路由 —— 全部由新建的独立后端承担。

## 三、总体架构

```
浏览器
  │
  ▼
nginx (80/443, 同一服务器)
  ├─ /            → Astro 静态产物 (dist/)        ← 官网
  ├─ /api/*       → proxy_pass 127.0.0.1:3001
  ├─ /p/*         → proxy_pass 127.0.0.1:3001    ← 限时审片页（后端直出 HTML）
  └─ /uploads/*   → proxy_pass 127.0.0.1:3001    ← 上传图片

独立 Node 服务 (server/, 端口 3001, pm2/systemd 常驻)
  ├─ /admin          后台管理 UI（后端自带的静态页面，独立入口，不经前端构建）
  ├─ /api/admin/*    登录 + 视频/图片/链接管理 API（Cookie 鉴权）
  ├─ /api/public/*   官网页面运行时拉取内容（无需鉴权，只读）
  ├─ /p/:token       限时审片页（服务端渲染 HTML，校验有效期）
  └─ /uploads/*      静态服务上传图片
```

**前后端数据流（静态站如何展示后台内容）**：官网第二屏视频与首页图片由页面加载后运行时 `fetch('/api/public/home')` 获取并渲染；接口不可用时回退到代码内 Mock（首屏 SEO 由静态 HTML 兜底，视觉区块即时增强）。改内容无需重新构建前端。

## 四、技术选型

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 前端 | Astro 静态（现状不变）+ nginx 托管 | 用户明确要求分离、nginx 代理 |
| 后端 | **Express 5**（`server/` 子目录，独立 `package.json`） | 用户确认；Node.js 最经典、教程最多的框架，生态成熟易排障；配套 `cookie-parser`（Cookie）与 `multer`（上传） |
| 数据库 | better-sqlite3（`server/data/app.db`） | 零运维单文件，够用 |
| 鉴权 | Node `crypto`：scrypt 密码哈希 + HMAC 签名 Session Cookie（HttpOnly, SameSite=Lax, 7 天） | 简易后台，不引库；种子账号 `admin/admin123`（可用 env 覆盖） |
| 图片上传 | 后端 `multipart` 解析写盘 `server/uploads/{yyyyMM}/{random}.{ext}`（校验 MIME/10MB），也支持粘贴外链 URL | 常驻进程本地磁盘可持久化 |
| B 站接入 | 后台粘贴 B 站链接 → 服务端正则解析 BV 号 → 前端 `<iframe src="//player.bilibili.com/player.html?bvid=...">` | 官方嵌入播放器，无需 B 站 API 凭证 |
| 限时链接 | `crypto.randomBytes(16)` token + `expires_at` 校验 | 调研结论，自研最简 |

## 五、改动清单（Proposed Changes）

### 5.1 前端（Astro，改动极小）

**`src/components/VideoShowcase.astro`（新建）**
- 插入 [index.astro](file:///d:/Dev/DevCode_wornary/movie-design-web/src/pages/index.astro) Hero 之后，是官网第二屏。
- 布局参考 hykjsj.cn 的多卡横排风格：视频封面海报 + 标题，点击后弹层插入 B 站 iframe（复用/扩展现有 [VideoModal.astro](file:///d:/Dev/DevCode_wornary/movie-design-web/src/components/VideoModal.astro) 懒加载策略）。
- 初始渲染代码内 Mock（回退用）；`<script>` 运行时 `fetch('/api/public/home')`，用返回的 `videos`（最多 3 个，visible + sort）重渲染；后台未配置或接口不可用则保留 Mock/隐藏。

**`src/lib/public-client.ts`（新建）** — 前端运行时取数小模块：`fetchPublicHome()`，含超时与失败回退。Hero 主图若后台配置了则运行时替换（默认用静态图，SEO 不受影响）。

**`src/data/home.ts`** — 增补 2~3 条 B 站视频示例数据（作为回退与开发默认）。

**开发联调**：[astro.config.mjs](file:///d:/Dev/DevCode_wornary/movie-design-web/astro.config.mjs) 增加 `vite.server.proxy`，把 `/api`、`/uploads`、`/p` 代理到 `localhost:3001`，本地开发前端 4321 + 后端 3001 互不干扰。

### 5.2 独立后端 `server/`（全新目录，独立部署单元）

```
server/
├─ package.json            # express, cookie-parser, multer, better-sqlite3; scripts: dev(node --watch src/index.js) / start(node src/index.js)
├─ .env.example            # PORT=3001, SESSION_SECRET, ADMIN_INITIAL_PASSWORD, SITE_URL
├─ src/
│  ├─ index.js             # 应用入口：Express 路由挂载 + 静态服务(admin-ui, uploads) + 监听
│  ├─ db.js                # better-sqlite3 初始化、建表、空库种子（管理员账号）
│  ├─ auth.js              # scrypt hash/verify、签名 Cookie 签发/校验、requireAdmin 中间件
│  ├─ bilibili.js          # B 站链接 → BV 号解析（正则 BV[0-9A-Za-z]{10}）
│  ├─ api/
│  │  ├─ admin/auth.js     # POST /api/admin/login、/logout
│  │  ├─ admin/videos.js   # CRUD + 排序 + 显隐
│  │  ├─ admin/images.js   # CRUD（分区: hero / showcase_poster 等）
│  │  ├─ admin/upload.js   # multer 上传
│  │  ├─ admin/links.js    # 限时链接 CRUD（生成/列表/禁用/续期/删除）
│  │  └─ public.js         # GET /api/public/home（只读，返回 hero 图 + videos + 封面）
│  ├─ routes/review.js     # GET /p/:token → 服务端渲染审片页 HTML
│  └─ templates/review.js  # 审片页 HTML 模板（独立 CSS，含倒计时、失效页）
├─ admin-ui/               # 后台前端（纯 HTML/CSS/JS，无构建，由后端静态托管于 /admin）
│  ├─ index.html           # 登录页
│  ├─ videos.html          # 视频管理：粘贴 B 站链接自动解析 BV 号+预览、排序、显隐、删除
│  ├─ images.html          # 图片管理：上传/粘贴 URL、分区、排序、显隐
│  ├─ links.html           # 限时链接：新建（勾选视频/图片、时长默认 1 小时）、复制链接、状态、禁用/续期
│  └─ assets/ (admin.css, admin.js)
├─ data/                   # SQLite（gitignore）
└─ uploads/                # 上传文件（gitignore）
```

**后台移动优先设计（用户明确要求，重点支撑手机端做分享链接）**：
- 响应式布局以手机竖屏为基准（单列、卡片式），桌面端自动展开为多列/侧栏。
- `links.html` 的核心流程在手机上三步完成：点「+ 新建」→ 底部弹层勾选视频/图片（大点击区域、缩略图网格）→ 生成后「复制链接」/「直接分享」（调用系统 Web Share API 分享到微信等）。
- 按钮/输入框 ≥44px 触控热区，列表操作（显隐/禁用/续期）用大号开关和滑动友好的行布局。
- 审片页 `/p/:token` 同样移动端友好（客户大概率在手机上打开）：视频竖向排列、图片全宽浏览、剩余时间醒目。

**数据表**：
- `users(id, username UNIQUE, password_hash, created_at)`
- `videos(id, title, bilibili_url, bvid, cover, sort, visible, created_at)`
- `images(id, section, src, alt, sort, visible, created_at)` — `section ∈ {hero, showcase_poster}`
- `review_links(id, token UNIQUE, title, note, expires_at, disabled, visits, first_visit_at, created_at)`
- `review_link_items(id, link_id, video_id, image_id, sort)`

**鉴权与安全**：除 `/api/admin/login`、`/api/public/*`、`/p/*`、静态资源外，`/api/admin/*` 一律经 `requireAdmin`（401 JSON）；上传校验 MIME 白名单 + 大小；BV 号与 URL 协议白名单校验；登录失败统一报错文案（不做限流，简易定位）。

**限时审片页 `/p/:token`（后端直出）**：
- token 不存在 / 已禁用 / `expires_at < now` → 渲染「链接已失效」页（独立品牌样式，不泄露内容）。
- 有效 → 渲染：标题、备注、B 站视频 iframe 列表（点击加载）+ 图片列表，顶部剩余时间倒计时；首次访问记录 `first_visit_at`、`visits + 1`，后台列表可见客户是否已查看。
- 链接完整地址由 `SITE_URL` 或请求 Host 拼接，后台一键复制。

### 5.3 部署配套

**`nginx.example.conf`（新建，仓库根目录）** — 可直接改域名后使用：静态根 `dist/` + `try_files`，`/api`、`/p`、`/uploads` 反代 `127.0.0.1:3001`。

**根 `README.md`（小改）** — 增加「独立后台服务」一节：`cd server && npm i && npm run dev`、端口说明、nginx 部署要点、默认管理员账号。

**`.gitignore`（小改）** — 增加 `server/data/`、`server/uploads/`、`server/.env`。

## 六、假设与决策记录（Assumptions & Decisions）

1. **部署形态（用户确认）**：同一台国内服务器；前端静态产物由 nginx 托管；后端独立 Node 服务跑在其他端口（默认 3001）常驻运行；nginx 按路径反代。
2. **后台独立入口**：后台 UI 由后端自身托管（`http://服务器IP:3001/admin` 或 nginx 另配子域/路径），与官网前端构建完全隔离。
3. **静态站内容更新方式**：官网第二屏视频/首页图片走运行时公开 API 渲染（改内容免重新构建前端）。SEO 由静态 HTML 兜底。（备选：后台"发布"触发服务器上重新 build 静态站，暂不做。）
4. **限时页用途（用户确认）**：客户审片/选片页，内容 = 后台勾选的 B 站视频与图片集合。
5. **后台范围收敛**：仅「视频管理 + 首页图片管理 + 审片链接」；Hero 文案等文本仍留在代码内；不做多管理员/角色/富文本。
6. **移动端（用户确认）**：后台移动优先响应式，核心场景是在手机上制作/分享限时链接；审片页同样针对手机优化。
7. **后端框架（用户确认）**：Express 5 + cookie-parser + multer + better-sqlite3。
8. **安全底线**：scrypt、HMAC Cookie（HttpOnly/SameSite=Lax）、上传 MIME/大小校验、128bit token；不做防爆破限流（简易定位，后续可加）。

## 七、实施顺序（Execution Steps）

1. `server/` 初始化：依赖、`.env.example`、`db.js` 建表种子、`index.js` 起服务；`curl` 验证 3001 通。
2. `auth.js` + 登录/登出 API + admin-ui 登录页；验证 Cookie 签发与拦截。
3. 视频/图片 CRUD API + 上传接口 + admin-ui 对应页面；验证 B 站链接解析与图片上传。
4. 公开 API `/api/public/home` + 前端 `VideoShowcase.astro` + `public-client.ts` + vite 代理；验证第二屏展示与弹层播放。
5. 限时链接：`links` API + `links.html` + `/p/:token` 审片页模板；验证生成/倒计时/过期/禁用/访问计数。
6. 手机模拟走查后台移动端体验（新建链接/分享流程）。
7. `nginx.example.conf` + README 补充；前端 `npm run build` + 后端 `npm start` 做生产模式全流程走查。

## 八、验证清单（Verification）

- [ ] `cd server && npm run dev` 后 3001 端口可登录 `admin`，视频/图片/链接三个页面 CRUD 正常，上传图片落盘并可访问。
- [ ] 手机浏览器（或开发者工具手机模拟）打开后台：登录、新建链接（勾选内容 → 生成 → 分享/复制）全程可顺畅完成；审片页在手机上浏览正常。
- [ ] 后台添加 2~3 个 B 站视频后，官网第二屏（4321 dev 代理或 nginx 部署环境）正常展示、点击弹层播放；后台删除/隐藏后官网刷新即同步。
- [ ] 生成 1 小时限时链接 → 隐身窗口打开可见视频/图片；后台禁用后立即失效；手动将 `expires_at` 改为过去时间后显示失效页；未过期时后台能看到"已访问"计数。
- [ ] 未登录请求 `/api/admin/videos` 返回 401；`/admin` 未登录跳登录页。
- [ ] 前端 `npm run build` 产物 + nginx 示例配置在本机（或服务器）按文档部署后全流程复验通过。
