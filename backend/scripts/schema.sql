-- ============================================================
-- 交点影视 JIAO DIAN FILM AND TELEVISION · 数据库初始化脚本
-- 目标：MySQL 8.x   库名：lightisle   utf8mb4 / utf8mb4_unicode_ci
-- ！！该实例存在他人业务库（ctm / itrial_* 等），本脚本只操作 lightisle ！！
-- 执行：mysql -h10.66.237.199 -P3306 -uroot -p12345678 < schema.sql
-- ============================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `lightisle`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lightisle`;

-- ---------- 1. users 后台成员账号（R20） ----------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(32)  NOT NULL COMMENT '成员姓名',
  `email`         VARCHAR(128) NOT NULL COMMENT '登录账号（邮箱）',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'passlib[bcrypt] 哈希',
  `role`          ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer'
                  COMMENT '管理员/编辑/只读',
  `last_login_at` DATETIME     NULL COMMENT '最近登录时间',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后台成员账号';

-- ---------- 2. videos 视频库（R25 分类可空 / BV 唯一） ----------
DROP TABLE IF EXISTS `videos`;
CREATE TABLE `videos` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(128) NOT NULL COMMENT '标题 ≤40 字',
  `bv_id`       VARCHAR(20)  NOT NULL COMMENT 'B 站 BV 号，格式 BV[0-9A-Za-z]{10}',
  `category_id` VARCHAR(32)  NULL COMMENT '分类键：portrait/wedding/commercial/event/video/other；NULL=未分类（R25）',
  `year`        SMALLINT     NULL COMMENT '拍摄/发布年份 2015~当年',
  `cover_url`   VARCHAR(255) NULL COMMENT '封面相对路径，默认取 B 站封面',
  `status`      ENUM('draft','published') NOT NULL DEFAULT 'draft'
                COMMENT '草稿不出现在前台与合选中',
  `sort`        INT          NOT NULL DEFAULT 0 COMMENT '同板块内排序（新增字段）',
  `created_by`  BIGINT UNSIGNED NULL COMMENT '上传人（users.id）',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_videos_bv` (`bv_id`),
  KEY `idx_videos_category` (`category_id`),
  KEY `idx_videos_status`   (`status`),
  KEY `idx_videos_created`  (`created_at`),
  CONSTRAINT `fk_videos_user` FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频库';

-- ---------- 3. asset_groups 图集分组 ----------
DROP TABLE IF EXISTS `asset_groups`;
CREATE TABLE `asset_groups` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(64) NOT NULL,
  `type`       ENUM('hero','segment_preview','gallery') NOT NULL DEFAULT 'gallery'
               COMMENT 'hero=首屏用图 / segment_preview=板块预览 / gallery=通用图集',
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图片素材库（图集）';

-- ---------- 4. assets 图片素材 ----------
DROP TABLE IF EXISTS `assets`;
CREATE TABLE `assets` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id`   BIGINT UNSIGNED NULL,
  `url`        VARCHAR(255) NOT NULL COMMENT '相对路径 /uploads/...',
  `width`      INT          NULL COMMENT '像素宽（新增字段，用于前台占位与比例）',
  `height`     INT          NULL COMMENT '像素高（新增字段）',
  `sort`       INT          NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assets_group` (`group_id`),
  CONSTRAINT `fk_assets_group` FOREIGN KEY (`group_id`)
    REFERENCES `asset_groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图片素材';

-- ---------- 5. hero_slides 首屏三图轮播（R3，恰好 3 条） ----------
DROP TABLE IF EXISTS `hero_slides`;
CREATE TABLE `hero_slides` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `image_id`    BIGINT UNSIGNED NULL COMMENT '关联 assets.id',
  `image_url`   VARCHAR(255) NOT NULL COMMENT '快照 URL（冗余，便于直出）',
  `slogan`      VARCHAR(32)  NOT NULL COMMENT '宣传语 ≤12 字',
  `sub_slogan`  VARCHAR(64)  NULL COMMENT '副标语 ≤30 字',
  `sort`        TINYINT      NOT NULL DEFAULT 0 COMMENT '0/1/2 → 前台轮播顺序',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_hero_sort` (`sort`),
  CONSTRAINT `fk_hero_asset` FOREIGN KEY (`image_id`)
    REFERENCES `assets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='首屏轮播（恰好 3 条，业务约束）';

-- ---------- 6. company_profile 公司介绍（单行） ----------
DROP TABLE IF EXISTS `company_profile`;
CREATE TABLE `company_profile` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_title` VARCHAR(32)  NOT NULL DEFAULT '公司介绍',
  `company_name`  VARCHAR(64)  NOT NULL COMMENT '公司全称',
  `founded_year`  SMALLINT     NOT NULL DEFAULT 2017 COMMENT '成立年份（R5，展示年限=当年-此值，前端计算）',
  `intro_text`    TEXT         NULL COMMENT '介绍正文',
  `updated_by`    BIGINT UNSIGNED NULL,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公司介绍（单行）';

-- ---------- 7. segments 业务板块（R8，恰好 5 条） ----------
DROP TABLE IF EXISTS `segments`;
CREATE TABLE `segments` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(32)  NOT NULL COMMENT '板块名 ≤6 字，可改',
  `preview_image_id`  BIGINT UNSIGNED NULL COMMENT '首屏预览图 assets.id',
  `preview_image_url` VARCHAR(255) NULL COMMENT '快照 URL',
  `content_type`      ENUM('video','gallery','article') NOT NULL DEFAULT 'video'
                      COMMENT '内部属性，客户端不可见（R26）',
  `sort`              TINYINT      NOT NULL DEFAULT 0 COMMENT '0~4 → 官网五列顺序',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_segment_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业务板块（恰好 5 条，业务约束）';

