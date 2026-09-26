"""种子数据初始化（幂等）。

用法：
    python -m app.seed

各数据块在写入前先检查是否已存在，重复执行不会产生重复数据。
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models.asset import Asset, AssetGroup
from app.models.collection import Collection, CollectionItem
from app.models.company import CompanyProfile
from app.models.distribution import Distribution
from app.models.hero import HeroSlide
from app.models.honor import Honor
from app.models.lead import Lead
from app.models.segment import Segment, SegmentItem
from app.models.setting import SiteSetting
from app.models.user import User
from app.models.video import Video
from app.security import hash_password
from app.services import tokens as token_service

logger = logging.getLogger("lightisle.seed")

# ---------------- 常量 ----------------
COVER_PREFIX = "/uploads/cover/"

# 11 张 AI 种子素材（已存在于 uploads/cover/）
COVER_FILES: list[str] = [
    "portrait-natural-light.png",
    "wedding-documentary.png",
    "wedding-detail-hands.png",
    "commercial-product.png",
    "still-life-ceramic.png",
    "event-concert-stage.png",
    "cinematic-wide.png",
    "night-cityscape.png",
    "travel-foggy-mountain.png",
    "backlit-portrait-golden-hour.png",
    "behind-the-scenes-film-set.png",
]


def _cover_url(filename: str) -> str:
    """拼接封面相对路径。"""
    return f"{COVER_PREFIX}{filename}"


def _image_size(filename: str) -> tuple[int | None, int | None]:
    """读取素材宽高；未安装 Pillow 或文件缺失时返回 (None, None)。"""
    path: Path = settings.cover_dir / filename
    if not path.exists():
        return None, None
    try:
        from PIL import Image

        with Image.open(path) as image:
            return int(image.width), int(image.height)
    except Exception:  # noqa: BLE001
        return None, None


def _count(db: Session, model: type) -> int:
    """统计某表记录数。"""
    return int(db.scalar(select(func.count()).select_from(model)) or 0)


# ======================================================================
# 各数据块
# ======================================================================
def _seed_users(db: Session) -> dict[str, User]:
    """种子 3 个账号（admin/editor/viewer）。"""
    wanted = [
        ("交点管理员", "admin@jiaodianfilm.com", "Admin@123456", "admin"),
        ("交点编辑", "editor@jiaodianfilm.com", "Editor@123456", "editor"),
        ("交点访客", "viewer@jiaodianfilm.com", "Viewer@123456", "viewer"),
    ]
    result: dict[str, User] = {}
    for name, email, password, role in wanted:
        user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if user is None:
            user = User(name=name, email=email, password_hash=hash_password(password), role=role)
            db.add(user)
            db.flush()
            logger.info("已创建账号：%s（%s）", email, role)
        result[role] = user
    db.commit()
    return result


def _seed_asset_groups(db: Session) -> dict[str, AssetGroup]:
    """种子 3 个图集分组。"""
    wanted = [
        ("hero", "首屏用图", "hero"),
        ("segment_preview", "板块预览图", "segment_preview"),
        ("gallery", "通用图集", "gallery"),
    ]
    groups: dict[str, AssetGroup] = {}
    for key, name, group_type in wanted:
        group = db.execute(
            select(AssetGroup).where(AssetGroup.name == name)
        ).scalar_one_or_none()
        if group is None:
            group = AssetGroup(name=name, type=group_type)
            db.add(group)
            db.flush()
        groups[key] = group
    db.commit()
    return groups


def _seed_assets(db: Session, groups: dict[str, AssetGroup]) -> dict[str, Asset]:
    """登记 11 张素材：hero 组 3 张、segment_preview 组 5 张、gallery 组 11 张。"""
    hero_files = ["cinematic-wide.png", "portrait-natural-light.png", "night-cityscape.png"]
    segment_files = [
        "portrait-natural-light.png",
        "wedding-documentary.png",
        "commercial-product.png",
        "event-concert-stage.png",
        "behind-the-scenes-film-set.png",
    ]

    placements: list[tuple[AssetGroup, list[str]]] = [
        (groups["hero"], hero_files),
        (groups["segment_preview"], segment_files),
        (groups["gallery"], COVER_FILES),
    ]

    # 记录 hero / segment_preview 组内 url → 资产 的映射，供后续外键引用
    lookup: dict[str, Asset] = {}
    for group, files in placements:
        for index, filename in enumerate(files):
            url = _cover_url(filename)
            asset = db.execute(
                select(Asset).where(Asset.group_id == group.id, Asset.url == url)
            ).scalar_one_or_none()
            if asset is None:
                width, height = _image_size(filename)
                asset = Asset(group_id=group.id, url=url, width=width, height=height, sort=index)
                db.add(asset)
                db.flush()
            lookup.setdefault(url, asset)
    db.commit()
    return lookup


def _seed_hero_slides(db: Session, assets: dict[str, Asset]) -> None:
    """种子恰好 3 条首屏轮播。"""
    slides = [
        (
            "cinematic-wide.png",
            "以光影，铭记时光",
            "人像写真 · 婚礼纪实 · 商业摄影",
        ),
        (
            "portrait-natural-light.png",
            "每一次相遇都值得记录",
            "自然光人像 · 捕捉真实情绪",
        ),
        (
            "night-cityscape.png",
            "城市之上，光在流动",
            "城市影像 · 夜景纪实",
        ),
    ]
    for sort, (filename, slogan, sub_slogan) in enumerate(slides):
        exists = db.execute(select(HeroSlide).where(HeroSlide.sort == sort)).scalar_one_or_none()
        if exists is not None:
            continue
        url = _cover_url(filename)
        asset = assets.get(url)
        db.add(
            HeroSlide(
                image_id=asset.id if asset else None,
                image_url=url,
                slogan=slogan,
                sub_slogan=sub_slogan,
                sort=sort,
            )
        )
    db.commit()


def _seed_company_profile(db: Session) -> None:
    """种子公司介绍（单行）。"""
    if _count(db, CompanyProfile) > 0:
        return
    intro = (
        "交点影视成立于 2017 年，是一家专注于人像、婚礼与商业影像的文化传媒机构。"
        "我们相信每一次相遇都值得被认真记录。九年来，团队以自然光与电影感为语言，"
        "为个人与品牌留下经得起时间回望的画面。"
    )
    db.add(
        CompanyProfile(
            section_title="公司介绍",
            company_name="交点影视",
            founded_year=2017,
            intro_text=intro,
        )
    )
    db.commit()


def _seed_segments(db: Session, assets: dict[str, Asset]) -> dict[str, Segment]:
    """种子恰好 5 个业务板块。"""
    wanted = [
        ("portrait", "人像写真", "portrait-natural-light.png"),
        ("wedding", "婚礼纪实", "wedding-documentary.png"),
        ("commercial", "商业摄影", "commercial-product.png"),
        ("event", "活动跟拍", "event-concert-stage.png"),
        ("video", "视频短片", "behind-the-scenes-film-set.png"),
    ]
    result: dict[str, Segment] = {}
    for sort, (key, name, filename) in enumerate(wanted):
        segment = db.execute(select(Segment).where(Segment.sort == sort)).scalar_one_or_none()
        url = _cover_url(filename)
        asset = assets.get(url)
        if segment is None:
            segment = Segment(
                name=name,
                preview_image_id=asset.id if asset else None,
                preview_image_url=url,
                content_type="video",
                sort=sort,
            )
            db.add(segment)
            db.flush()
        result[key] = segment
    db.commit()
    return result


def _seed_videos(db: Session, users: dict[str, User]) -> dict[str, Video]:
    """种子 12 条视频（含 1 条未分类、2 条草稿），BV 号为合法占位号。"""
    editor = users["editor"]

    # (key, 标题, BV 后缀, 分类, 年份, 封面文件, 状态)
    rows = [
        ("city_night", "城市夜景 · 流动的光", "1A2b3C4d5E", "video", 2025, "night-cityscape.png", "published"),
        ("portrait_window", "自然光人像 · 窗边", "6F7g8H9i0J", "portrait", 2025, "portrait-natural-light.png", "published"),
        ("wedding_vow", "婚礼纪实 · 誓言", "1K2l3M4n5O", "wedding", 2024, "wedding-documentary.png", "published"),
        ("wedding_ring", "婚礼细节 · 交换戒指", "6P7q8R9s0T", "wedding", 2024, "wedding-detail-hands.png", "published"),
        ("commercial_product", "商业产品 · 器物之光", "1U2v3W4x5Y", "commercial", 2024, "commercial-product.png", "published"),
        ("still_life", "静物摄影 · 陶与光", "6Z7a8B9c0D", "commercial", 2023, "still-life-ceramic.png", "published"),
        ("event_stage", "活动跟拍 · 舞台现场", "1E2f3G4h5I", "event", 2023, "event-concert-stage.png", "published"),
        ("city_wide", "城市影像 · 电影感横移", "6J7k8L9m0N", "video", 2025, "cinematic-wide.png", "published"),
        ("travel_mountain", "旅拍 · 雾中山峦", "1O2p3Q4r5S", "portrait", 2022, "travel-foggy-mountain.png", "published"),
        ("backlit_portrait", "逆光人像 · 黄金时刻", "6T7u8V9w0X", "portrait", 2025, "backlit-portrait-golden-hour.png", "published"),
        ("bts_draft", "幕后花絮 · 片场记录", "1Y2z3A4b5C", "other", 2025, "behind-the-scenes-film-set.png", "draft"),
        ("uncategorized", "未命名素材 · 待整理", "6D7e8F9g0H", None, None, None, "draft"),
    ]

    result: dict[str, Video] = {}
    for key, title, bv_suffix, category, year, cover_file, status in rows:
        bv_id = f"BV{bv_suffix}"
        video = db.execute(select(Video).where(Video.bv_id == bv_id)).scalar_one_or_none()
        if video is None:
            video = Video(
                title=title,
                bv_id=bv_id,
                category_id=category,
                year=year,
                cover_url=_cover_url(cover_file) if cover_file else None,
                status=status,
                sort=0,
                created_by=editor.id,
            )
            db.add(video)
            db.flush()
        result[key] = video
    db.commit()
    return result


def _seed_segment_items(db: Session, segments: dict[str, Segment], videos: dict[str, Video]) -> None:
    """为 5 个板块挂载已发布视频（按 sort 排序）。"""
    mapping: dict[str, list[str]] = {
        "portrait": ["portrait_window", "backlit_portrait", "travel_mountain"],
        "wedding": ["wedding_vow", "wedding_ring"],
        "commercial": ["commercial_product", "still_life"],
        "event": ["event_stage"],
        "video": ["city_night", "city_wide"],
    }
    for segment_key, video_keys in mapping.items():
        segment = segments[segment_key]
        for index, video_key in enumerate(video_keys):
            video = videos[video_key]
            exists = db.execute(
                select(SegmentItem).where(
                    SegmentItem.segment_id == segment.id,
                    SegmentItem.target_type == "video",
                    SegmentItem.target_id == video.id,
                )
            ).scalar_one_or_none()
            if exists is not None:
                continue
            db.add(
                SegmentItem(
                    segment_id=segment.id,
                    target_type="video",
                    target_id=video.id,
                    sort=index,
                )
            )
    db.commit()


def _seed_honors(db: Session) -> None:
    """种子 5 条荣誉（≤6）。"""
    if _count(db, Honor) > 0:
        return
    rows = [
        ("城市影像《流动的夜》", "以长曝光捕捉城市脉搏", "2025 江苏省新闻摄影年赛", "二等奖"),
        ("婚礼纪实《誓言》", "记录仪式中最真实的一刻", "2024 华东婚礼影像大赛", "一等奖"),
        ("人像《窗边的光》", "自然光下的情绪肖像", "2023 全国人像摄影双年展", "入选作品"),
        ("商业短片《器物之美》", "为手作品牌拍摄的形象短片", "2022 中国商业摄影年鉴", "提名"),
        ("公益纪实《山里的课堂》", "乡村教育题材纪实组照", "2021 平遥国际摄影大展", "三等奖"),
    ]
    for index, (title, description, issuer, level) in enumerate(rows):
        db.add(
            Honor(
                title=title,
                description=description,
                issuer=issuer,
                level=level,
                sort=index,
            )
        )
    db.commit()


def _seed_distributions(
    db: Session,
    users: dict[str, User],
    videos: dict[str, Video],
) -> None:
    """种子 3 条分发记录，覆盖 active / closed / expired 三种状态。"""
    if _count(db, Distribution) > 0:
        return

    editor = users["editor"]
    now = datetime.now()

    specs = [
        {
            "collection_name": "城市与光 · 临时合集",
            "note": "夜景与城市影像精选，供预览确认，请勿外传。",
            "customer_name": "王女士",
            "customer_contact": "13800008821",
            "duration_type": "1h",
            "status": "active",
            "expires_at": now + timedelta(hours=1),
            "video_keys": ["city_night", "city_wide", "backlit_portrait"],
        },
        {
            "collection_name": "婚礼纪实 · 誓言",
            "note": "婚礼当天纪实与细节，供两位确认选片。",
            "customer_name": "市政宣传部 · 张先生",
            "customer_contact": "13912345678",
            "duration_type": "1d",
            "status": "closed",
            "expires_at": now - timedelta(days=2),
            "video_keys": ["wedding_vow", "wedding_ring"],
        },
        {
            "collection_name": "商业影像 · 器物",
            "note": "品牌产品与静物影像合集。",
            "customer_name": "李总",
            "customer_contact": "wx: li_boss",
            "duration_type": "3d",
            "status": "expired",
            "expires_at": now - timedelta(days=5),
            "video_keys": ["commercial_product", "still_life"],
        },
    ]

    for spec in specs:
        collection = Collection(
            name=spec["collection_name"],
            note=spec["note"],
            created_by=editor.id,
        )
        db.add(collection)
        db.flush()

        for index, video_key in enumerate(spec["video_keys"]):
            db.add(
                CollectionItem(
                    collection_id=collection.id,
                    video_id=videos[video_key].id,
                    sort=index,
                )
            )

        db.add(
            Distribution(
                collection_id=collection.id,
                token=token_service.generate(),
                customer_name=spec["customer_name"],
                customer_contact=spec["customer_contact"],
                duration_type=spec["duration_type"],
                expires_at=spec["expires_at"],
                status=spec["status"],
                created_by=editor.id,
            )
        )
    db.commit()


def _seed_leads(db: Session) -> None:
    """种子 4 条预约留言（含 unread / replied）。"""
    if _count(db, Lead) > 0:
        return
    rows = [
        ("张女士", "13800138000", "婚礼纪实", "2026-10-01", "希望包含户外草坪仪式与晚宴纪实。", "unread"),
        ("李先生", "0510-88886666", "商业摄影", "2026-10-15", "品牌新品拍摄，需要产品与场景图。", "replied"),
        ("王同学", "15900001234", "人像写真", "2026-11-02", "毕业写真，希望自然光风格。", "unread"),
        ("陈老师", "13700008888", "活动跟拍", "2026-09-30", "学校运动会跟拍，需要当天出图。", "replied"),
    ]
    for name, phone, demand_type, demand_date, demand_note, status in rows:
        db.add(
            Lead(
                name=name,
                phone=phone,
                demand_type=demand_type,
                demand_date=demand_date,
                demand_note=demand_note,
                status=status,
            )
        )
    db.commit()


def _seed_settings(db: Session) -> None:
    """种子全部站点配置键。"""
    defaults: dict[str, str] = {
        "icp_no": "苏ICP备2026000000号-1",
        "police_no": "苏公网安备32040002000000号",
        "copyright": "Copyright 2026 交点影视 版权所有",
        "phone": "0539-8888888",
        "address": "江苏省常州市钟楼区运河路 188 号 3 幢",
        "email": "hello@jiaodianfilm.com",
        "work_hours": "周一至周日 9:00 - 18:00",
        "brand_slogan": "以光影，铭记时光",
    }
    for key, value in defaults.items():
        setting = db.get(SiteSetting, key)
        if setting is None:
            db.add(SiteSetting(key=key, value=value))
        elif not setting.value:
            setting.value = value
    db.commit()


# ======================================================================
# 入口
# ======================================================================
def seed(db: Session) -> None:
    """执行全部种子步骤（幂等）。"""
    users = _seed_users(db)
    groups = _seed_asset_groups(db)
    assets = _seed_assets(db, groups)
    _seed_hero_slides(db, assets)
    _seed_company_profile(db)
    segments = _seed_segments(db, assets)
    videos = _seed_videos(db, users)
    _seed_segment_items(db, segments, videos)
    _seed_honors(db)
    _seed_distributions(db, users, videos)
    _seed_leads(db)
    _seed_settings(db)


def seed_if_empty() -> None:
    """用于应用启动的种子检查：始终调用幂等的 seed()。"""
    with SessionLocal() as db:
        seed(db)


def main() -> None:
    """命令行入口：建表 + 写入种子数据。"""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
        summary = {
            "users": _count(db, User),
            "asset_groups": _count(db, AssetGroup),
            "assets": _count(db, Asset),
            "hero_slides": _count(db, HeroSlide),
            "company_profile": _count(db, CompanyProfile),
            "segments": _count(db, Segment),
            "segment_items": _count(db, SegmentItem),
            "videos": _count(db, Video),
            "honors": _count(db, Honor),
            "collections": _count(db, Collection),
            "collection_items": _count(db, CollectionItem),
            "distributions": _count(db, Distribution),
            "leads": _count(db, Lead),
            "site_settings": _count(db, SiteSetting),
        }
    logger.info("种子数据就绪：%s", summary)


if __name__ == "__main__":
    main()
