"""FastAPI 应用入口。

职责：CORS、静态资源挂载（/uploads）、路由注册、启动时建表与种子检查、
统一异常处理器注册。
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models  # noqa: F401  确保所有 ORM 模型注册到 Base.metadata
from app.config import settings
from app.database import Base, engine
from app.routers import (
    admin_dashboard,
    admin_distributions,
    admin_honors,
    admin_leads,
    admin_members,
    admin_site,
    admin_uploads,
    admin_videos,
    auth,
    public,
    share,
)
from app.utils.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("lightisle")

# 静态资源目录必须在挂载前存在
settings.upload_path.mkdir(parents=True, exist_ok=True)
settings.upload_public_dir.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """应用启动时建表并做种子检查；退出时无需清理。"""
    Base.metadata.create_all(bind=engine)
    logger.info("数据库表结构已就绪")
    try:
        from app.seed import seed_if_empty

        seed_if_empty()
    except Exception as exc:  # noqa: BLE001 - 种子失败不应阻断服务启动
        logger.warning("种子数据检查失败（可稍后手动执行 python -m app.seed）：%s", exc)
    yield


app = FastAPI(
    title="交点影视 JIAO DIAN FILM AND TELEVISION · 后端 API",
    version="1.0.0",
    description="官网 + 管理后台 + 分享页的统一后端（FastAPI + MySQL）",
    lifespan=lifespan,
)

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ---------------- 统一异常处理 ----------------
register_exception_handlers(app)

# ---------------- 静态资源 ----------------
app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")

# ---------------- 路由注册 ----------------
app.include_router(auth.router)
app.include_router(public.router)
app.include_router(share.router)
app.include_router(admin_videos.router)
app.include_router(admin_uploads.router)
app.include_router(admin_distributions.router)
app.include_router(admin_site.router)
app.include_router(admin_honors.router)
app.include_router(admin_leads.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_members.router)


@app.get("/api/health", tags=["健康检查"], summary="健康检查")
def health() -> dict:
    """返回服务健康状态。"""
    return {"code": 0, "data": {"status": "ok"}, "message": "ok"}
