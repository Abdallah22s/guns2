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
    log.info("TensorFlow weapon model detected - using custom weapon detection model")
else:
    log.warning("TensorFlow weapon model not found!")


def inference_images_weapon(
    image_mask1,
    video_name,
    frame_num,
    model_name="yolov8n",
    compute_device="cpu",
):
    """Weapon inference using custom TensorFlow model.

    Returns: (image2, start_time, end_time, scores, classes)
    """

    # Use Keras/TensorFlow weapon model if available
    if _WEAPON_MODEL_AVAILABLE:
        from wepcore.inference_images_weapon_keras import (
            inference_images_weapon as keras_infer,
        )

        return keras_infer(
            image_mask1,
            video_name,
            frame_num,
            model_name="WeaponOct24_608_8K",
            compute_device=compute_device,
        )

    # Fallback to YOLOv8 (not recommended - not trained for weapons!)
    log.warning(
        "Falling back to YOLOv8 - this model is NOT trained for weapon detection!"
    )
    from wepcore.inference_images_weapon_yolov8 import (
        inference_images_weapon as yolov8_infer,
    )

    return yolov8_infer(
        image_mask1,
        video_name,
        frame_num,
        model_name="yolov8n",
        compute_device=compute_device,
    )
