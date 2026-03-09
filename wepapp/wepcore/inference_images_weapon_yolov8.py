"""
YOLOv8 weapon inference module.
Used when framework=yolov8 in configuration.
Designed for WEAPON DETECTION ONLY - filters out person class.
"""

import os
import time
import threading
import logging as log
import importlib
from types import SimpleNamespace

import cv2
import numpy as np


def _load_cfg():
    try:
        return importlib.import_module("wepcore.setup")
    except BaseException as exc:
        log.warning("Fallback config loaded for YOLOv8 inference: %s", exc)
        return SimpleNamespace(
            weights_weapon=None, score_weapon=0.3, weapon_classes=None
        )


cfg = _load_cfg()

log.info("YOLOv8 weapon inference module loaded")

_model_cache = {}
_cache_lock = threading.Lock()
_WEAPON_MODEL_WEIGHTS = {
    "yolov8n": "yolov8n.pt",
}


def _read_class_names(class_file_name):
    names = {}
    try:
        with open(class_file_name, "r", encoding="utf-8") as data:
            for idx, line in enumerate(data):
                names[idx] = line.strip()
    except Exception:
        pass
    return names


def _load_weapon_names_set():
    try:
        names_path = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__), "..", "wepdata", "classes", "weapons.names"
            )
        )
        names_map = _read_class_names(names_path)
        out = {str(v).strip().lower() for v in names_map.values() if str(v).strip()}
        # Accept common typo variants
        if "riffle" in out:
            out.add("rifle")
        return out if out else None
    except Exception:
        return None


# Weapon classes to filter - read from config or use defaults
_WEAPON_CLASSES = getattr(cfg, "weapon_classes", None)
if _WEAPON_CLASSES is None:
    # Default to first 3 class IDs (Gun/Knife/Riffle) to match weapons.names
    _WEAPON_CLASSES = [0, 1, 2]

_WEAPON_CLASS_NAMES = _load_weapon_names_set()

# Classes to EXCLUDE (person class is 0 in COCO, but custom models may differ)
_EXCLUDED_CLASSES = getattr(cfg, "excluded_classes", [])
if not isinstance(_EXCLUDED_CLASSES, list):
    _EXCLUDED_CLASSES = []


def _draw_bbox_simple(image, boxes, scores, classes, allowed_classes):
    if boxes is None or len(boxes) == 0:
        return image

    out = image.copy()
    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = [int(v) for v in box]
        cv2.rectangle(out, (x1, y1), (x2, y2), (0, 0, 255), 2)
    return out


def _resolve_weights(model_name):
    # Use weapon-specific weights if available
    requested = str(model_name or "").strip().lower()

    # Check if it's a custom weapon model path
    if requested in _WEAPON_MODEL_WEIGHTS:
        weight_name = _WEAPON_MODEL_WEIGHTS[requested]
    else:
        weight_name = _WEAPON_MODEL_WEIGHTS["yolov8n"]

    # First check in wepapp directory for custom weights
    candidate_paths = [
        os.path.join(
            os.path.dirname(__file__), "..", "weaponresource", "checkpoints_weapon"
        ),
        os.path.join(os.path.dirname(__file__), "..", weight_name),
    ]

    # Look for best available weapon detection model
    for base_path in candidate_paths:
        if os.path.isdir(base_path):
            # Check for WeaponOct models (prefer higher version)
            weapon_oct24 = os.path.join(base_path, "WeaponOct24_608_8K")
            weapon_oct7 = os.path.join(base_path, "WeaponOct7_608_6000")

            if os.path.isdir(weapon_oct24):
                # Use TensorFlow model path - will be handled separately
                log.info("Found TensorFlow weapon model: WeaponOct24_608_8K")
            if os.path.isdir(weapon_oct7):
                log.info("Found TensorFlow weapon model: WeaponOct7_608_6000")

    # Check for YOLO format weapon models in the weaponresource directory
    yolo_weights_dir = os.path.join(os.path.dirname(__file__), "..", "weaponresource")
    if os.path.isdir(yolo_weights_dir):
        for f in os.listdir(yolo_weights_dir):
            if f.endswith((".pt", ".onnx")):
                candidate = os.path.join(yolo_weights_dir, f)
                if os.path.isfile(candidate):
                    log.info("Found YOLO weapon model: %s", f)
                    return candidate

    # Check standard location
    candidate = os.path.join(os.path.dirname(__file__), "..", weight_name)
    candidate = os.path.abspath(candidate)
    if os.path.isfile(candidate):
        return candidate

    # Fallback to configured weapon weights if present
    weights_cfg = getattr(cfg, "weights_weapon", None)
    if weights_cfg and os.path.isfile(weights_cfg):
        return weights_cfg

    # Final fallback - use yolov8n which will be downloaded from ultralytics
    # Note: This is NOT a weapon-specific model!
    log.warning("No custom weapon model found, using default YOLOv8 model")
    log.warning(
        "This model is NOT trained for weapon detection - detection will be limited!"
    )
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", _WEAPON_MODEL_WEIGHTS["yolov8n"])
    )


