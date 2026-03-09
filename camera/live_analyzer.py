"""
Live Camera Analyzer - تحليل البث المباشر للكاميرات
يدعم تحليل تدفقات RTSP و MJPEG مباشرة
"""

import cv2
import time
import threading
import logging
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Callable

logger = logging.getLogger(__name__)

# Constants
WEPAPP_DIR = Path(__file__).resolve().parent.parent / "wepapp"
WEPAPP_INFERENCES_DIR = WEPAPP_DIR / "inferences"

# Store active live streams
active_live_streams: Dict[str, dict] = {}
streams_lock = threading.Lock()


class LiveStreamAnalyzer:
    """محلل البث المباشر للكاميرات"""

    def __init__(
        self,
        camera_id: int,
        stream_url: str,
        camera_name: str,
        compute_device: str = "cpu",
        model_name: str = "yolov8n",
        frame_skip: int = 30,
        confidence_threshold: float = 0.25,
        scan_duration: int = 3600,  # 1 hour default
    ):
        self.camera_id = camera_id
        self.stream_url = stream_url
        self.camera_name = camera_name
        self.compute_device = compute_device
        self.model_name = model_name
        self.frame_skip = frame_skip
        self.confidence_threshold = confidence_threshold
        self.scan_duration = scan_duration

        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.detections: List[dict] = []

    def start(self) -> str:
        """بدء التحليل المباشر"""
        if self.is_running:
            logger.warning(f"Stream {self.camera_id} is already running")
            return None

        # Create output folder
        scan_name = f"live_{self.camera_id}_{int(time.time())}"
        self.output_folder = WEPAPP_INFERENCES_DIR / scan_name
        self.output_folder.mkdir(parents=True, exist_ok=True)

        # Start analysis in background thread
        self.is_running = True
        self.thread = threading.Thread(target=self._analyze_stream, daemon=True)
        self.thread.start()

        logger.info(f"Started live analysis for camera {self.camera_id}")
        return scan_name

    def stop(self):
        """إيقاف التحليل المباشر"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info(f"Stopped live analysis for camera {self.camera_id}")

    def _analyze_stream(self):
        """تحليل البث المباشر"""
        import sys

        sys.path.insert(0, str(WEPAPP_DIR))

        try:
            from wepcore.inference_images_weapon_yolov8 import inference_images_weapon
        except ImportError as e:
            logger.error(f"Failed to import inference module: {e}")
            self.is_running = False
            return

        # Open video capture
        cap = cv2.VideoCapture(self.stream_url)

        if not cap.isOpened():
            logger.error(f"Failed to open stream: {self.stream_url}")
            self.is_running = False
            return

        logger.info(f"Connected to stream: {self.stream_url}")

        frame_count = 0
        start_time = time.time()
        detected_count = 0

        try:
            while self.is_running:
                # Check timeout
                if time.time() - start_time > self.scan_duration:
                    logger.info(f"Scan duration reached for camera {self.camera_id}")
                    break

                ret, frame = cap.read()
                if not ret:
                    # Try to reconnect
                    logger.warning(
                        f"Lost connection to stream, attempting reconnect..."
                    )
                    time.sleep(2)
                    cap = cv2.VideoCapture(self.stream_url)
                    if not cap.isOpened():
                        logger.error(f"Failed to reconnect to stream")
                        break
                    continue

                frame_count += 1

                # Skip frames
                if frame_count % self.frame_skip != 0:
                    continue

                try:
                    # Perform inference
                    result_image, _, _, scores, classes = inference_images_weapon(
                        frame,
                        self.camera_name,
                        frame_count,
                        model_name=self.model_name,
                        compute_device=self.compute_device,
                    )

                    # Check for detections
                    if scores is not None and len(scores) > 0 and scores.shape[1] > 0:
                        confidence = float(scores[0][0])

                        if confidence > self.confidence_threshold:
                            # Save detection image
                            timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
                            filename = f"weapon_{detected_count:04d}_{confidence:.2f}_{timestamp}.jpg"
                            filepath = self.output_folder / filename

                            cv2.imwrite(str(filepath), result_image)

                            detection = {
                                "filename": filename,
                                "confidence": confidence,
                                "timestamp": timestamp,
                                "frame_number": frame_count,
                                "image_path": str(
                                    filepath.relative_to(WEPAPP_INFERENCES_DIR)
                                ),
                            }

                            self.detections.append(detection)
                            detected_count += 1

                            logger.info(
                                f"⚠️ weapon detected! Camera: {self.camera_name}, Confidence: {confidence:.2%}"
                            )

                            # Create event in database
                            self._create_event(detection)

                except Exception as e:
                    logger.error(f"Error processing frame {frame_count}: {e}")
                    continue

        finally:
            cap.release()
            self.is_running = False
            logger.info(f"Stream analysis ended. Total detections: {detected_count}")

    def _create_event(self, detection: dict):
        """إنشاء حدث في قاعدة البيانات عند الكشف عن سلاح"""
        try:
            from event.models import Event
            from extenstions import db

            # Get Flask app context
            from flask import current_app

            with current_app.app_context():
                event = Event(
                    status=f"Live Detection - Weapon Detected",
                    video_name=self.camera_name,
                    date_time=detection["timestamp"],
                    Threat_status=f"Threat detected | Confidence: {detection['confidence']:.2%}",
                    image_path=detection["image_path"],
                    weapon_images=detection["filename"],
                    timestamp=datetime.now(),
                )
                db.session.add(event)
                db.session.commit()
                logger.info(f"Event created in database for camera {self.camera_name}")
        except Exception as e:
            logger.error(f"Failed to create event: {e}")


def start_live_analysis(
    camera_id: int,
    stream_url: str,
    camera_name: str,
    compute_device: str = "cpu",
    model_name: str = "yolov8n",
    frame_skip: int = 30,
    confidence_threshold: float = 0.25,
    scan_duration: int = 3600,
) -> dict:
    """
    بدء التحليل المباشر لكاميرا

    Args:
        camera_id: معرف الكاميرا
        stream_url: رابط البث (RTSP/MJPEG)
        camera_name: اسم الكاميرا
        compute_device: جهاز الحساب (cpu/cuda/mps)
        model_name: اسم النموذج
        frame_skip: تخطي الإطارات
        confidence_threshold: حد الثقة
        scan_duration: مدة الفحص بالثواني

    Returns:
        dict: معلومات الفحص
    """
    stream_key = f"camera_{camera_id}"

    with streams_lock:
        # Check if already running
        if stream_key in active_live_streams:
            existing = active_live_streams[stream_key]
            if existing["analyzer"].is_running:
                return {
                    "success": False,
                    "message": "Analysis already running for this camera",
                }

        # Create new analyzer
        analyzer = LiveStreamAnalyzer(
            camera_id=camera_id,
            stream_url=stream_url,
            camera_name=camera_name,
            compute_device=compute_device,
            model_name=model_name,
            frame_skip=frame_skip,
            confidence_threshold=confidence_threshold,
            scan_duration=scan_duration,
        )

        # Start analysis
        scan_name = analyzer.start()

        if scan_name:
            active_live_streams[stream_key] = {
                "analyzer": analyzer,
                "scan_name": scan_name,
                "started_at": time.time(),
            }

            return {
                "success": True,
                "message": "Live analysis started",
                "scan_name": scan_name,
                "camera_id": camera_id,
                "stream_url": stream_url,
            }
        else:
            return {"success": False, "message": "Failed to start analysis"}


def stop_live_analysis(camera_id: int) -> dict:
    """إيقاف التحليل المباشر لكاميرا"""
    stream_key = f"camera_{camera_id}"

    with streams_lock:
        if stream_key in active_live_streams:
            analyzer = active_live_streams[stream_key]["analyzer"]
            analyzer.stop()
            del active_live_streams[stream_key]

            return {"success": True, "message": "Live analysis stopped"}

    return {"success": False, "message": "No active analysis for this camera"}


def get_live_analysis_status(camera_id: int) -> dict:
    """الحصول على حالة التحليل المباشر"""
    stream_key = f"camera_{camera_id}"

    with streams_lock:
        if stream_key in active_live_streams:
            data = active_live_streams[stream_key]
            analyzer = data["analyzer"]

            return {
                "success": True,
                "is_running": analyzer.is_running,
                "scan_name": data["scan_name"],
                "started_at": data["started_at"],
                "detections_count": len(analyzer.detections),
                "detections": analyzer.detections[-10:],  # Last 10 detections
            }

    return {
        "success": True,
        "is_running": False,
    }


def get_all_active_streams() -> List[dict]:
    """الحصول على جميع البثوث النشطة"""
    with streams_lock:
        result = []
        for key, data in active_live_streams.items():
            analyzer = data["analyzer"]
            result.append(
                {
                    "camera_id": analyzer.camera_id,
                    "camera_name": analyzer.camera_name,
                    "stream_url": analyzer.stream_url,
                    "is_running": analyzer.is_running,
                    "scan_name": data["scan_name"],
                    "started_at": data["started_at"],
                    "detections_count": len(analyzer.detections),
                }
            )
        return result
