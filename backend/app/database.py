"""数据库连接与会话管理（SQLAlchemy 2.x）。

- engine：全局数据库引擎（PyMySQL 驱动，MySQL 8）。
- SessionLocal：会话工厂。
- Base：所有 ORM 模型的基类。
- get_db：FastAPI 依赖，按请求提供会话并自动关闭。
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """所有 ORM 模型的声明式基类。"""


engine = create_engine(
    settings.DB_URL,
    pool_pre_ping=True,   # 连接前探活，避免 MySQL 空闲断连
    pool_recycle=3600,    # 1 小时回收，规避 wait_timeout
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖：提供数据库会话，请求结束后自动关闭。"""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
