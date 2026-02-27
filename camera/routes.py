from flask import Blueprint, render_template, request, jsonify, current_app
from .models import Camera
from extenstions import db
from event.models import Event
from .video_processor import (
    process_video_frames,
    clear_scan_results,
    create_event_from_detections,
    VideoProcessingError,
)
from .services import CameraService

import os
import cv2
import time
import threading
import logging
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

camera_bp = Blueprint(
    "camera_bp",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="assets",
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VIDEOS_UPLOAD_DIR = PROJECT_ROOT / "videos" / "uploads"
WEPAPP_DIR = PROJECT_ROOT / "wepapp"
WEPAPP_INFERENCES_DIR = WEPAPP_DIR / "inferences"
SCAN_JOB_TTL_SECONDS = 3600

scan_jobs = {}
scan_jobs_lock = threading.Lock()


def _gpu_available() -> bool:
    try:
        import torch

        return bool(torch.cuda.is_available())
    except Exception:
        return False


def _is_within(base_path: Path, target_path: Path) -> bool:
    try:
        target_path.resolve().relative_to(base_path.resolve())
        return True
    except ValueError:
        return False


def _job_touch(job_id: str) -> None:
    with scan_jobs_lock:
        if job_id in scan_jobs:
            scan_jobs[job_id]["updated_at"] = time.time()


def _cleanup_scan_jobs() -> None:
    now_ts = time.time()
    expired_ids = []
    with scan_jobs_lock:
        for job_id, job in scan_jobs.items():
            finished = job.get("status") in {"completed", "failed"}
            stale = now_ts - job.get("updated_at", now_ts) > SCAN_JOB_TTL_SECONDS
            if finished and stale:
                expired_ids.append(job_id)

        for job_id in expired_ids:
            scan_jobs.pop(job_id, None)


def _clear_scan_results(scan_name: str) -> None:
    """Clear previous scan results before starting a new scan."""
    clear_scan_results(scan_name)


def _normalize_compute_device(raw_device: str) -> str:
    device = (raw_device or "cpu").strip().lower()
    if device == "cpu":
        return "cpu"
    if device == "mps":
        return "mps"
    if device == "gpu":
        try:
            import torch

            if torch.cuda.is_available():
                return "cuda:0"
        except Exception:
            pass
        return "cpu"
    if device == "cuda" or device.startswith("cuda:"):
        return device
    return "cpu"


@camera_bp.route("/cameras/compute-capabilities", methods=["GET"])
def get_compute_capabilities():
    gpu_available = _gpu_available()
    return (
        jsonify(
            {
                "gpu_available": gpu_available,
                "default_device": "gpu" if gpu_available else "cpu",
            }
        ),
        200,
    )


def _resolve_uploaded_video_path(video_link: str):
    if not isinstance(video_link, str):
        return None

    link = video_link.strip()
    if not link:
        return None

    if link.startswith("/videos/uploads/"):
        candidate = (VIDEOS_UPLOAD_DIR / os.path.basename(link)).resolve()
        if _is_within(VIDEOS_UPLOAD_DIR, candidate) and candidate.exists():
            return candidate
        return None

    # Backward compatible handling for plain filename inputs
    candidate = (VIDEOS_UPLOAD_DIR / os.path.basename(link)).resolve()
    if _is_within(VIDEOS_UPLOAD_DIR, candidate) and candidate.exists():
        return candidate

    return None


def _parse_json_body():
    if not request.is_json:
        return None, (
            jsonify({"message": "Content-Type must be application/json"}),
            415,
        )
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({"message": "Invalid JSON body"}), 400)
    return data, None


@camera_bp.route("/")
def home():
    cameras = Camera.query.all()
    return render_template("camera/camera.html", cameras=cameras)


@camera_bp.route("/cameras")
def get_cameras_as_json():
    try:
        cameras = CameraService.get_all_cameras(use_cache=True)
        camera_list = []
        for camera in cameras:
            camera_data = {
                "id": camera.id,
                "name": camera.name,
                "location": camera.location,
                "video_type": camera.video_type,
                "video_link": camera.video_link,
                "frame_skip_size": camera.frame_skip_size,
                "address": camera.address,
                "lat": camera.lat,
                "long": camera.long,
            }
            camera_list.append(camera_data)

        return jsonify(camera_list), 200
    except Exception as e:
        logger.exception("Error fetching cameras")
        return jsonify({"error": str(e)}), 500


