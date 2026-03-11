"""
YOLOv8 weapon inference module.
Used when framework=yolov8 in configuration.
Designed for WEAPON DETECTION ONLY - filters out person class.

IMPORTANT: This module requires a custom YOLO model trained on weapon data.
Without a custom model, it falls back to the generic COCO model (yolov8n.pt)
which only detects 'knife' class (ID 43) and is NOT optimized for weapon detection.

To use YOLO with weapons:
1. Train a custom YOLO model on weapon data: yolo detect train data=weapon.yaml
2. Place the trained .pt file in: weaponresource/
3. The system will automatically detect and use it
"""

import os
import time
import threading
import logging as log
import importlib
from types import SimpleNamespace
from pathlib import Path

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
    "weapon_yolo": "weaponresource/weapon_yolo.pt",
    "weapon": "weaponresource/weapon_yolo.pt",
    "epoch30": "weaponresource/epoch30.pt",
    "hadi_yolov8": "weaponresource/hadi_yolov8.pt",
    "threat_yolov8n": "weaponresource/threat_yolov8n.pt",
    "firearm_yolov8n": "weaponresource/firearm_yolov8n.pt",
    "background1k": "weaponresource/yolov8_background1k_best.pt",
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


# Default weapon class names if no config file exists
_DEFAULT_WEAPON_CLASS_NAMES = {
    "gun",
    "pistol",
    "rifle",
    "knife",
    "handgun",
    "firearm",
    "explosion",
    "grenade",
    "weapon",
}

# Weapon classes to filter - read from config or use defaults
_WEAPON_CLASSES = getattr(cfg, "weapon_classes", None)
if _WEAPON_CLASSES is None:
    # Default to all weapon classes for the custom model
    # Gun, explosion, grenade, knife
    _WEAPON_CLASSES = [0, 1, 2, 3]

_WEAPON_CLASS_NAMES = _load_weapon_names_set()
# Use default weapon names if config file doesn't exist
if _WEAPON_CLASS_NAMES is None:
    _WEAPON_CLASS_NAMES = _DEFAULT_WEAPON_CLASS_NAMES

# Classes to EXCLUDE (person class is 0 in COCO, but custom models may differ)
_EXCLUDED_CLASSES = getattr(cfg, "excluded_classes", [])
if not isinstance(_EXCLUDED_CLASSES, list):
    _EXCLUDED_CLASSES = []

# COCO class IDs that are weapon-related (for fallback when using generic COCO model)
# 43 = knife in COCO
_COCO_WEAPON_CLASS_IDS = {43}
# COCO class names that are weapon-related
_COCO_WEAPON_CLASS_NAMES = {
    "knife",
    "pistol",
    "gun",
    "firearm",
    "handgun",
    "rifle",
    "weapon",
}


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

    # Allow direct file path
    if model_name and os.path.isfile(str(model_name)):
        return os.path.abspath(str(model_name))

    # Check if it's a custom weapon model name
    if requested in _WEAPON_MODEL_WEIGHTS:
        weight_name = _WEAPON_MODEL_WEIGHTS[requested]
    else:
        weight_name = _WEAPON_MODEL_WEIGHTS["yolov8n"]

    # Build the full path to the weight file
    weight_path = os.path.join(os.path.dirname(__file__), "..", weight_name)
    weight_path = os.path.abspath(weight_path)

    if os.path.isfile(weight_path):
        log.info(f"Using YOLO model: {weight_path}")
        return weight_path

    # Fallback: Check for any .pt file in weaponresource directory
    yolo_weights_dir = os.path.join(os.path.dirname(__file__), "..", "weaponresource")
    if os.path.isdir(yolo_weights_dir):
        for f in os.listdir(yolo_weights_dir):
            if f.endswith((".pt", ".onnx")):
                candidate = os.path.join(yolo_weights_dir, f)
                if os.path.isfile(candidate):
                    log.info(f"Found YOLO weapon model: {f}")
                    return candidate

    # Final fallback - use yolov8n
    log.warning("No custom weapon model found, using default YOLOv8 model")
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", _WEAPON_MODEL_WEIGHTS["yolov8n"])
    )


