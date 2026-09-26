-- ============================================================
-- 交点影视品牌迁移 SQL（光屿摄影/焦点影视 → 交点影视）
-- 适用任何指向 `lightisle` 库的环境（幂等，可重复执行）：
--   · 开发库 10.66.237.199:3306
--   · 生产库（服务器本机 MySQL）
-- 用法：mysql -u <user> -p --default-character-set=utf8mb4 < scripts/rebrand-jiaodian.sql
-- ============================================================
USE `lightisle`;

-- 1. 站点配置：版权 / 联系邮箱（域名 jiaodianfilm.com 前后发音一致，无需改）
UPDATE `site_settings`
SET `value` = REPLACE(REPLACE(`value`, '光屿影像文化传媒有限公司', '交点影视'), '焦点影视', '交点影视')
WHERE `key` = 'copyright';

UPDATE `site_settings`
SET `value` = 'hello@jiaodianfilm.com'
WHERE `key` = 'email' AND `value` LIKE '%lightisle%';

-- 2. 公司介绍：公司名 + 简介正文
UPDATE `company_profile`
SET `company_name` = REPLACE(REPLACE(REPLACE(`company_name`, '光屿影像文化传媒有限公司', '交点影视'), '光屿摄影', '交点影视'), '焦点影视', '交点影视'),
    `intro_text`  = REPLACE(REPLACE(REPLACE(IFNULL(`intro_text`, ''), '光屿影像文化传媒有限公司', '交点影视'), '光屿摄影', '交点影视'), '焦点影视', '交点影视');

-- 3. 后台账号显示名（登录邮箱此前已统一为 @jiaodianfilm.com，此处不再改动）
UPDATE `users` SET `name` = REPLACE(REPLACE(`name`, '光屿', '交点'), '焦点', '交点');