def _get_model(model_name):
    key = _resolve_weights(model_name)
    with _cache_lock:
        cached = _model_cache.get(key)
        if cached is not None:
            return cached

        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise ImportError("YOLOv8 requires: pip install ultralytics") from exc

        weights = _resolve_weights(key)
        log.info("loading YOLO weapon model: %s", weights)
        model = YOLO(weights)
        _model_cache[key] = model
        log.info("loaded YOLO weapon model")
        return model


def inference_images_weapon(
    image_mask1,
    video_name,
    frame_num,
    model_name="yolov8n",
    compute_device="cpu",
):
    """
    Compatibility wrapper that returns:
    (image2, start_time, end_time, scores, classes)

    scores/classes shapes are (1, N).
    """
    start_time = time.time()
    end_time = time.time()
    image2 = image_mask1.copy()
    out_scores = np.zeros((1, 0), dtype=np.float32)
    out_classes = np.zeros((1, 0), dtype=np.float32)

    try:
        model = _get_model(model_name)
        score_thr = getattr(cfg, "score_weapon", 0.3)

        if len(image_mask1.shape) == 3 and image_mask1.shape[2] == 3:
            img_bgr = cv2.cvtColor(image_mask1, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = image_mask1

        prediction_kwargs = {"conf": score_thr, "verbose": False}
        if isinstance(compute_device, str) and compute_device.strip():
            dev = compute_device.strip().lower()
            if dev == "gpu":
                dev = "cuda"
            prediction_kwargs["device"] = dev

        results = model(img_bgr, **prediction_kwargs)[0]
        end_time = time.time()

        names_map = getattr(results, "names", None)
        if not isinstance(names_map, dict):
            names_map = getattr(model, "names", None)
        if not isinstance(names_map, dict):
            names_map = {}

        boxes_xyxy = (
            results.boxes.xyxy.cpu().numpy()
            if results.boxes.xyxy is not None
            else np.zeros((0, 4))
        )
        confs = (
            results.boxes.conf.cpu().numpy()
            if results.boxes.conf is not None
            else np.zeros(0)
        )
        clss = (
            results.boxes.cls.cpu().numpy().astype(int)
            if results.boxes.cls is not None
            else np.zeros(0, dtype=int)
        )

        n = len(confs)
        if n == 0:
            out_boxes = np.zeros((0, 4), dtype=np.float32)
            out_scores = np.zeros((1, 0), dtype=np.float32)
            out_classes = np.zeros((1, 0), dtype=np.float32)
            valid_detections = 0
        else:
            # Filter to keep only weapon classes and exclude unwanted classes
            mask = np.ones(n, dtype=bool)

            # Filter out excluded classes (e.g., person)
            for excluded_cls in _EXCLUDED_CLASSES:
                mask &= clss != excluded_cls

            # Keep only weapon classes if specified
            if _WEAPON_CLASS_NAMES:
                det_names = np.array(
                    [str(names_map.get(int(c), "")).strip().lower() for c in clss],
                    dtype=object,
                )
                mask &= np.isin(det_names, list(_WEAPON_CLASS_NAMES))
            elif _WEAPON_CLASSES is not None:
                mask &= np.isin(clss, _WEAPON_CLASSES)

            # Apply filter
            boxes_xyxy = boxes_xyxy[mask]
            confs = confs[mask]
            clss = clss[mask]

            n = len(confs)
            if n == 0:
                out_boxes = np.zeros((0, 4), dtype=np.float32)
                out_scores = np.zeros((1, 0), dtype=np.float32)
                out_classes = np.zeros((1, 0), dtype=np.float32)
                valid_detections = 0
            else:
                out_boxes = boxes_xyxy.astype(np.float32)
                out_scores = confs.reshape(1, -1).astype(np.float32)
                out_classes = clss.reshape(1, -1).astype(np.float32)
                valid_detections = n

        image2 = _draw_bbox_simple(
            image_mask1.copy(),
            out_boxes,
            out_scores[0] if n else np.zeros(0),
            out_classes[0] if n else np.zeros(0),
            [],
        )

        log.info("YOLOv8 inference finished, detections: %s", valid_detections)
    except Exception as exc:
        log.error("YOLOv8 inference exception: %s", exc)

    return (image2, start_time, end_time, out_scores, out_classes)
