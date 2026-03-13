"""Test all weapon models with the test video"""

import cv2
from ultralytics import YOLO

VIDEO_PATH = "videos/uploads/11/5825915780297924415.mp4"

MODELS = {
    "epoch30": ("wepapp/weaponresource/epoch30.pt", "pistol, knife"),
    "hadi_yolov8": ("wepapp/weaponresource/hadi_yolov8.pt", "pistol, knife"),
    "threat_yolov8n": (
        "wepapp/weaponresource/threat_yolov8n.pt",
        "Gun, explosion, grenade, knife",
    ),
    "firearm_yolov8n": ("wepapp/weaponresource/firearm_yolov8n.pt", "Gun"),
    "weapon_yolo": (
        "wepapp/weaponresource/weapon_yolo.pt",
        "Gun, explosion, grenade, knife",
    ),
}


def test_model(model_name, model_path, classes):
    print(f"\n{'='*60}")
    print(f"Model: {model_name}")
    print(f"Classes: {classes}")
    print(f"{'='*60}")

    try:
        model = YOLO(model_path)

        cap = cv2.VideoCapture(VIDEO_PATH)
        if not cap.isOpened():
            print(f"ERROR: Cannot open video")
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Sample frames
        step = max(1, total_frames // 15)  # Sample ~15 frames

        total_detections = 0
        frames_with_weapon = 0

        for frame_idx in range(0, total_frames, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                continue

            results = model(frame, conf=0.3, verbose=False)
            n = len(results[0].boxes)

            if n > 0:
                frames_with_weapon += 1
                total_detections += n
                print(f"  Frame {frame_idx}: {n} detections")
                for box in results[0].boxes:
                    cls = model.names[int(box.cls)]
                    conf = float(box.conf)
                    print(f"    - {cls} ({conf:.2f})")

        cap.release()

        print(f"\nTotal frames sampled: {total_frames // step + 1}")
        print(f"Frames with weapon: {frames_with_weapon}")
        print(f"Total detections: {total_detections}")

        if frames_with_weapon == 0:
            print("❌ NO WEAPONS DETECTED!")
        else:
            print("✅ WEAPON DETECTED!")

    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("TESTING ALL WEAPON MODELS")
    print("Video: 5825915780297924415.mp4")
    print("=" * 60)

    for name, (path, classes) in MODELS.items():
        test_model(name, path, classes)
