import time
import logging as log
import os

import numpy as np

log.info("Unified inference module loaded (TensorFlow Keras weapon detection)")


def _check_weapon_model_available():
    """Check if TensorFlow weapon model is available."""
    model_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "weaponresource",
        "checkpoints_weapon",
        "WeaponOct24_608_8K",
    )
    return os.path.isdir(os.path.abspath(model_path))


# Check if weapon model is available
_WEAPON_MODEL_AVAILABLE = _check_weapon_model_available()
if _WEAPON_MODEL_AVAILABLE:
    log.info(
        "TensorFlow weapon model detected - using custom weapon detection model (WeaponOct24_608_8K)"
    )
else:
    log.warning("TensorFlow weapon model not found! Falling back to YOLOv8.")

# Expose core config so callers can reuse thresholds/framework hints
try:
    from wepcore import setup as _setup  # type: ignore

    SCORE_WEAPON_DEFAULT = float(getattr(_setup, "score_weapon", 0.3))
    FRAMEWORK_DEFAULT = getattr(_setup, "framework", "yolov8")
except Exception:
    SCORE_WEAPON_DEFAULT = 0.3
    FRAMEWORK_DEFAULT = "yolov8"


def resolve_model_selection(model_name):
    """Resolve requested model into an effective backend/model selection.

    Returns:
        (model_selected, model_used, fallback_reason)

    User selection is now respected:
    - If user selects 'keras' or 'tf' or 'tensorflow' → use Keras (if available)
    - If user selects 'yolo' or 'yolov8' or 'yolov8n' → use YOLO
    - If user selects 'auto' → use Keras if available, else YOLO
    - If user selects specific YOLO model name (epoch30, hadi_yolov8, etc.) → use that YOLO model
    """
    raw = (model_name or "").strip().lower()
    if not raw:
        raw = "auto"

    # User explicitly wants Keras
    if raw in {"keras", "tf", "tensorflow"}:
        if _WEAPON_MODEL_AVAILABLE:
            return "keras", "keras", None
        return "keras", "yolov8n", "Keras model not available; falling back to YOLO."

    # User explicitly wants YOLO - respect this choice!
    if raw.startswith("yolo"):
        # Check if there's a custom YOLO weapon model
        yolo_model_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "weaponresource",
        )
        # Look for YOLO models (*.pt files) in weaponresource
        if os.path.exists(yolo_model_path):
            for f in os.listdir(yolo_model_path):
                if f.endswith(".pt"):
                    # Found a YOLO model - use it
                    return "yolo", f"yolo:{f[:-3]}", None
        # No custom YOLO weapon model - use default YOLOv8 but warn
        return (
            "yolo",
            "yolov8n",
            "Using YOLOv8 (not trained for weapons - for testing only)",
        )

    # Check for specific YOLO weapon model names (epoch30, hadi_yolov8, threat_yolov8n, etc.)
    weapon_model_names = [
        "epoch30",
        "hadi_yolov8",
        "threat_yolov8n",
        "firearm_yolov8n",
        "weapon",
        "weapon_yolo",
        "background1k",
    ]
    if raw in weapon_model_names:
        # Look for the specific model in weaponresource
        yolo_model_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "weaponresource",
        )
        model_file_map = {
            "epoch30": "epoch30.pt",
            "hadi_yolov8": "hadi_yolov8.pt",
            "threat_yolov8n": "threat_yolov8n.pt",
            "firearm_yolov8n": "firearm_yolov8n.pt",
            "weapon": "weapon_yolo.pt",
            "weapon_yolo": "weapon_yolo.pt",
            "background1k": "yolov8_background1k_best.pt",
        }
        model_file = model_file_map.get(raw)
        if model_file:
            model_full_path = os.path.join(yolo_model_path, model_file)
            if os.path.exists(model_full_path):
                return "yolo", f"yolo:{raw}", None
        # Model file not found
        return raw, None, f"Model '{raw}' file not found in weaponresource/"

    # Auto mode: prefer Keras if available, else YOLO
    if raw in {"auto", "default"}:
        if _WEAPON_MODEL_AVAILABLE:
            return "auto", "keras", None
        return "auto", "yolov8n", None

    # For any other model name, check if it's a known Keras model
    if _WEAPON_MODEL_AVAILABLE:
        # Check if it's a known Keras weapon model
        known_keras_models = ["WeaponOct24_608_8K", "WeaponOct7_608_6000"]
        if raw in known_keras_models or raw in [m.lower() for m in known_keras_models]:
            return raw, "keras", None

    return raw, raw, None


def inference_images_weapon(
    image_mask1,
    video_name,
    frame_num,
    model_name="yolov8n",
    compute_device="cpu",
    confidence_threshold=None,
    debug=None,
):
    """Weapon inference using custom TensorFlow model.

    Returns: (image2, start_time, end_time, scores, classes, boxes)
    """

    # Default threshold from config if not provided
    if confidence_threshold is None:
        confidence_threshold = SCORE_WEAPON_DEFAULT

    model_selected, model_used, fallback_reason = resolve_model_selection(model_name)
    if isinstance(debug, dict):
        debug["model_selected"] = model_selected
        debug["model_used"] = model_used
        debug["model_fallback_reason"] = fallback_reason

    if model_used == "keras":
        from wepcore.inference_images_weapon_keras import (
            inference_images_weapon as keras_infer,
        )

        return keras_infer(
            image_mask1,
            video_name,
            frame_num,
            model_name="WeaponOct24_608_8K",
            compute_device=compute_device,
            confidence_threshold=confidence_threshold,
            debug=debug,
        )

    # Fallback to YOLOv8 (not recommended - not trained for weapons!)
    if fallback_reason:
        log.warning(fallback_reason)

    # Extract model name from "yolo:epoch30" format
    yolo_model_name = model_used
    if yolo_model_name and yolo_model_name.startswith("yolo:"):
        yolo_model_name = yolo_model_name[5:]  # Remove "yolo:" prefix
        log.info(f"Using custom YOLO weapon model: {yolo_model_name}")
    else:
        log.warning("Using YOLOv8 - this model is NOT trained for weapon detection!")

    from wepcore.inference_images_weapon_yolov8 import (
        inference_images_weapon as yolov8_infer,
    )

    return yolov8_infer(
        image_mask1,
        video_name,
        frame_num,
        model_name=yolo_model_name or "yolov8n",
        compute_device=compute_device,
        confidence_threshold=confidence_threshold,
        debug=debug,
    )
