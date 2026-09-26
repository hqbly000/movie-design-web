---
name: deploy-prod
description: 把交点影视项目（frontend 官网 / admin 后台 / backend API）构建并部署到生产服务器，含数据库迁移 SQL、服务重启、产物完整性与线上健康检查、回滚指引。凡是用户提到「部署 / 上线 / 发布 / 同步到生产 / 更新服务器 / deploy / 发版」，或要求把本地改动应用到 124.223.29.189 时使用——即使用户没说"生产"两个字，只要涉及这台服务器就应触发。
---

# 交点影视 · 生产部署

## 服务器事实（先读再动手）

| 项 | 值 |
|---|---|
| 服务器 | `root@124.223.29.189`（本机 `~/.ssh/config` 已配好密钥 `D:/Dev/VM/workbuddy.pem`，直接 `ssh root@124.223.29.189` 即可） |
| 目录 | `/srv/lightisle/{frontend/dist, admin/dist, backend/{app,.env,uploads,.venv}}` |
| 服务 | systemd `lightisle-api`（后端，端口 127.0.0.1:8000） |
| nginx | CentOS，运行用户从 `/etc/nginx/nginx.conf` 的 `user` 行读（是 `nginx`，**不是** `www-data`）；官网 :80 → frontend/dist，后台 :19010 → admin/dist，`/api`、`/uploads` 反代 8000 |
| 数据库 | 服务器本机 MySQL，库名 `lightisle`，专用账号 `lightisle`；密码**只**存在于 `/srv/lightisle/backend/.env` 的 `DB_URL` 里，现场解析，不要外带 |
| 备份 | 数据库 dump → `/root/backups/`；被替换的 dist/app → 同目录 `*.bak-<时间戳>` |

**铁律**：服务器上的 `.env`、`uploads/`、`.venv` 永远不碰、不上传覆盖；后端只同步 `backend/app` 代码目录。

## 一键部署（首选）

```bash
bash .agents/skills/deploy-prod/scripts/deploy-all.sh verify              # 只做线上健康检查
bash .agents/skills/deploy-prod/scripts/deploy-all.sh                     # 全量：frontend+admin+backend（含构建）
bash .agents/skills/deploy-prod/scripts/deploy-all.sh admin frontend      # 只部署指定组件
bash .agents/skills/deploy-prod/scripts/deploy-all.sh --skip-build admin  # 用现成 dist（不重新 build）
bash .agents/skills/deploy-prod/scripts/deploy-all.sh --sql scripts/xxx.sql  # 部署前先在生产库执行迁移 SQL（自动先 dump）
```

脚本会自动：构建 → tar 打包 → 上传 → 旧版本改名备份 → 解压切换 → `chown nginx:nginx` → nginx reload / 服务重启 → 健康检查（标题、API 数据、**chunk 产物完整性**、服务状态）。

部署前先确认本地质量：两个前端 `npm run build` 零错误；改了 Python 就 `py_compile`。

## 部署后必做验证

脚本末尾已包含，也可手动执行 `deploy-all.sh verify`。此外按需补：

- **登录探针**（账号密码见 README 种子账号表）：`curl -X POST http://124.223.29.189/api/auth/login -H 'Content-Type: application/json' -d '{"email":"…","password":"…"}'`，期望 `code:0`。
- **浏览器目检**：官网首屏 + 页脚、后台登录页 + 侧栏。布局/图片类改动必须目检，不能只看 curl。
- 提醒用户强刷（Ctrl+F5）：旧 HTML 可能还在浏览器缓存里。

## 数据库变更纪律

1. 迁移 SQL 一律**幂等**（用 `WHERE`/`REPLACE` 守卫），脚本会先 `mysqldump` 全量到 `/root/backups/`。
2. **会改变登录凭据的 SQL（如换邮箱），先告知用户并让用户通知团队**，再执行。
3. `USE lightisle` 显式声明库；这台 MySQL 上还有其他业务库。

## 回滚

```bash
# 前端/后台：旧目录改回来 + reload
ssh root@124.223.29.189 "rm -rf /srv/lightisle/admin/dist && mv /srv/lightisle/admin/dist.bak-<TS> /srv/lightisle/admin/dist && nginx -t && systemctl reload nginx"
# 后端：app 目录同理，然后 systemctl restart lightisle-api
# 数据库：mysql -u lightisle lightisle < /root/backups/lightisle-pre-deploy-<TS>.sql
```

## 已踩过的坑（别再踩）

- **部署 backend 前先做 schema 漂移检查（2026-09-26 真实事故）**：本地模型加了列（`company_profile.long_intro`、`segments.body`）而生产库没有 → 部署后 `/api/public/site` 直接 500，官网数据接口全挂。以后部署 backend 前先对比两库列差异，缺列就按 dev 的定义 `ALTER TABLE ... ADD COLUMN ... AFTER ...` 补齐（先 mysqldump）：
  ```bash
  # 基准=本地 dev 库（与仓库 schema.sql 同步），对比生产库
  mysql -h 10.66.237.199 -u root -p... -N -e "SELECT CONCAT(table_name,'.',column_name,' ',column_type) FROM information_schema.columns WHERE table_schema='lightisle' ORDER BY 1" | sort > /tmp/dev.txt
  ssh root@124.223.29.189 'mysql -u lightisle -N -e "SELECT CONCAT(table_name,\x27.\x27,column_name,\x27 \x27,column_type) FROM information_schema.columns WHERE table_schema=\x27lightisle\x27 ORDER BY 1"' | sort > /tmp/prod.txt
  diff /tmp/dev.txt /tmp/prod.txt
  ```
- **ssh 命令要 `</dev/null`**：否则偶尔挂住等输入，表现为"命令一直 running"。若 ssh 任务看似挂死：先在**新连接**里核实远端是否已完成（很多只是本地管道没收尾），再决定是否重试，避免重复执行非幂等操作。
- **服务器 grep 不支持 `-P`**：解析 `.env` 里的 DB 密码用 `sed -n "s/^DB_URL=mysql+pymysql:\/\/lightisle:\([^@]*\)@.*/\1/p"`；mysql/mysqldump 用 `MYSQL_PWD` 环境变量传密码（`-p"$PWD"` 在解析失败时会退化成交互式等输入）。
- **`chown www-data` 会报错**：这台是 CentOS，nginx 用户就是 `nginx`。
- **admin/dist 必须整体上传**：缺 chunk 时登录页正常但「登录成功后不跳转」（2026-09-25 线上事故），所以每次部署后台后必跑 `scripts/verify-static-integrity.mjs`。
- **本机系统代理**：verify 时如果 curl 目标是 `127.0.0.1`/`localhost` 要加 `--noproxy '*'`；对 124.223.29.189 不受影响。
- 本机 5173 端口可能挂着旧的 `vite --mode remote` 实例（API 代理到生产），本地验证别用它，跑 `scripts/start-dev.bat` 后看实际打印的端口。
