"""
TensorFlow/Keras weapon inference module.
Uses custom weapon detection models trained for weapon detection.
"""

import os
import time
import threading
import logging as log
import importlib
from types import SimpleNamespace

import cv2
import numpy as np

# Required for this SavedModel on CPU to avoid unsupported fused Mish kernels.
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")


def _load_cfg():
    try:
        return importlib.import_module("wepcore.setup")
    except BaseException as exc:
        log.warning("Fallback config loaded for Keras inference: %s", exc)
        return SimpleNamespace(
            weights_weapon=None, score_weapon=0.3, weapon_classes=None
        )


cfg = _load_cfg()

log.info("Keras weapon inference module loaded")

_model_cache = {}
_cache_lock = threading.Lock()

# Weapon model paths
_WEAPON_MODEL_PATHS = {
    "WeaponOct24_608_8K": "weaponresource/checkpoints_weapon/WeaponOct24_608_8K",
    "WeaponOct7_608_6000": "weaponresource/checkpoints_weapon/WeaponOct7_608_6000",
}

# Default to the better model (8K version)
_DEFAULT_WEAPON_MODEL = "WeaponOct24_608_8K"


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


# Weapon classes - based on the weapons.names file
_WEAPON_CLASS_NAMES = _load_weapon_names_set()
_WEAPON_CLASS_IDS = [0, 1, 2]  # Gun, Knife, Riffle


def _resolve_keras_model(model_name=None):
    """Resolve the path to the Keras weapon model."""
    if model_name and model_name in _WEAPON_MODEL_PATHS:
        model_key = model_name
    else:
        model_key = _DEFAULT_WEAPON_MODEL

    model_path = os.path.join(
        os.path.dirname(__file__), "..", _WEAPON_MODEL_PATHS[model_key]
    )
    model_path = os.path.abspath(model_path)

    if not os.path.isdir(model_path):
        log.error("Keras weapon model not found at: %s", model_path)
        return None

    return model_path, model_key


def _get_keras_model(model_name=None):
    """Get or load the Keras weapon detection model."""
    model_path, model_key = _resolve_keras_model(model_name)
    if model_path is None:
        return None

    with _cache_lock:
        cached = _model_cache.get(model_key)
        if cached is not None:
            return cached

        try:
            import tensorflow as tf

            log.info("Loading Keras weapon model from: %s", model_path)
            # Load the model using TensorFlow's saved model format
            model = tf.saved_model.load(model_path)
            _model_cache[model_key] = model
            log.info("Loaded Keras weapon model successfully")

            # Log model input signature for diagnostics
            try:
                serving_fn = model.signatures.get("serving_default")
                if serving_fn is not None:
                    input_specs = serving_fn.structured_input_signature
                    log.info("Keras model input signature: %s", input_specs)
                else:
                    log.warning("Keras model has no 'serving_default' signature")
            except Exception as sig_err:
                log.warning("Could not inspect model signature: %s", sig_err)

            return model
        except Exception as e:
            log.error("Failed to load Keras model: %s", e)
            return None


def _preprocess_image(image, target_size=(608, 608)):
    """Preprocess image for Keras model inference."""
    # Resize to target size
    resized = cv2.resize(image, target_size)
    # Convert BGR to RGB
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    # Normalize to [0, 1]
    normalized = rgb.astype(np.float32) / 255.0
    # Add batch dimension
    batched = np.expand_dims(normalized, axis=0)
    return batched


