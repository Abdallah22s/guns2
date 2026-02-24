#!/usr/bin/env python3
"""اختبار سريع لاستدلال YOLOv8."""
import sys
import os
import numpy as np
import argparse
import logging

# Initialize logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.chdir(os.path.join(root, "wepapp"))
sys.path.insert(0, os.path.join(root, "wepapp"))

def main():
    parser = argparse.ArgumentParser(description="Test YOLOv8 with a video file.")
    parser.add_argument('--video', type=str, help='Path to the video file', required=True)
    args = parser.parse_args()

    # Load the video file
    video_path = args.video
    if not os.path.exists(video_path):
        log.error(f"File does not exist: {video_path}")
        return 1

    # Process the video file
    log.info(f"Processing video: {video_path}")
    # اختبار Ultralytics مباشرة
    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    results = model(frame, conf=0.3, verbose=False)
    print("Ultralytics YOLOv8 direct test OK, results:", len(results))

    # اختبار موديول الاستدلال (يتطلب cfg)
    import wepcore.setup as cfg
    cfg.weights_weapon = "yolov8n.pt"
    cfg.score_weapon = 0.3
    from wepcore.inference_images_weapon_yolov8 import inference_images_weapon
    out = inference_images_weapon(frame, "test", 1)
    image2, start, end, scores, classes = out
    assert image2.shape == frame.shape
    assert scores.shape[0] == 1
    print("YOLOv8 inference module OK. Scores shape:", scores.shape, "Classes shape:", classes.shape)
    return 0

if __name__ == "__main__":
    sys.exit(main())
