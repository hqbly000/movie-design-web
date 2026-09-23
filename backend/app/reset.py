"""一键重置脚本：清空 ``lightisle`` 库的 14 张业务表并重新灌入种子数据。

用途
----
联调 / 冒烟测试后，把数据库恢复到与「空库首次执行 ``python -m app.seed``」完全一致的状态。

运行
----
    cd backend
    ./.venv/Scripts/python.exe -m app.reset

安全约束（硬性）
----------------
- 本脚本**只允许操作 ``lightisle`` 库**：启动时校验当前连接库名，不符即中止；
- 所有 ``TRUNCATE`` 语句均显式限定为 `` `lightisle`.`<表名>` ``；
- 实例上还存在 ``ctm`` / ``itrial_*`` 等他人业务库，绝不被本脚本触碰。
"""

from __future__ import annotations

import logging
import sys

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
from app.seed import seed

logger = logging.getLogger("lightisle.reset")

# 目标库名（硬白名单）
TARGET_DB = "lightisle"

# 需要清空的 14 张业务表（按依赖倒序，先子后父；FK 校验已临时关闭，顺序仅作可读性）
TABLES: tuple[str, ...] = (
    "collection_items",
    "distributions",
    "collections",
    "segment_items",
    "segments",
    "videos",
    "hero_slides",
    "assets",
    "asset_groups",
    "company_profile",
    "honors",
    "leads",
    "site_settings",
    "users",
)

# 期望的种子条数（用于自检）
EXPECTED: dict[str, int] = {
    "users": 3,
    "asset_groups": 3,
    "assets": 19,
    "hero_slides": 3,
    "company_profile": 1,
    "segments": 5,
    "segment_items": 10,
    "videos": 12,
    "honors": 5,
    "collections": 3,
    "collection_items": 7,
    "distributions": 3,
    "leads": 4,
    "site_settings": 8,
}

# 模型 ↔ 表名（用于自检计数）
COUNT_MODELS: dict[str, type] = {
    "users": User,
    "asset_groups": AssetGroup,
    "assets": Asset,
    "hero_slides": HeroSlide,
    "company_profile": CompanyProfile,
    "segments": Segment,
    "segment_items": SegmentItem,
    "videos": Video,
    "honors": Honor,
    "collections": Collection,
    "collection_items": CollectionItem,
    "distributions": Distribution,
    "leads": Lead,
    "site_settings": SiteSetting,
}


def _current_database_name() -> str:
    """返回当前引擎连接的数据库名。"""
    return engine.url.database or ""


def _assert_lightisle() -> str:
    """安全校验：当前连接必须指向 ``lightisle``，否则中止。

    Returns:
        校验通过的库名。

    Raises:
        RuntimeError: 连接库不是 lightisle。
    """
    db_name = _current_database_name()
    if db_name != TARGET_DB:
        raise RuntimeError(
            f"安全保护已触发：当前连接库为 {db_name!r}，"
            f"本脚本仅允许操作 {TARGET_DB!r}，已中止且未做任何改动。"
        )
    return db_name


def _truncate_all(db_name: str) -> None:
    """关闭外键校验后逐表 TRUNCATE（表名显式限定到目标库）。

    Args:
        db_name: 已校验通过的库名（恒为 lightisle）。
    """
    # 使用原生 DBAPI 连接，避免 DDL 隐式提交与 SQLAlchemy 事务状态冲突
    raw = engine.raw_connection()
    try:
        cursor = raw.cursor()
        try:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            for table in TABLES:
                # 显式限定库名，杜绝误伤他人业务库
                cursor.execute(f"TRUNCATE TABLE `{db_name}`.`{table}`")
                logger.info("已清空 %s.%s", db_name, table)
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        finally:
            cursor.close()
        raw.commit()
    finally:
        raw.close()


def _count_all(db: Session) -> dict[str, int]:
    """统计 14 张业务表的当前条数。"""
    return {
        table: int(db.scalar(select(func.count()).select_from(model)) or 0)
        for table, model in COUNT_MODELS.items()
    }


def reset() -> dict[str, int]:
    """清空 lightisle 全部业务表并重新灌入种子数据。

    Returns:
        重置后的逐表条数。

    Raises:
        RuntimeError: 连接库不是 lightisle。
    """
    db_name = _assert_lightisle()
    logger.info("目标库已确认：%s", db_name)

    # 确保表结构存在（create_all 幂等，且引擎指向 lightisle，不会影响其他库）
    Base.metadata.create_all(bind=engine)

    _truncate_all(db_name)

    with SessionLocal() as db:
        seed(db)
        counts = _count_all(db)
    return counts


def main() -> None:
    """命令行入口：打印警告 → 重置 → 自检。"""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    line = "=" * 74
    print(line, flush=True)
    print("⚠️  警告：即将清空 lightisle 库的 14 张业务表，并重新灌入种子数据！", flush=True)
    print("    此操作会删除全部业务数据（含分发记录、预约留言），且不可撤销。", flush=True)
    print("    仅影响 lightisle；实例上的 ctm / itrial_* 等他人业务库不会被触碰。", flush=True)
    print(line, flush=True)

    counts = reset()

    print(line, flush=True)
    print("重置完成，逐表条数自检：", flush=True)
    all_ok = True
    for table, expected in EXPECTED.items():
        actual = counts.get(table, 0)
        flags = "OK" if actual == expected else "不匹配"
        if actual != expected:
            all_ok = False
        print(f"  {table:<18} 期望 {expected:>3}  实际 {actual:>3}  [{flags}]", flush=True)
    print(line, flush=True)
    if all_ok:
        print("✅ 全部 14 张表条数与种子期望一致。", flush=True)
    else:
        print("❌ 存在条数不一致，请检查。", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
