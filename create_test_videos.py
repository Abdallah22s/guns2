#!/usr/bin/env python3
"""
Script to generate test videos with simulated weapon detection
"""
import cv2
import numpy as np
import os

def create_test_video_with_weapon(duration=30, fps=30, output_path="sample_videos/weapon_test_1.mp4"):
    """Create a test video with simulated weapon detection"""
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Video properties
    width, height = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Generate frames
    total_frames = duration * fps
    
    for i in range(total_frames):
        # Create a background
        frame = np.random.randint(0, 50, (height, width, 3), dtype=np.uint8)
        
        # Add some simulated objects
        if i % (fps * 5) == 0:  # Every 5 seconds
            # Draw a rectangle to simulate a weapon
            cv2.rectangle(frame, (200, 200), (400, 250), (0, 255, 0), 2)
            cv2.putText(frame, "WEAPON", (250, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Add timestamp
        timestamp = f"Frame: {i}/{total_frames}"
        cv2.putText(frame, timestamp, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        out.write(frame)
    
    out.release()
    print(f"Created test video: {output_path}")

def create_multiple_test_videos():
    """Create multiple test videos with different durations"""
    
    videos = [
        ("sample_videos/weapon_test_1.mp4", 30),
        ("sample_videos/weapon_test_2.mp4", 45),
        ("sample_videos/weapon_test_3.mp4", 60),
        ("sample_videos/weapon_test_4.mp4", 35),
        ("sample_videos/weapon_test_5.mp4", 50),
        ("sample_videos/weapon_test_6.mp4", 40),
        ("sample_videos/weapon_test_7.mp4", 55),
        ("sample_videos/weapon_test_8.mp4", 65),
        ("sample_videos/weapon_test_9.mp4", 70),
        ("sample_videos/weapon_test_10.mp4", 90),
    ]
    
    for video_path, duration in videos:
        create_test_video_with_weapon(duration=duration, output_path=video_path)

if __name__ == "__main__":
    create_multiple_test_videos()
    print("All test videos created successfully!")