@camera_bp.route("/cameras/add", methods=["POST"])
def store_camera_config():
    data, error_response = _parse_json_body()
    if error_response:
        return error_response

    name = data.get("name")
    location = data.get("location")
    video_type = data.get("video_type")
    video_link = data.get("video_link")
    frame_skip_size = data.get("frame_skip_size")
    address = data.get("address")
    lat = data.get("lat")
    long = data.get("long")

    if not video_type or not video_link:
        return (
            jsonify({"message": "Missing video_type or video_link field in request"}),
            400,
        )

    try:
        camera = CameraService.create_camera(
            name=name,
            location=location,
            video_link=video_link,
            video_type=video_type,
            frame_skip_size=frame_skip_size,
            address=address,
            lat=lat,
            long=long,
        )

        return (
            jsonify(
                {"message": "Camera configuration stored successfully", "id": camera.id}
            ),
            201,
        )
    except Exception as e:
        logger.exception("Error creating camera")
        return jsonify({"message": str(e)}), 500


@camera_bp.route("/cameras/<string:camera_id>", methods=["GET"])
def get_camera_configuration(camera_id):
    try:
        camera_pk = int(camera_id)
    except ValueError:
        return jsonify({"error": "Invalid camera id"}), 400

    camera = CameraService.get_camera_by_id(camera_pk)
    if camera is None:
        return jsonify({"error": "Camera not found"}), 404

    camera_data = {
        "id": camera.id,
        "name": camera.name,
        "location": camera.location,
        "video_type": camera.video_type,
        "video_link": camera.video_link,
        "frame_skip_size": camera.frame_skip_size,
        "address": camera.address,
        "lat": camera.lat,
        "long": camera.long,
    }

    return jsonify(camera_data), 200


@camera_bp.route("/cameras/update/<string:camera_id>", methods=["PUT"])
def edit_camera_configuration(camera_id):
    try:
        data, error_response = _parse_json_body()
        if error_response:
            return error_response

        try:
            camera_pk = int(camera_id)
        except ValueError:
            return jsonify({"error": "Invalid camera id"}), 400

        updated_fields = data.get("updated_fields")
        if not isinstance(updated_fields, dict) or not updated_fields:
            return jsonify({"message": "Missing updated_fields"}), 400

        camera = CameraService.update_camera(camera_pk, updated_fields)
        if camera is None:
            return jsonify({"error": "Camera not found"}), 404

        return jsonify({"message": "Camera configuration updated successfully"}), 200

    except Exception as e:
        logger.exception("Error updating camera")
        return jsonify({"message": str(e)}), 500


@camera_bp.route("/cameras/<string:camera_id>", methods=["DELETE"])
def delete_camera_configuration(camera_id):
    try:
        try:
            camera_pk = int(camera_id)
        except ValueError:
            return jsonify({"error": "Invalid camera id"}), 400

        deleted = CameraService.delete_camera(camera_pk)
        if not deleted:
            return jsonify({"error": "Camera not found"}), 404

        return jsonify({"message": "Camera deleted successfully"}), 200

    except Exception as e:
        logger.exception("Error deleting camera")
        return jsonify({"message": str(e)}), 500


@camera_bp.route("/cameras/search", methods=["GET"])
def search_cameras():
    """Search cameras by name, location, or address with caching"""
    try:
        query = request.args.get("q", "").strip()
        if not query:
            return jsonify({"error": "Search query required"}), 400

        # Use service layer with caching
        cameras = CameraService.search_cameras(query, use_cache=True)

        camera_list = []
        for camera in cameras:
            camera_data = {
                "id": camera.id,
                "name": camera.name,
                "location": camera.location,
                "video_type": camera.video_type,
                "video_link": camera.video_link,
                "frame_skip_size": camera.frame_skip_size,
                "address": camera.address,
                "lat": camera.lat,
                "long": camera.long,
            }
            camera_list.append(camera_data)

        return (
            jsonify(
                {"success": True, "count": len(camera_list), "results": camera_list}
            ),
            200,
        )
    except Exception as e:
        logger.exception("Error searching cameras")
        return jsonify({"error": str(e)}), 500


@camera_bp.route("/cameras/upload-video", methods=["POST"])
def upload_video():
    try:
        if "video" not in request.files:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "No video file provided",
                        "message": "Please upload a video file",
                    }
                ),
                400,
            )

        video_file = request.files["video"]
        if video_file.filename == "":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "No file selected",
                        "message": "Please select a video file",
                    }
                ),
                400,
            )

        timestamp = int(time.time())
        filename = f"{timestamp}_{secure_filename(video_file.filename)}"
        VIDEOS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        video_path = VIDEOS_UPLOAD_DIR / filename
        video_file.save(str(video_path))

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Video uploaded successfully",
                    "video_link": f"/videos/uploads/{filename}",
                    "filename": filename,
                }
            ),
            200,
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "message": "Failed to upload video",
                }
            ),
            500,
        )