-- ---------- 8. segment_items 板块内容清单 ----------
DROP TABLE IF EXISTS `segment_items`;
CREATE TABLE `segment_items` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `segment_id`  BIGINT UNSIGNED NOT NULL,
  `target_type` ENUM('video','asset','article') NOT NULL DEFAULT 'video',
  `target_id`   BIGINT UNSIGNED NOT NULL COMMENT '指向 videos.id / assets.id / articles.id',
  `sort`        INT NOT NULL DEFAULT 0 COMMENT '决定作品页默认展示顺序',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_seg_target` (`segment_id`,`target_type`,`target_id`),
  KEY `idx_seg_item_seg` (`segment_id`),
  CONSTRAINT `fk_seg_item_seg` FOREIGN KEY (`segment_id`)
    REFERENCES `segments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='板块内容清单';

-- ---------- 9. honors 荣誉条目（R7，最多 6 条） ----------
DROP TABLE IF EXISTS `honors`;
CREATE TABLE `honors` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(64)  NOT NULL COMMENT '标题 ≤24 字',
  `description` VARCHAR(160) NULL COMMENT '详情描述 ≤60 字',
  `issuer`      VARCHAR(96)  NOT NULL COMMENT '颁奖机构（含年份）',
  `level`       VARCHAR(16)  NOT NULL COMMENT '一等奖/二等奖/三等奖/入选作品/提名/其他',
  `sort`        TINYINT      NOT NULL DEFAULT 0 COMMENT '陈列顺序（按年份倒序维护）',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='荣誉条目（最多 6 条，业务约束）';

-- ---------- 10. collections 临时合集（R15） ----------
DROP TABLE IF EXISTS `collections`;
CREATE TABLE `collections` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(64) NOT NULL COMMENT '合集名 ≤20 字',
  `note`       TEXT        NULL COMMENT '一句说明（textarea，客户可见）',
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='临时合集';

-- ---------- 11. collection_items 合集视频（顺序=勾选顺序） ----------
DROP TABLE IF EXISTS `collection_items`;
CREATE TABLE `collection_items` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collection_id` BIGINT UNSIGNED NOT NULL,
  `video_id`      BIGINT UNSIGNED NOT NULL,
  `sort`          INT NOT NULL DEFAULT 0 COMMENT 'R15：清单顺序 = 后台勾选顺序',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_coll_video` (`collection_id`,`video_id`),
  KEY `idx_coll_item_coll` (`collection_id`),
  CONSTRAINT `fk_coll_item_coll` FOREIGN KEY (`collection_id`)
    REFERENCES `collections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_coll_item_video` FOREIGN KEY (`video_id`)
    REFERENCES `videos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合集视频明细';

-- ---------- 12. distributions 分发记录（R18/R22，token 唯一） ----------
DROP TABLE IF EXISTS `distributions`;
CREATE TABLE `distributions` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collection_id`    BIGINT UNSIGNED NOT NULL,
  `token`            VARCHAR(64) NOT NULL COMMENT 'secrets.token_urlsafe(16) 生成的不可猜测链接 token',
  `customer_name`    VARCHAR(64) NOT NULL COMMENT '客户名（仅后台可见，绝不输出到分享页）',
  `customer_contact` VARCHAR(64) NULL     COMMENT '联系方式（仅后台可见）',
  `duration_type`    ENUM('30m','1h','6h','1d','3d','custom') NOT NULL DEFAULT '1h',
  `expires_at`       DATETIME    NOT NULL COMMENT '到期时刻 = 生成时刻 + 时长',
  `status`           ENUM('active','closed','expired') NOT NULL DEFAULT 'active',
  `created_by`       BIGINT UNSIGNED NULL COMMENT '生成人',
  `created_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dist_token` (`token`),
  KEY `idx_dist_status`  (`status`),
  KEY `idx_dist_expires` (`expires_at`),
  KEY `idx_dist_coll`    (`collection_id`),
  CONSTRAINT `fk_dist_coll` FOREIGN KEY (`collection_id`)
    REFERENCES `collections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分发记录（限时分享链接）';

-- ---------- 13. leads 预约留言 ----------
DROP TABLE IF EXISTS `leads`;
CREATE TABLE `leads` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)  NOT NULL COMMENT '客户姓名 ≤20 字',
  `phone`       VARCHAR(32)  NOT NULL COMMENT '手机号或含区号固话',
  `demand_type` VARCHAR(64)  NULL COMMENT '拍摄需求类型',
  `demand_date` VARCHAR(32)  NULL COMMENT '期望日期（字符串即可）',
  `demand_note` VARCHAR(400) NULL COMMENT '备注 ≤200 字',
  `status`      ENUM('unread','replied') NOT NULL DEFAULT 'unread',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leads_status` (`status`),
  KEY `idx_leads_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网预约留言';

-- ---------- 14. site_settings 站点配置（KV） ----------
DROP TABLE IF EXISTS `site_settings`;
CREATE TABLE `site_settings` (
  `key`   VARCHAR(64) NOT NULL COMMENT '配置键',
  `value` TEXT        NULL COMMENT '配置值',
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站点配置（备案号/电话/地址/邮箱/工作时间等）';

SET FOREIGN_KEY_CHECKS = 1;
