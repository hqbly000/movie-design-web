"""应用配置（pydantic-settings）。

从 backend/.env 读取，集中管理数据库连接、JWT、上传目录、CORS 等配置项。
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# 工程根目录：backend/
BASE_DIR: Path = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """全局配置对象。所有字段均有默认值，便于在任意环境下启动。"""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---------- 数据库 ----------
    DB_URL: str = (
        "mysql+pymysql://root:12345678@10.66.237.199:3306/lightisle?charset=utf8mb4"
    )

    # ---------- JWT ----------
    JWT_SECRET: str = "lightisle-dev-secret-please-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 默认 24 小时

    # ---------- 上传 ----------
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 5
    ALLOWED_IMAGE_EXTS: str = "jpg,jpeg,png,webp"

    # ---------- CORS ----------
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174"
    )

    # ---------- 站点 ----------
    SITE_BASE_URL: str = "http://localhost:5173"
    SITE_CACHE_TTL: int = 60  # 公开站点聚合配置缓存秒数

    # ------------------------------------------------------------------
    # 派生属性
    # ------------------------------------------------------------------
    @property
    def cors_origins_list(self) -> list[str]:
        """返回 CORS 允许来源列表。"""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_image_exts(self) -> set[str]:
        """返回允许的图片扩展名集合（小写，不含点）。"""
        return {e.strip().lower().lstrip(".") for e in self.ALLOWED_IMAGE_EXTS.split(",") if e.strip()}

    @property
    def upload_path(self) -> Path:
        """上传目录的绝对路径（backend/uploads）。"""
        p = Path(self.UPLOAD_DIR)
        return p if p.is_absolute() else (BASE_DIR / p)

    @property
    def upload_public_dir(self) -> Path:
        """后台上传文件的落盘目录（backend/uploads/upload）。"""
        return self.upload_path / "upload"

    @property
    def cover_dir(self) -> Path:
        """AI 种子素材目录（backend/uploads/cover）。"""
        return self.upload_path / "cover"

    @property
    def max_upload_bytes(self) -> int:
        """上传大小上限（字节）。"""
        return self.MAX_UPLOAD_MB * 1024 * 1024

    def share_url(self, token: str) -> str:
        """根据 token 拼装分享页完整地址。"""
        return f"{self.SITE_BASE_URL.rstrip('/')}/share/{token}"


@lru_cache
def get_settings() -> Settings:
    """返回单例配置对象（带缓存）。"""
    return Settings()


settings: Settings = get_settings()