@camera_bp.route("/process-video/<string:camera_id>", methods=["POST"])
def process_video(camera_id):
    try:
        if "video" not in request.files:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "No video file provided",
                        "message": "Please upload a video file",
                    }
                ),
                400,
            )

        video_file = request.files["video"]
        compute_device = _normalize_compute_device(
            request.form.get("compute_device", "gpu")
        )
        model_name = (request.form.get("model", "yolov9c") or "yolov9c").strip()

        try:
            scan_interval = int(request.form.get("scan_interval", 5))
            if scan_interval <= 0:
                raise ValueError("scan_interval must be > 0")
        except (ValueError, TypeError) as e:
            logger.warning(f"Invalid scan_interval: {e}")
            return jsonify({"success": False, "error": "Invalid scan_interval"}), 400

        # Weapon capture interval (seconds between captures)
        try:
            weapon_capture_interval = float(
                request.form.get("weapon_capture_interval", 0)
            )
            if weapon_capture_interval < 0:
                raise ValueError("weapon_capture_interval must be >= 0")
        except (ValueError, TypeError) as e:
            logger.warning(f"Invalid weapon_capture_interval: {e}")
            return (
                jsonify({"success": False, "error": "Invalid weapon_capture_interval"}),
                400,
            )

        if video_file.filename == "":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "No file selected",
                        "message": "Please select a video file",
                    }
                ),
                400,
            )

        timestamp = int(time.time())
        filename = f"{timestamp}_{secure_filename(video_file.filename)}"
        VIDEOS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        video_path = VIDEOS_UPLOAD_DIR / filename
        video_file.save(str(video_path))

        session_id = f"{camera_id}_{timestamp}"
        output_folder = WEPAPP_INFERENCES_DIR / f"process_{session_id}"
        output_folder.mkdir(parents=True, exist_ok=True)

        def process_video_background():
            try:
                result = process_video_frames(
                    video_path=video_path,
                    output_folder=output_folder,
                    frame_skip=max(
                        int(
                            cv2.VideoCapture(str(video_path)).get(cv2.CAP_PROP_FPS)
                            * scan_interval
                        ),
                        1,
                    ),
                    model_name=model_name,
                    compute_device=compute_device,
                    confidence_threshold=0.3,
                    job_id=session_id,
                    weapon_capture_interval=weapon_capture_interval,
                )

                # Save results to JSON
                import json

                fps = cv2.VideoCapture(str(video_path)).get(cv2.CAP_PROP_FPS)
                total_frames = int(
                    cv2.VideoCapture(str(video_path)).get(cv2.CAP_PROP_FRAME_COUNT)
                )
                duration = total_frames / fps if fps > 0 else 0

                # Format detections for results
                formatted_detections = []
                for i, det in enumerate(result["detections"]):
                    formatted_detections.append(
                        {
                            "id": i,
                            "status": f"Weapon Detected | Confidence: {det['confidence']:.2%}",
                            "confidence": round(det["confidence"] * 100, 1),
                            "datetime": det["timestamp"],
                            "image_path": det["image_path"],
                            "frame_number": det["frame_number"],
                            "timestamp_seconds": (
                                round(det["frame_number"] / fps, 2) if fps > 0 else 0
                            ),
                        }
                    )

                results = {
                    "session_id": session_id,
                    "camera_id": camera_id,
                    "video_filename": filename,
                    "processed_at": time.strftime("%d-%m-%Y %H:%M:%S"),
                    "video_duration": round(duration, 2),
                    "total_frames": total_frames,
                    "scan_interval": scan_interval,
                    "compute_device": compute_device,
                    "model": model_name,
                    "detections_count": len(formatted_detections),
                    "detections": formatted_detections,
                }

                results_path = output_folder / "results.json"
                with open(results_path, "w", encoding="utf-8") as f:
                    json.dump(results, f, indent=2)

            except Exception as e:
                logger.exception(
                    f"Video processing failed for session {session_id}: {e}"
                )

        thread = threading.Thread(target=process_video_background, daemon=True)
        thread.start()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Video processing started successfully",
                    "data": {
                        "session_id": session_id,
                        "video_path": str(video_path),
                        "compute_device": compute_device,
                        "model": model_name,
                        "scan_interval": scan_interval,
                        "weapon_capture_interval": weapon_capture_interval,
                        "status": "processing",
                    },
                }
            ),
            200,
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "message": "Failed to start video processing",
                }
            ),
            500,
        )