def _preprocess_image_uint8(image, target_size=(608, 608)):
    """Preprocess image as uint8 [0-255] - some models expect this format."""
    resized = cv2.resize(image, target_size)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    batched = np.expand_dims(rgb, axis=0)  # uint8, no normalization
    return batched


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def _postprocess_outputs(outputs, original_shape, confidence_threshold=0.3):
    """
    Postprocess model outputs to get detection results.

    The outputs format depends on the model architecture.
    """
    detections = []

    try:
        # Convert known TF/Eager types to numpy first
        if hasattr(outputs, "numpy"):
            outputs = outputs.numpy()

        # Expected custom model format: (1, N, 7) where row = [y1,x1,y2,x2,c0,c1,c2]
        if (
            isinstance(outputs, np.ndarray)
            and outputs.ndim == 3
            and outputs.shape[-1] >= 7
        ):
            rows = outputs[0]  # (N, 7)
            if rows.shape[0] == 0:
                return detections

            boxes = rows[:, :4]
            class_scores = rows[:, 4:]
            # Guard against empty class_scores before reduction operations
            if class_scores.size == 0:
                return detections
            # If class scores look like logits, squash to [0, 1]
            if np.nanmax(class_scores) > 1.5 or np.nanmin(class_scores) < 0:
                class_scores = _sigmoid(class_scores)
            scores = class_scores.max(axis=1)
            classes = class_scores.argmax(axis=1).astype(int)
        else:
            # Fallback for generic detector outputs
            boxes = None
            scores = None
            classes = None
            if isinstance(outputs, dict):
                boxes = outputs.get("boxes") or outputs.get("detection_boxes")
                scores = outputs.get("scores") or outputs.get("detection_scores")
                classes = outputs.get("classes") or outputs.get("detection_classes")

                # Some SavedModels expose a single opaque output key
                # (e.g. "tf_op_layer_concat_18") with shape (1, N, 7):
                # [y1, x1, y2, x2, c0, c1, c2]. Normalize it here.
                if boxes is None and scores is None:
                    if len(outputs) == 1:
                        lone_value = next(iter(outputs.values()))
                        if hasattr(lone_value, "numpy"):
                            lone_value = lone_value.numpy()
                        lone_value = np.asarray(lone_value)
                        if lone_value.ndim == 3 and lone_value.shape[-1] >= 7:
                            rows = lone_value[0]
                            if rows.shape[0] == 0:
                                return detections
                            boxes = rows[:, :4]
                            class_scores = rows[:, 4:]
                            # Guard against empty class_scores before reduction operations
                            if class_scores.size == 0:
                                return detections
                            if (
                                np.nanmax(class_scores) > 1.5
                                or np.nanmin(class_scores) < 0
                            ):
                                class_scores = _sigmoid(class_scores)
                            scores = class_scores.max(axis=1)
                            classes = class_scores.argmax(axis=1).astype(int)
            elif isinstance(outputs, (list, tuple)) and len(outputs) >= 3:
                boxes, scores, classes = outputs[0], outputs[1], outputs[2]
            elif isinstance(outputs, np.ndarray):
                # Unsupported ndarray format
                return detections

            if boxes is None or scores is None:
                return detections

            if hasattr(boxes, "numpy"):
                boxes = boxes.numpy()
            if hasattr(scores, "numpy"):
                scores = scores.numpy()
            if hasattr(classes, "numpy"):
                classes = classes.numpy()
            classes = (
                np.zeros(len(scores), dtype=int)
                if classes is None
                else np.asarray(classes).astype(int)
            )

        boxes = np.asarray(boxes)
        scores = np.asarray(scores).reshape(-1)
        classes = np.asarray(classes).reshape(-1).astype(int)

        if boxes.shape[0] == 0 or scores.shape[0] == 0:
            return detections

        # Keep only confident detections
        mask = scores >= confidence_threshold
        boxes = boxes[mask]
        scores = scores[mask]
        classes = classes[mask]

        if boxes.shape[0] == 0:
            return detections

        orig_h, orig_w = original_shape[:2]
        target_h, target_w = 608, 608

        for i, box in enumerate(boxes):
            # custom model returns [y1,x1,y2,x2] normalized
            if np.max(np.abs(box)) <= 1.5:
                y1, x1, y2, x2 = box
                # If invalid, assume [x1,y1,x2,y2]
                if x2 <= x1 or y2 <= y1:
                    x1, y1, x2, y2 = box
                x1 = int(x1 * orig_w)
                y1 = int(y1 * orig_h)
                x2 = int(x2 * orig_w)
                y2 = int(y2 * orig_h)
            else:
                # absolute coords on 608 input, same [y1,x1,y2,x2] ordering
                y1, x1, y2, x2 = box
                if x2 <= x1 or y2 <= y1:
                    x1, y1, x2, y2 = box
                x1 = int(x1 * (orig_w / target_w))
                y1 = int(y1 * (orig_h / target_h))
                x2 = int(x2 * (orig_w / target_w))
                y2 = int(y2 * (orig_h / target_h))

            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(orig_w - 1, x2), min(orig_h - 1, y2)
            if x2 <= x1 or y2 <= y1:
                continue

            detections.append(
                {
                    "box": [x1, y1, x2, y2],
                    "confidence": float(scores[i]),
                    "class_id": int(classes[i]),
                }
            )

    except Exception as e:
        log.error("Error postprocessing outputs: %s", e)

    return detections


def _draw_bbox_simple(image, boxes, scores, classes):
    """Draw bounding boxes on image."""
    if boxes is None or len(boxes) == 0:
        return image

    out = image.copy()
    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = [int(v) for v in box]
        cv2.rectangle(out, (x1, y1), (x2, y2), (0, 0, 255), 2)

        # Draw label
        if scores is not None and i < len(scores):
            label = f"Weapon: {scores[i]:.2f}"
            cv2.putText(
                out, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2
            )

    return out


