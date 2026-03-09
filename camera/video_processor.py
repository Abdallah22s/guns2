"""
Video processing module for weapon detection.
Extracted from routes.py to improve code organization and maintainability.
"""

import os
import cv2
import time
import logging
import shutil
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable

logger = logging.getLogger(__name__)

# Constants
WEPAPP_DIR = Path(__file__).resolve().parent.parent / "wepapp"
WEPAPP_INFERENCES_DIR = WEPAPP_DIR / "inferences"


class VideoProcessingError(Exception):
    """Custom exception for video processing errors."""

    pass


def clear_scan_results(scan_name: str) -> None:
    """
    Clear previous scan results before starting a new scan.

    Args:
        scan_name: Name of the scan folder to clear
    """
    try:
        output_folder = WEPAPP_INFERENCES_DIR / scan_name
        if output_folder.exists() and output_folder.is_dir():
            for item in output_folder.iterdir():
                if item.is_file():
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(item)
            logger.info(f"Cleared previous results for scan: {scan_name}")
    except Exception as e:
        logger.warning(f"Could not clear previous results: {e}")


def process_video_frames(
    video_path: Path,
    output_folder: Path,
    frame_skip: int,
    model_name: str,
    compute_device: str,
    confidence_threshold: float = 0.15,
    progress_callback: Optional[Callable[[int], None]] = None,
    job_id: Optional[str] = None,
    weapon_capture_interval: float = 0.0,
) -> Dict[str, Any]:
    """
    Process video frames for weapon detection.

    Args:
        video_path: Path to the video file
        output_folder: Directory to save detection images
        frame_skip: Process every Nth frame
        model_name: YOLO model name to use
        compute_device: Device for inference (cpu/cuda/mps)
        confidence_threshold: Minimum confidence for detection
        progress_callback: Optional callback for progress updates (0-100)
        job_id: Optional job identifier for logging
        weapon_capture_interval: Minimum seconds between weapon captures (0 = capture all detections)

    Returns:
        Dictionary with detection results and metadata

    Raises:
        VideoProcessingError: If video cannot be processed
    """
    import sys

    wepapp_path = str(WEPAPP_DIR)
    if wepapp_path not in sys.path:
        sys.path.append(wepapp_path)

    from wepcore.inference_images_weapon import inference_images_weapon

    cap = None
    detected_weapons = []
    frame_count = 0
    processed_count = 0
    last_capture_time = 0.0  # Track last weapon capture time

    try:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise VideoProcessingError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        logger.info(
            f"Processing video: {video_path}, FPS: {fps}, Total frames: {total_frames}"
        )

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            current_time = frame_count / fps if fps > 0 else 0

            if frame_count % frame_skip == 0:
                # Calculate progress
                progress = (
                    min(95, int((frame_count / total_frames) * 100))
                    if total_frames > 0
                    else 0
                )
                if progress_callback:
                    progress_callback(progress)

                try:
                    result_image, _, _, scores, _ = inference_images_weapon(
                        frame,
                        job_id or "unknown",
                        frame_count,
                        model_name=model_name,
                        compute_device=compute_device,
                    )

                    if getattr(scores, "size", 0) > 0:
                        # Use the highest confidence in the frame instead of assuming index 0.
                        confidence = float(scores.max())
                        if confidence > confidence_threshold:
                            # Check if enough time has passed since last capture
                            time_since_last_capture = current_time - last_capture_time
                            should_capture = (
                                weapon_capture_interval <= 0
                                or time_since_last_capture >= weapon_capture_interval
                            )

                            if should_capture:
                                weapon_timestamp = time.strftime("%d-%m-%Y %H:%M:%S")
                                weapon_filename = (
                                    f"weapon_{processed_count:04d}_{confidence:.2f}.jpg"
                                )
                                weapon_path = output_folder / weapon_filename
                                cv2.imwrite(str(weapon_path), result_image)

                                rel_path = weapon_path.relative_to(
                                    WEPAPP_INFERENCES_DIR
                                )
                                detected_weapons.append(
                                    {
                                        "filename": weapon_filename,
                                        "confidence": confidence,
                                        "timestamp": weapon_timestamp,
                                        "image_path": f"/public/{rel_path.as_posix()}",
                                        "frame_number": frame_count,
                                        "time_seconds": round(current_time, 2),
                                    }
                                )
                                processed_count += 1
                                last_capture_time = current_time
                                logger.info(
                                    f"Detected weapon in frame {frame_count}, confidence: {confidence:.2%}, time: {current_time:.2f}s"
                                )

                except Exception as e:
                    logger.exception(f"Error processing frame {frame_count}: {e}")
                    # Continue processing next frame

            frame_count += 1

        cap.release()
        cap = None

        logger.info(
            f"Video processing completed. Detected {len(detected_weapons)} weapons"
        )

        return {
            "detections": detected_weapons,
            "total_frames": frame_count,
            "processed_frames": processed_count,
            "fps": fps,
        }

    except Exception as e:
        logger.exception(f"Video processing failed: {e}")
        raise VideoProcessingError(f"Failed to process video: {e}")
    finally:
        if cap is not None:
            cap.release()


def create_event_from_detections(
    detections: List[Dict[str, Any]], scan_name: str, model_name: str, db_session=None
) -> Optional[Any]:
    """
    Create an event in database from detection results.

    Args:
        detections: List of detection dictionaries
        scan_name: Name of the scan
        model_name: Model used for detection
        db_session: Database session (optional)

    Returns:
        Created event object or None
    """
    if not detections:
        return None

    try:
        from event.models import Event
        from extenstions import db

        now = datetime.now()
        weapon_images = [d["filename"] for d in detections]

        event = Event(
            status=f"Weapon Detected ({len(detections)} images)",
            video_name=scan_name,
            date_time=now.strftime("%d-%m-%Y %H:%M:%S"),
            Threat_status=f"Threat detected | Model:{model_name}",
            image_path=weapon_images[0] if weapon_images else "",
            weapon_images=",".join(weapon_images),
            timestamp=now,
        )

        if db_session:
            db_session.add(event)
            db_session.commit()
        else:
            db.session.add(event)
            db.session.commit()

        logger.info(
            f"Created event for scan {scan_name} with {len(detections)} detections"
        )
        return event

    except Exception as e:
        logger.exception(f"Failed to create event: {e}")
        return None