@camera_bp.route("/cameras/scan-video/start", methods=["POST"])
def start_scan_video():
    try:
        _cleanup_scan_jobs()
        data, error_response = _parse_json_body()
        if error_response:
            return error_response

        video_link = data.get("video_link")
        compute_device = _normalize_compute_device(data.get("compute_device", "gpu"))
        model_name = (data.get("model", "yolov9c") or "yolov9c").strip()

        try:
            snapshot_interval_seconds = int(data.get("snapshot_interval_seconds", 5))
            if snapshot_interval_seconds <= 0:
                raise ValueError("snapshot_interval_seconds must be > 0")
        except (ValueError, TypeError) as e:
            logger.warning(f"Invalid snapshot_interval_seconds: {e}")
            return (
                jsonify(
                    {"success": False, "error": "Invalid snapshot_interval_seconds"}
                ),
                400,
            )

        capture_name = secure_filename(data.get("capture_name", "scan")) or "scan"

        video_path = _resolve_uploaded_video_path(video_link)
        if video_path is None:
            return (
                jsonify({"success": False, "error": "Video not found or invalid path"}),
                400,
            )

        import uuid

        job_id = str(uuid.uuid4())[:8]
        app_obj = current_app._get_current_object()

        initial_job = {
            "job_id": job_id,
            "status": "running",
            "progress": 0,
            "eta_seconds": None,
            "message": "Processing started",
            "video_link": video_link,
            "scan_name": f"scan_{job_id}_{capture_name}",
            "weapon_found": False,
            "weapon_images": [],
            "weapon_images_count": 0,
            "model": model_name,
            "compute_device": compute_device,
            "created_at": time.time(),
            "updated_at": time.time(),
        }
        with scan_jobs_lock:
            scan_jobs[job_id] = initial_job

        def process_scan():
            try:
                # Clear previous scan results before starting new scan
                clear_scan_results(scan_jobs[job_id]["scan_name"])

                output_folder = WEPAPP_INFERENCES_DIR / scan_jobs[job_id]["scan_name"]
                output_folder.mkdir(parents=True, exist_ok=True)

                # Get video info for frame_skip calculation
                cap = cv2.VideoCapture(str(video_path))
                fps = cap.get(cv2.CAP_PROP_FPS)
                cap.release()
                frame_skip = max(int(fps * snapshot_interval_seconds), 1)

                def update_progress(progress):
                    with scan_jobs_lock:
                        if job_id in scan_jobs:
                            scan_jobs[job_id]["progress"] = progress
                            scan_jobs[job_id]["updated_at"] = time.time()

                result = process_video_frames(
                    video_path=video_path,
                    output_folder=output_folder,
                    frame_skip=frame_skip,
                    model_name=model_name,
                    compute_device=compute_device,
                    confidence_threshold=0.15,
                    progress_callback=update_progress,
                    job_id=job_id,
                )

                detected_weapons = [d["filename"] for d in result["detections"]]

                with scan_jobs_lock:
                    if job_id in scan_jobs:
                        scan_jobs[job_id]["status"] = "completed"
                        scan_jobs[job_id]["progress"] = 100
                        scan_jobs[job_id]["weapon_found"] = len(detected_weapons) > 0
                        scan_jobs[job_id]["weapon_images"] = detected_weapons
                        scan_jobs[job_id]["weapon_images_count"] = len(detected_weapons)
                        scan_jobs[job_id][
                            "message"
                        ] = f"Scan completed. Found {len(detected_weapons)} weapons."
                        scan_jobs[job_id]["updated_at"] = time.time()

                if detected_weapons:
                    with app_obj.app_context():
                        create_event_from_detections(
                            result["detections"],
                            scan_jobs[job_id]["scan_name"],
                            model_name,
                        )

            except Exception as e:
                logger.exception(f"Scan processing failed for job {job_id}: {e}")
                with scan_jobs_lock:
                    if job_id in scan_jobs:
                        scan_jobs[job_id]["status"] = "failed"
                        scan_jobs[job_id]["message"] = str(e)
                        scan_jobs[job_id]["updated_at"] = time.time()

        thread = threading.Thread(target=process_scan, daemon=True)
        thread.start()

        return (
            jsonify(
                {
                    "success": True,
                    "job_id": job_id,
                    "message": "Scan started successfully",
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@camera_bp.route("/cameras/scan-video/status/<string:job_id>", methods=["GET"])
def get_scan_status(job_id):
    try:
        _cleanup_scan_jobs()
        with scan_jobs_lock:
            job = scan_jobs.get(job_id)
            if not job:
                return jsonify({"success": False, "error": "Job not found"}), 404
            return jsonify(job), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@camera_bp.route("/inference-images/delete", methods=["POST"])
def delete_inference_image():
    try:
        data, error_response = _parse_json_body()
        if error_response:
            return error_response

        image_path = data.get("image_path")
        if not image_path:
            return jsonify({"success": False, "error": "No image path provided"}), 400

        clean_path = str(image_path).lstrip("/").replace("..", "")
        target = (WEPAPP_INFERENCES_DIR / clean_path).resolve()

        if not _is_within(WEPAPP_INFERENCES_DIR, target):
            return jsonify({"success": False, "error": "Invalid image path"}), 403

        if target.exists() and target.is_file():
            target.unlink()
            return (
                jsonify({"success": True, "message": "Image deleted successfully"}),
                200,
            )

        return jsonify({"success": False, "error": "Image not found"}), 404

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ========== Live Camera Analysis Endpoints ==========
from .live_analyzer import (
    start_live_analysis,
    stop_live_analysis,
    get_live_analysis_status,
    get_all_active_streams,
)


@camera_bp.route("/cameras/live/start", methods=["POST"])
def start_camera_live_analysis():
    """
    بدء التحليل المباشر لكاميرا

    Request Body:
    {
        "camera_id": 1,                    // معرف الكاميرا
        "stream_url": "rtsp://...",        // رابط البث (اختياري إذا كان محدد في الكاميرا)
        "compute_device": "cpu",           // cpu/cuda/mps
        "model_name": "yolov9c",          // نموذج YOLO
        "frame_skip": 30,                  // تخطي الإطارات
        "confidence_threshold": 0.25,     // حد الثقة
        "scan_duration": 3600             // مدة الفحص بالثواني
    }
    """
    try:
        data, error_response = _parse_json_body()
        if error_response:
            return error_response

        camera_id = data.get("camera_id")
        if not camera_id:
            return jsonify({"success": False, "error": "camera_id is required"}), 400

        # Get camera from database
        camera = CameraService.get_camera_by_id(int(camera_id))
        if not camera:
            return jsonify({"success": False, "error": "Camera not found"}), 404

        # Get stream URL from request or camera configuration
        stream_url = data.get("stream_url") or camera.video_link
        if not stream_url:
            return jsonify({"success": False, "error": "No stream URL provided"}), 400

        # Validate stream URL
        if not (
            stream_url.startswith("rtsp://")
            or stream_url.startswith("http://")
            or stream_url.startswith("https://")
        ):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Invalid stream URL. Must be RTSP or HTTP URL",
                    }
                ),
                400,
            )

        # Get parameters
        compute_device = _normalize_compute_device(data.get("compute_device", "cpu"))
        model_name = data.get("model_name", "yolov9c")
        frame_skip = int(data.get("frame_skip", 30))
        confidence_threshold = float(data.get("confidence_threshold", 0.25))
        scan_duration = int(data.get("scan_duration", 3600))

        # Start live analysis
        result = start_live_analysis(
            camera_id=int(camera_id),
            stream_url=stream_url,
            camera_name=camera.name,
            compute_device=compute_device,
            model_name=model_name,
            frame_skip=frame_skip,
            confidence_threshold=confidence_threshold,
            scan_duration=scan_duration,
        )

        if result.get("success"):
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        logger.exception("Error starting live analysis")
        return jsonify({"success": False, "error": str(e)}), 500


@camera_bp.route("/cameras/live/stop/<string:camera_id>", methods=["POST"])
def stop_camera_live_analysis(camera_id):
    """إيقاف التحليل المباشر لكاميرا"""
    try:
        camera_pk = int(camera_id)
    except ValueError:
        return jsonify({"success": False, "error": "Invalid camera id"}), 400

    result = stop_live_analysis(camera_pk)

    if result.get("success"):
        return jsonify(result), 200
    else:
        return jsonify(result), 400


@camera_bp.route("/cameras/live/status/<string:camera_id>", methods=["GET"])
def get_camera_live_status(camera_id):
    """الحصول على حالة التحليل المباشر لكاميرا"""
    try:
        camera_pk = int(camera_id)
    except ValueError:
        return jsonify({"success": False, "error": "Invalid camera id"}), 400

    result = get_live_analysis_status(camera_pk)
    return jsonify(result), 200


@camera_bp.route("/cameras/live/streams", methods=["GET"])
def get_all_live_streams():
    """الحصول على جميع البثوث المباشرة النشطة"""
    try:
        streams = get_all_active_streams()
        return (
            jsonify({"success": True, "count": len(streams), "streams": streams}),
            200,
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
