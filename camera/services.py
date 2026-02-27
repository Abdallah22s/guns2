"""
Camera service layer with caching and optimized database queries.
"""

import logging
from functools import lru_cache
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import func, desc, asc
from extenstions import db
from .models import Camera

logger = logging.getLogger(__name__)

# Simple in-memory cache with TTL
_cache = {}
_cache_ttl = {}


def _get_cache(key: str) -> Optional[Any]:
    """Get value from cache if not expired."""
    if key in _cache:
        expiry = _cache_ttl.get(key)
        if expiry and datetime.now() < expiry:
            return _cache[key]
        # Clear expired cache
        _cache.pop(key, None)
        _cache_ttl.pop(key, None)
    return None


def _set_cache(key: str, value: Any, ttl_seconds: int = 300) -> None:
    """Set value in cache with TTL."""
    _cache[key] = value
    _cache_ttl[key] = datetime.now() + timedelta(seconds=ttl_seconds)


def _invalidate_cache(pattern: str = None) -> None:
    """Invalidate cache entries matching pattern."""
    if pattern:
        keys_to_remove = [k for k in _cache.keys() if pattern in k]
        for key in keys_to_remove:
            _cache.pop(key, None)
            _cache_ttl.pop(key, None)
    else:
        _cache.clear()
        _cache_ttl.clear()


class CameraService:
    """Service layer for camera operations with caching."""

    CACHE_KEY_ALL_CAMERAS = "all_cameras"
    CACHE_KEY_SEARCH_PREFIX = "camera_search_"
    CACHE_TTL = 300  # 5 minutes

    @classmethod
    def get_all_cameras(cls, use_cache: bool = True) -> List[Camera]:
        """
        Get all cameras with optional caching.

        Args:
            use_cache: Whether to use cached results

        Returns:
            List of Camera objects
        """
        if use_cache:
            cached = _get_cache(cls.CACHE_KEY_ALL_CAMERAS)
            if cached is not None:
                logger.debug("Returning cached cameras")
                return cached

        cameras = Camera.query.all()

        if use_cache:
            _set_cache(cls.CACHE_KEY_ALL_CAMERAS, cameras, cls.CACHE_TTL)
            logger.debug(f"Cached {len(cameras)} cameras")

        return cameras

    @classmethod
    def get_camera_by_id(cls, camera_id: int) -> Optional[Camera]:
        """
        Get camera by ID.

        Args:
            camera_id: Camera primary key

        Returns:
            Camera object or None
        """
        return Camera.query.get(camera_id)

    @classmethod
    def search_cameras(cls, query: str, use_cache: bool = True) -> List[Camera]:
        """
        Search cameras by name, location, or address.

        Args:
            query: Search query string
            use_cache: Whether to use cached results

        Returns:
            List of matching Camera objects
        """
        cache_key = f"{cls.CACHE_KEY_SEARCH_PREFIX}{query.lower()}"

        if use_cache:
            cached = _get_cache(cache_key)
            if cached is not None:
                logger.debug(f"Returning cached search results for: {query}")
                return cached

        # Use OR condition for multiple fields
        search_pattern = f"%{query}%"
        cameras = (
            Camera.query.filter(
                db.or_(
                    Camera.name.ilike(search_pattern),
                    Camera.location.ilike(search_pattern),
                    Camera.address.ilike(search_pattern),
                )
            )
            .limit(100)
            .all()
        )  # Limit results for performance

        if use_cache:
            _set_cache(cache_key, cameras, cls.CACHE_TTL)
            logger.debug(f"Cached search results for: {query} ({len(cameras)} results)")

        return cameras

    @classmethod
    def create_camera(cls, **kwargs) -> Camera:
        """
        Create a new camera and invalidate cache.

        Args:
            **kwargs: Camera attributes

        Returns:
            Created Camera object
        """
        camera = Camera(**kwargs)
        db.session.add(camera)
        db.session.commit()

        # Invalidate cache
        _invalidate_cache(cls.CACHE_KEY_ALL_CAMERAS)
        _invalidate_cache(cls.CACHE_KEY_SEARCH_PREFIX)

        logger.info(f"Created camera: {camera.name} (ID: {camera.id})")
        return camera

    @classmethod
    def update_camera(
        cls, camera_id: int, updated_fields: Dict[str, Any]
    ) -> Optional[Camera]:
        """
        Update camera and invalidate cache.

        Args:
            camera_id: Camera ID to update
            updated_fields: Dictionary of fields to update

        Returns:
            Updated Camera object or None if not found
        """
        camera = cls.get_camera_by_id(camera_id)
        if not camera:
            return None

        editable_fields = {
            "name",
            "location",
            "video_type",
            "video_link",
            "frame_skip_size",
            "address",
            "lat",
            "long",
        }

        for key, value in updated_fields.items():
            if key in editable_fields:
                setattr(camera, key, value)

        db.session.commit()

        # Invalidate cache
        _invalidate_cache(cls.CACHE_KEY_ALL_CAMERAS)
        _invalidate_cache(cls.CACHE_KEY_SEARCH_PREFIX)

        logger.info(f"Updated camera: {camera.name} (ID: {camera.id})")
        return camera

    @classmethod
    def delete_camera(cls, camera_id: int) -> bool:
        """
        Delete camera and invalidate cache.

        Args:
            camera_id: Camera ID to delete

        Returns:
            True if deleted, False if not found
        """
        camera = cls.get_camera_by_id(camera_id)
        if not camera:
            return False

        db.session.delete(camera)
        db.session.commit()

        # Invalidate cache
        _invalidate_cache(cls.CACHE_KEY_ALL_CAMERAS)
        _invalidate_cache(cls.CACHE_KEY_SEARCH_PREFIX)

        logger.info(f"Deleted camera: {camera.name} (ID: {camera.id})")
        return True

    @classmethod
    def get_camera_stats(cls) -> Dict[str, Any]:
        """
        Get camera statistics.

        Returns:
            Dictionary with camera statistics
        """
        total = Camera.query.count()

        # Group by location
        location_stats = (
            db.session.query(Camera.location, func.count(Camera.id).label("count"))
            .group_by(Camera.location)
            .all()
        )

        return {
            "total_cameras": total,
            "locations": {loc: count for loc, count in location_stats if loc},
        }


def clear_camera_cache():
    """Clear all camera-related cache."""
    _invalidate_cache(CameraService.CACHE_KEY_ALL_CAMERAS)
    _invalidate_cache(CameraService.CACHE_KEY_SEARCH_PREFIX)
    logger.info("Camera cache cleared")
