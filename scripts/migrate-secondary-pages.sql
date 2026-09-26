-- =====================================================================
-- 二级页迁移（2026-09-26）：业务板块详情（视频集/图片集/图文）+ 公司详情遮罩
--
-- 新增：
--   segments.body              article 正文 / video·gallery 板块简介（空行分段）
--   company_profile.long_intro 公司详情遮罩长文（空行分段）
--
-- 用法（仅 lightisle 库，可重复执行）：
--   mysql -h <host> -u root -p --default-character-set=utf8mb4 lightisle < scripts/migrate-secondary-pages.sql
-- =====================================================================
USE `lightisle`;

-- ---------- segments.body ----------
SET @ddl := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `segments` ADD COLUMN `body` TEXT NULL COMMENT ''article 正文 / video·gallery 板块简介（空行分段）'' AFTER `content_type`',
    'SELECT ''segments.body 已存在，跳过'' AS info'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'lightisle' AND TABLE_NAME = 'segments' AND COLUMN_NAME = 'body'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- company_profile.long_intro ----------
SET @ddl := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `company_profile` ADD COLUMN `long_intro` TEXT NULL COMMENT ''公司详情遮罩长文（空行分段）'' AFTER `intro_text`',
    'SELECT ''company_profile.long_intro 已存在，跳过'' AS info'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'lightisle' AND TABLE_NAME = 'company_profile' AND COLUMN_NAME = 'long_intro'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