def _get_model(model_name, debug=None):
    key = _resolve_weights(model_name)
    with _cache_lock:
        cached = _model_cache.get(key)
        if cached is not None:
            if isinstance(debug, dict):
                debug["yolo_weights"] = key
            return cached

        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise ImportError("YOLOv8 requires: pip install ultralytics") from exc

        weights = key
        log.info("loading YOLO weapon model: %s", weights)
        model = YOLO(weights)
        _model_cache[key] = model
        log.info("loaded YOLO weapon model")
        if isinstance(debug, dict):
            debug["yolo_weights"] = weights
        return model


def inference_images_weapon(
    image_mask1,
    video_name,
    frame_num,
    model_name="yolov8n",
    compute_device="cpu",
    confidence_threshold=None,
    debug=None,
):
    """
    Compatibility wrapper that returns:
    (image2, start_time, end_time, scores, classes)

    scores/classes shapes are (1, N).
    """
    import logging as log

    log.info(
        f"[DEBUG] inference_images_weapon called with model_name={model_name}, conf={confidence_threshold}"
    )

    start_time = time.time()
    end_time = time.time()
    image2 = image_mask1.copy()
    out_scores = np.zeros((1, 0), dtype=np.float32)
    out_classes = np.zeros((1, 0), dtype=np.float32)

    try:
        print(f"[YOLO] Loading model: {model_name}", flush=True)
        model = _get_model(model_name, debug=debug)
        print(f"[YOLO] Model loaded: {model}", flush=True)
        score_thr = (
            float(confidence_threshold)
            if confidence_threshold is not None
            else float(getattr(cfg, "score_weapon", 0.3))
        )
        score_thr = max(score_thr, 0.05)

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
            if isinstance(debug, dict):
                debug["yolo_device"] = dev

        results = model(img_bgr, **prediction_kwargs)[0]
        end_time = time.time()

        log.info(f"[DEBUG] Raw results: {len(results.boxes)} boxes before filtering")

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

            # Determine if this is a custom weapon model or a generic COCO model
            # by checking if the model's class names include weapon-specific names
            model_class_names_lower = {
                str(v).strip().lower() for v in names_map.values()
            }
            is_custom_weapon_model = bool(
                model_class_names_lower
                & {"gun", "riffle", "rifle", "pistol", "handgun", "firearm"}
            )

            log.info(f"[DEBUG] Model class names: {names_map}")
            log.info(f"[DEBUG] Is custom weapon model: {is_custom_weapon_model}")
            log.info(f"[DEBUG] _WEAPON_CLASS_NAMES: {_WEAPON_CLASS_NAMES}")
            log.info(f"[DEBUG] n before filtering: {n}")

            # Keep only weapon classes if specified
            if _WEAPON_CLASS_NAMES and is_custom_weapon_model:
                # Custom weapon model: filter by weapon class names
                det_names = np.array(
                    [str(names_map.get(int(c), "")).strip().lower() for c in clss],
                    dtype=object,
                )
                mask &= np.isin(det_names, list(_WEAPON_CLASS_NAMES))
            elif not is_custom_weapon_model:
                # Generic COCO model: use COCO weapon-related class IDs and names
                det_names = np.array(
                    [str(names_map.get(int(c), "")).strip().lower() for c in clss],
                    dtype=object,
                )
                # Accept COCO weapon names (knife=43) plus any custom weapon names
                all_weapon_names = _COCO_WEAPON_CLASS_NAMES | (
                    _WEAPON_CLASS_NAMES or set()
                )
                name_mask = np.isin(det_names, list(all_weapon_names))
                id_mask = np.isin(clss, list(_COCO_WEAPON_CLASS_IDS))
                mask &= name_mask | id_mask
                log.warning(
                    "Using generic COCO model - only knife class (43) will be detected as weapon. "
                    "For full weapon detection (guns/rifles), use a weapon-specific model."
                )
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

    return (image2, start_time, end_time, out_scores, out_classes, out_boxes)
