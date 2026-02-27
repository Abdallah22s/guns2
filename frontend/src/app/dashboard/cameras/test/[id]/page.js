"use client";

import { API_URL, PUBLIC_URL, routerBase } from "@/app/config/config";
import { useGlobalContext } from "@/app/context/store";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useTranslations } from "@/app/translations";

export default function TestCameraPage() {
  const [camData, setCamData] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { isRTL } = useGlobalContext();
  const t = useTranslations(isRTL);
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    axios
      .get(API_URL + "/camera/cameras/" + id)
      .then((response) => {
        console.log(response.data);
        setCamData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!camData) return;

    const updateImageUrl = () => {
      const newImageUrl =
        PUBLIC_URL +
        "/" +
        camData.name +
        "/live.jpg" +
        `?timestamp=${Date.now()}`;
      setImageUrl(newImageUrl);
    };

    updateImageUrl();
    const intervalId = setInterval(updateImageUrl, 1000);

    return () => clearInterval(intervalId);
  }, [camData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg
          className="w-10 h-10 text-blue-600 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (!camData) {
    return (
      <div className="container px-8 mt-8">
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900">
            Camera not found
          </h2>
          <Link
            href={routerBase + "dashboard/cameras"}
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Back to Cameras
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gray-900 ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={routerBase + "dashboard/cameras"}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                {isRTL ? "رجوع" : "Back"}
              </Link>
              <div className="h-6 w-px bg-gray-600"></div>
              <h1 className="text-xl font-bold text-white">{camData.name}</h1>
              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </span>
            </div>
            <div className="text-sm text-gray-400">{camData.location}</div>
          </div>
        </div>
      </div>

      {/* Video Stream */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Live Stream"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          )}
          {!imageUrl && (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500">No stream available</div>
            </div>
          )}
        </div>

        {/* Camera Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400">
              {isRTL ? "الموقع" : "Location"}
            </div>
            <div className="text-white font-medium">
              {camData.location || "-"}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400">
              {isRTL ? "رابط البث" : "Stream URL"}
            </div>
            <div className="text-white font-medium text-sm truncate">
              {camData.video_link}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400">
              {isRTL ? "نوع البث" : "Stream Type"}
            </div>
            <div className="text-white font-medium">
              {camData.video_type || "RTSP"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
