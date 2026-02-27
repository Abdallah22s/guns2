"use client";

import React, { useState } from "react";

/**
 * VideoCard Component
 * Displays video with fallback to image if video fails to load
 */
export default function VideoCard({ videoName, imagePath, onClick }) {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Try multiple possible video paths
  const videoUrls = [
    `/videos/uploads/${videoName}.mp4`,
    `/videos/uploads/${videoName}`,
    `/public/videos/uploads/${videoName}.mp4`,
  ];

  const imageUrl = imagePath
    ? `/public/${videoName}/${imagePath}`
    : `/public/${videoName}/frame_0.jpg`;

  const handleVideoError = (e) => {
    // Try next URL if available
    const currentIndex = videoUrls.findIndex(
      (url) => e.target.src.includes(url) || e.target.src.endsWith(url),
    );

    if (currentIndex < videoUrls.length - 1) {
      // Try next video URL
      return;
    }

    // All video URLs failed, show image
    setVideoError(true);
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
  };

  return (
    <div
      className="relative group cursor-pointer h-40 overflow-hidden rounded-t-lg"
      onClick={onClick}
    >
      {/* Show video if available and not errored */}
      {!videoError && (
        <video
          src={videoUrls[0]}
          className="w-full h-full object-cover"
          muted
          playsInline
          loop
          onError={handleVideoError}
          onLoadedData={handleVideoLoaded}
          autoPlay={false}
        />
      )}

      {/* Show image as fallback or if video errored */}
      <img
        src={imageUrl}
        alt="Media"
        className={`w-full h-full object-cover absolute inset-0 ${
          !videoError && videoLoaded ? "hidden" : "block"
        }`}
        onError={(e) => {
          e.target.style.display = "block";
        }}
      />

      {/* Play icon overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <svg
          className="w-12 h-12 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}
