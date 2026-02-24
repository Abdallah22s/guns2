"""
استدلال كشف الأسلحة باستخدام YOLOv8 (Ultralytics).
يُستخدم عندما framework = yolov8 في الإعداد.
"""
import os
import time
import logging as log
import cv2
import numpy as np
import wepcore.setup as cfg
import wepcore.utils as utils

log.info("YOLOv8 weapon inference module loaded")

_yolo_model = None
_selected_model = 'yolov9c'


def _get_model():
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
        except ImportError:
            raise ImportError("YOLOv8 يتطلب تثبيت: pip install ultralytics")
        
        # Use selected model if available, otherwise default
        model_name = _selected_model
        
        weights = getattr(cfg, "weights_weapon", None) or model_name
        
        if not os.path.isfile(weights) and not weights.endswith(".pt"):
            weights = model_name  # Use the model name directly (will auto-download)
        
        log.info("loading YOLO weapon model: %s", weights)
        _yolo_model = YOLO(weights)
        log.info("loaded YOLO weapon model")
    return _yolo_model


def inference_images_weapon(image_mask1, video_name, frame_num):
    """
    واجهة متوافقة مع inference_images_weapon (YOLOv4).
    المدخل: إطار BGR أو RGB.
    المخرج: (image2, start_time, end_time, scores, classes)
    حيث scores و classes مصفوفات numpy ذات شكل (1, N) لـ N كشف.
    """
    # Initialize default values to avoid undefined variable errors
    start_time = time.time()
    end_time = time.time()
    image2 = image_mask1.copy()
    out_scores = np.zeros((1, 0), dtype=np.float32)
    out_classes = np.zeros((1, 0), dtype=np.float32)
    
    try:
        log.info("started YOLOv8 weapon inference")
        model = _get_model()
        score_thr = getattr(cfg, "score_weapon", 0.3)

        # Ultralytics تتوقع BGR (كـ OpenCV)
        if image_mask1.shape[2] == 3:
            img_bgr = cv2.cvtColor(image_mask1, cv2.COLOR_RGB2BGR) if image_mask1.shape[2] == 3 else image_mask1
        else:
            img_bgr = image_mask1

        results = model(img_bgr, conf=score_thr, verbose=False)[0]

        end_time = time.time()

        # استخراج الصناديق والثقة والصنف
        boxes_xyxy = results.boxes.xyxy.cpu().numpy() if results.boxes.xyxy is not None else np.zeros((0, 4))
        confs = results.boxes.conf.cpu().numpy() if results.boxes.conf is not None else np.zeros(0)
        clss = results.boxes.cls.cpu().numpy().astype(int) if results.boxes.cls is not None else np.zeros(0, dtype=int)

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

        pred_bbox = (out_boxes, out_scores[0] if n else np.zeros(0), out_classes[0] if n else np.zeros(0, dtype=np.float32), valid_detections)

        # أسماء الأصناف من weapons.names (Gun, Knife, Rifle)
        class_names_path = os.path.join(os.path.dirname(__file__), "..", "wepdata", "classes", "weapons.names")
        if not os.path.isfile(class_names_path):
            class_names_path = "./wepdata/classes/weapons.names"
        if os.path.isfile(class_names_path):
            class_names = utils.read_class_names(class_names_path)
            allowed_classes = list(class_names.values())
        else:
            allowed_classes = ["Gun", "Knife", "Rifle"]

        image2 = utils.draw_bbox(
            image_mask1.copy(),
            pred_bbox,
            info=False,
            allowed_classes=allowed_classes,
        )

        log.info("Ended YOLOv8 weapon inference, detections: %s", valid_detections)
    except Exception as e:
        log.error("Process exception in YOLOv8 weapon inference: %s", e)
        # Variables already initialized with defaults above - use them
        # image2, end_time, out_scores, out_classes are already set
    
    # Return in YOLOv8 format: (image, start_time, end_time, scores, classes) with shape (1, N)
    return (image2, start_time, end_time, out_scores, out_classes)
