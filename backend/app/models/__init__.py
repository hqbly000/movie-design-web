"""ORM 模型包。

导入所有模型以便 ``Base.metadata.create_all()`` 能感知全部表。
"""

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

__all__ = [
    "Asset",
    "AssetGroup",
    "Collection",
    "CollectionItem",
    "CompanyProfile",
    "Distribution",
    "HeroSlide",
    "Honor",
    "Lead",
    "Segment",
    "SegmentItem",
    "SiteSetting",
    "User",
    "Video",
]
