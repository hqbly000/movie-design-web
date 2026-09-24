# 光屿摄影 LIGHT ISLE STUDIO · 项目工程

摄影工作室官网 + 管理后台 + API 服务。三个独立工程平级，各自构建部署。

依据文档：
- `C:\Users\admin\WorkBuddy\2026-09-21-23-26-10\设计方案.md`（开发交付版 v1.0，R1–R28 需求对照）
- `docs/architecture.md`（系统架构设计 + 20 个任务分解）

---

## 目录结构

> **项目根目录：`D:\Dev\DevCode_wornary\jiaodian`**（2026-09-23 从上级目录整体迁入，下文所有命令均以该目录为工作目录）

```
jiaodian/
├─ frontend/    官网（含作品分享页）      Vue 3 + TS + Vite + Tailwind    → :5173
├─ admin/       管理后台（9 模块）        Vue 3 + TS + Vite + Tailwind    → :5174
├─ backend/     API 服务 + 静态资源       FastAPI + SQLAlchemy 2 + MySQL  → :8000
├─ docs/        架构与交付文档
├─ qa-tests/    QA 测试套件（冒烟 / 对抗 / 端到端）
└─ scripts/     开发/部署辅助脚本
```

> **迁移注意**：venv 的 `Scripts/*.exe` 入口内嵌绝对路径，搬目录后会失效。本次已重建 `backend/.venv` 并重装依赖（用阿里云镜像），`pip.exe` / `uvicorn.exe` 均已恢复正常。若你以后再挪动 `backend/`，记得重建 venv：
> ```bash
> cd backend && rm -rf .venv
> C:/Users/admin/.workbuddy/binaries/python/versions/3.13.12/python.exe -m venv .venv
> ./.venv/Scripts/python.exe -m pip install --index-url https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r requirements.txt
> ```

| 工程 | 技术栈 | 开发端口 | 入口 |
|---|---|---|---|
| `/frontend` | Vue 3.5 · TypeScript · Vite 6 · Vue Router 4 · Pinia 2 · Tailwind 3 | 5173 | `frontend/src/main.ts` |
| `/admin` | 同上（明亮 Apple/Meta 系统风） | 5174 | `admin/src/main.ts` |
| `/backend` | FastAPI · SQLAlchemy 2.x · PyMySQL · JWT · bcrypt | 8000 | `backend/app/main.py` |

官网路由：`/`（首页长滚动）、`/share/:token`（临时合集分享页）

---

## 环境要求

- Node.js ≥ 20（开发机为 22.22.2）
- Python ≥ 3.11（开发机为 3.13）
- MySQL 8.x
- 依赖安装请使用国内镜像：npm 用 `registry.npmmirror.com`，pip 用 `mirrors.aliyun.com`

---

## 快速启动（开发）

### 1. 后端

```bash
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

首次初始化数据库（建库建表 + 种子数据）：

```bash
cd backend
"/d/Dev/VM/mysql-8.0.27-winx64/bin/mysql" -h 10.66.237.199 -P 3306 -u root -p12345678 \
  --default-character-set=utf8mb4 < scripts/schema.sql