def inference_images_weapon(
    image_mask1,
    video_name,
    frame_num,
    model_name=None,
    compute_device="cpu",
    confidence_threshold=0.3,
    debug=None,
):
    """
    Keras weapon inference function.

    Returns: (image2, start_time, end_time, scores, classes, boxes)
    """
    start_time = time.time()
    end_time = time.time()
    image2 = image_mask1.copy()
    out_scores = np.zeros((1, 0), dtype=np.float32)
    out_classes = np.zeros((1, 0), dtype=np.float32)
    out_boxes = np.zeros((0, 4), dtype=np.float32)  # Add boxes return

    try:
        model = _get_keras_model(model_name)
        if model is None:
            log.error("No Keras model available for inference")
            return (image2, start_time, end_time, out_scores, out_classes)

        # Preprocess image - try float32 [0,1] first (standard)
        input_tensor = _preprocess_image(image_mask1)

        # Run inference
        # Set device
        import tensorflow as tf

        if compute_device.lower() == "cuda" or compute_device.lower().startswith(
            "cuda:"
        ):
            gpus = tf.config.list_physical_devices("GPU")
            if gpus:
                log.info("Using GPU for Keras inference")
            else:
                log.warning("GPU requested but not available, using CPU")

        # Run inference through serving signature when available.
        # Some SavedModels return richer detections only via serving_default.
        serving_fn = None
        try:
            serving_fn = model.signatures.get("serving_default")
        except Exception:
            serving_fn = None

        if serving_fn is not None:
            predictions = serving_fn(tf.convert_to_tensor(input_tensor))
        else:
            predictions = model(input_tensor, training=False)

        # Note: uint8 retry was removed because the model does NOT support uint8 input.
        # The model expects float32 [0,1] input format. When it returns 0 detections,
        # this is normal behavior for frames without weapons - we just continue processing.
        # Some frames will have detections (as confirmed by test_models.py showing 2/21 frames with detections).

        # Handle different model output formats
        if hasattr(predictions, "numpy"):
            predictions = predictions.numpy()
        if isinstance(debug, dict):
            debug["keras_input_shape"] = list(input_tensor.shape)
            debug["keras_confidence_threshold"] = float(confidence_threshold)
            debug["keras_predictions_type"] = str(type(predictions))
            if isinstance(predictions, dict):
                debug["keras_output_keys"] = list(predictions.keys())
                shapes = {}
                stats = {}
                for k, v in predictions.items():
                    try:
                        arr = np.asarray(v)
                        shapes[k] = list(arr.shape)
                        stats[k] = {
                            "min": float(np.min(arr)) if arr.size else None,
                            "max": float(np.max(arr)) if arr.size else None,
                        }
                    except Exception:
                        shapes[k] = None
                        stats[k] = None
                debug["keras_output_shapes"] = shapes
                debug["keras_output_stats"] = stats
            else:
                try:
                    arr = np.asarray(predictions)
                    debug["keras_output_shape"] = list(arr.shape)
                    debug["keras_output_stats"] = {
                        "min": float(np.min(arr)) if arr.size else None,
                        "max": float(np.max(arr)) if arr.size else None,
                    }
                except Exception:
                    debug["keras_output_shape"] = None

        # Post-process outputs
        detections = _postprocess_outputs(
            predictions, image_mask1.shape, confidence_threshold
        )

        end_time = time.time()

        if detections:
            boxes = np.array([d["box"] for d in detections], dtype=np.float32)
            scores = np.array([d["confidence"] for d in detections], dtype=np.float32)
            classes = np.array([d["class_id"] for d in detections], dtype=np.float32)

            out_boxes = boxes.reshape(-1, 4).astype(np.float32)
            out_scores = scores.reshape(1, -1).astype(np.float32)
            out_classes = classes.reshape(1, -1).astype(np.float32)

            # Draw boxes on image
            image2 = _draw_bbox_simple(
                image_mask1.copy(), out_boxes, out_scores[0], out_classes[0]
            )

            log.info("Keras inference finished, detections: %s", len(detections))
            if isinstance(debug, dict):
                debug["keras_detections"] = len(detections)
        else:
            log.info("Keras inference finished, no detections")
            if isinstance(debug, dict):
                debug["keras_detections"] = 0

    except Exception as exc:
        log.error("Keras inference exception: %s", exc)

    return (image2, start_time, end_time, out_scores, out_classes, out_boxes)
