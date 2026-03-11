"""Test all weapon models with the test video"""

import cv2
from ultralytics import YOLO
import sys

VIDEO_PATH = "videos/uploads/11/5825915780297924415.mp4"

MODELS = {
    "epoch30": "wepapp/weaponresource/epoch30.pt",
    "weapon_yolo": "wepapp/weaponresource/weapon_yolo.pt",
    "yolov8n": "yolov8n.pt",
}


def test_model(model_name, model_path):
    print(f"\n{'='*60}")
    print(f"Testing: {model_name}")
    print(f"Path: {model_path}")
    print(f"{'='*60}")

    try:
        model = YOLO(model_path)
        print(f"Classes: {model.names}")

        cap = cv2.VideoCapture(VIDEO_PATH)
        if not cap.isOpened():
            print(f"ERROR: Cannot open video")
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        print(f"Video: {total_frames} frames, {fps:.2f} FPS")

        detections_count = 0
        frames_with_detection = []

        # Sample frames
        step = max(1, total_frames // 20)  # Sample ~20 frames

        for frame_idx in range(0, total_frames, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                continue

            results = model(frame, conf=0.01, verbose=False)
            n = len(results[0].boxes)

            if n > 0:
                detections_count += 1
                for box in results[0].boxes:
                    cls = model.names[int(box.cls)]
                    conf = float(box.conf)
                    frames_with_detection.append(
                        f"  Frame {frame_idx}: {cls} ({conf:.2f})"
                    )

        cap.release()

        print(f"Frames sampled: {total_frames // step + 1}")
        print(f"Frames with detection: {detections_count}")

        if frames_with_detection:
            print("Detections:")
            for d in frames_with_detection[:10]:  # Show first 10
                print(d)
            if len(frames_with_detection) > 10:
                print(f"  ... and {len(frames_with_detection) - 10} more")
        else:
            print("NO WEAPONS DETECTED!")

    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    print("Testing all weapon models...")
    print(f"Video: {VIDEO_PATH}")

    for name, path in MODELS.items():
        test_model(name, path)