./.venv/Scripts/python.exe -m app.seed
```

接口文档：http://127.0.0.1:8000/docs

### 2. 官网

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

### 3. 管理后台

```bash
cd admin
npm install
npm run dev     # http://localhost:5174
```

或使用根目录脚本一键启动三个服务（见 `scripts/`）。

---

## 重置数据库（回到干净种子态）

联调 / 冒烟测试后，如需把数据库恢复到初始干净的种子状态：

```bash
cd backend
./.venv/Scripts/python.exe -m app.reset
```

该脚本会**清空 `lightisle` 库的全部 14 张业务表并重新灌入种子数据**，执行前后自动打印逐表条数自检
（users 3 / hero_slides 3 / company_profile 1 / segments 5 + items 10 / videos 12 / honors 5 /
collections 3 + items 7 / distributions 3 / leads 4 / site_settings 8）。

> ⚠️ 仅操作 `lightisle`：脚本启动时校验当前连接库名，且所有 `TRUNCATE` 均显式限定为 `` `lightisle`.`<表名>` ``；
> 实例上的 `ctm`、`itrial_*` 等他人业务库不受影响。

---

## 数据库

| 项 | 值 |
|---|---|
| 地址 | `10.66.237.199:3306` |
| 账号 | `root` / `12345678` |
| 库名 | `lightisle`（utf8mb4 / utf8mb4_unicode_ci） |

> ⚠️ 该实例上还有 `ctm`、`itrial_*` 等其他业务库，本项目**只操作 `lightisle`**。

14 张业务表：`users` / `videos` / `asset_groups` / `assets` / `hero_slides` / `company_profile` /
`segments` / `segment_items` / `honors` / `collections` / `collection_items` / `distributions` /
`leads` / `site_settings`

关键业务约束：

- `videos.category_id` 允许为空（列表显示「未分类」）
- `hero_slides` 恰好 3 条（三图轮播，仅可编辑不可增删）
- `segments` 恰好 5 条（官网五列，仅可编辑与排序）
- `honors` 最多 6 条（展厅环形容量）
- 分享链接到期或手动关闭后立即失效；分享页**永不输出客户信息**

---

## 默认账号（种子数据）

| 角色 | 账号 | 密码 | 权限 |
|---|---|---|---|
| 管理员 | `admin@lightisle.studio` | `Admin@123456` | 全部权限，含成员与角色管理 |
| 编辑 | `editor@lightisle.studio` | `Editor@123456` | 内容维护 + 生成分发链接，不能改成员 |
| 只读 | `viewer@lightisle.studio` | `Viewer@123456` | 仅查看内容与预约留言 |

> 上线前请立即在「账号与权限」中修改密码或重建账号。

---

## 生产构建

```bash
cd frontend && npm run build    # → frontend/dist
cd admin    && npm run build    # → admin/dist
```

生产环境把两个 `dist/` 交给 Nginx 静态托管，`/api` 与 `/uploads` 反向代理到后端 8000 端口。
完整配置见 `docs/DEPLOY.md` 与 `nginx.conf.example`。

---

## 验收状态

完整报告见 `docs/qa-report.md`（§1–§9 为 QA 独立验收，§10 为第二轮/第三轮回归）。

| 工程 | 构建 | 端到端验证 |
|---|---|---|
| backend | — | `scripts/smoke-test.sh` **24 / 24 PASS** |
| frontend | `npm run build` 零错误 | `frontend/scripts/cdp-verify.mjs` **76 / 76 PASS**（真实产物） |
| admin | `npm run build` 零错误（dist ~405K） | `scripts/verify-admin-routes.mjs` **20 / 20 PASS**（桌面 + 移动，真实产物） |

已闭环的缺陷：`Teleport` 目标未就绪导致 6 个页面崩溃（P0）、分页 `size` 超接口上限导致列表恒空（P1）、后台桌面档主内容被下推 100vh（P0）、移动端列表未转卡片流（P2）、上传仅按扩展名校验（P2）、分发列表缺生成人（P3）。

**第四轮（验收反馈修复，2026-09-23）**：分享页视频可点击清单切换 + 播放器撑满内容列、PC 端首屏恢复自动轮播（悬停暂停不再退化为死暂停）、荣誉展厅补回舞台射灯与正中卡受光高亮。明细与根因见 `docs/qa-report.md` §11。

**已知未覆盖**：移动端真机、Safari / Firefox 兼容性、线上部署配置（无线上环境）。详见 `docs/qa-report.md` §10.8。

### 常用验证命令

```bash
# 后端接口全量冒烟（需先启动 backend）
bash scripts/smoke-test.sh http://127.0.0.1:8000

# 后台全路由健康扫描（需无头浏览器 + 静态预览）
node qa-tests/preview_proxy.mjs admin/dist 4174 http://127.0.0.1:8000
node scripts/verify-admin-routes.mjs 9223 http://127.0.0.1:4174

# 冷加载鉴权稳定性实验（定性"偶发 401"）
node scripts/verify-auth-coldload.mjs 9223 http://127.0.0.1:4174 8
```

> ⚠️ 本机系统代理会拦截 `127.0.0.1`：curl 需 `--noproxy '*'`，Node 需 `NO_PROXY='*'`，否则会出现整片假失败。

## 设计要点速览

- **官网**：暗调暖金（近黑 `#0A0A0A` × 相纸暖白 `#F4F0E8` × 金箔 `#C49A4A`），Noto Serif SC 标题 + Noto Sans SC 正文 + Cormorant 拉丁数字
- **后台**：明亮系统风（底 `#F5F5F7` / 白卡 / 细边 / Apple 蓝 `#0071E3`），品牌金仅用于侧栏 logo
- **动效**：首屏 Ken Burns 缓慢缩放、荣誉 3D 环形展厅自动旋转、模块进入视口淡入上移
- **禁止项**：按钮不加渐变/发光/内高光/装饰箭头；展厅无左右箭头；分享页无外跳与数据展示
