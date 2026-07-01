import logging
import sys
from app.config import get_settings

settings = get_settings()


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG if not settings.is_production else logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    fmt = (
        "%(asctime)s [%(levelname)s] %(name)s - %(message)s"
        if not settings.is_production
        else '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}'
    )
    handler.setFormatter(logging.Formatter(fmt))
    logger.addHandler(handler)
    return logger
