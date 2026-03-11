"use client";

import { API_URL, PUBLIC_URL, routerBase } from "@/app/config/config";
import { useGlobalContext } from "@/app/context/store";
import { useTranslations } from "@/app/translations";
import axios from "axios";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import ModelSelector from "@/app/components/ModelSelector";

export default function AddVideoPage() {
  const { isRTL } = useGlobalContext();
  const t = useTranslations(isRTL);
  const [cameras, setCameras] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideoLink, setUploadedVideoLink] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanMsg, setScanMsg] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanEtaSeconds, setScanEtaSeconds] = useState(null);
  const [computeDevice, setComputeDevice] = useState("gpu");
  const [gpuAvailable, setGpuAvailable] = useState(true);
  const [selectedModel, setSelectedModel] = useState("yolov8n");
  const [snapshotIntervalSeconds, setSnapshotIntervalSeconds] = useState(1);
  const [scanVideoName, setScanVideoName] = useState("");
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [debugInference, setDebugInference] = useState(false);
  const scanPollRef = useRef(null);

  const stopPolling = () => {
    if (scanPollRef.current) {
      clearInterval(scanPollRef.current);
      scanPollRef.current = null;
    }
  };

  const formatEta = (seconds) => {
    if (seconds === null || seconds === undefined || Number.isNaN(seconds))
      return "-";
    const s = Math.max(0, Number(seconds));
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  useEffect(() => {
    axios
      .get(API_URL + "/camera/cameras")
      .then((response) => {
        setCameras(response.data || []);
      })
      .catch((error) => {
        console.error("Error loading cameras for video page:", error);
      });

    axios
      .get(API_URL + "/camera/cameras/compute-capabilities")
      .then((response) => {
        setGpuAvailable(Boolean(response?.data?.gpu_available));
      })
      .catch(() => {
        setGpuAvailable(true);
      });
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadMsg("");
    setScanResult(null);
    setScanMsg("");
    setScanProgress(0);
    setScanEtaSeconds(null);
    stopPolling();
    try {
      const data = new FormData();
      data.append("video", selectedFile);
      const response = await axios.post(
        API_URL + "/camera/cameras/upload-video",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      const uploadedPath = response?.data?.video_link || "";
      setUploadedVideoLink(uploadedPath);
      setUploadMsg(t("uploadSuccess"));
    } catch (error) {
      console.error("Upload failed in add video page:", error);
      setUploadMsg(t("uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleScanUploadedVideo = async () => {
    if (!uploadedVideoLink) return;
    if (computeDevice === "gpu" && !gpuAvailable) {
      setScanMsg("GPU is unavailable. Switch to CPU before processing.");
      return;
    }
    if (!scanVideoName.trim()) {
      setScanMsg("Please enter a video name before scanning.");
      return;
    }
    setIsScanning(true);
    setScanResult(null);
    setScanProgress(0);
    setScanEtaSeconds(null);
    setScanMsg(t("processingVideoPleaseWait"));
    stopPolling();
    try {
          const startResponse = await axios.post(
        API_URL + "/camera/cameras/scan-video/start",
        {
          video_link: uploadedVideoLink,
          // Let backend derive frame sampling from selected snapshot interval
          // to avoid forcing a low-capture mode at all times.
          frame_skip_size: null,
          confidence_threshold: 0.01,
          compute_device: computeDevice,
          model: selectedModel,
          snapshot_interval_seconds: Number(snapshotIntervalSeconds) || 1,
          min_weapon_images: 3,
          max_weapon_images: 5,
          capture_name: scanVideoName.trim(),
          debug_inference: debugInference,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const jobId = startResponse?.data?.job_id;
      if (!jobId) {
        throw new Error("Missing scan job id");
      }

      scanPollRef.current = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            API_URL + "/camera/cameras/scan-video/status/" + jobId,
          );
          const status = statusResponse?.data || {};
          setScanProgress(status.progress || 0);
          setScanEtaSeconds(status.eta_seconds);
          if (status.status === "running") {
            setScanMsg(status.message || t("processingVideoPleaseWait"));
          }
          if (status.status === "completed" || status.status === "failed") {
            stopPolling();
            setScanResult(status);
            if (status.status === "failed") {
              setScanMsg(t("videoScanFailed"));
            } else if (status.weapon_found) {
              setScanMsg(t("weaponFoundInVideo"));
            } else {
              setScanMsg(t("noWeaponFoundInVideo"));
            }
            setIsScanning(false);
          }
        } catch (pollError) {
          console.error("Scan status polling failed:", pollError);
          stopPolling();
          setScanMsg(t("videoScanFailed"));
          setIsScanning(false);
        }
      }, 1000);
    } catch (error) {
      console.error("Video scan failed:", error);
      stopPolling();
      setScanMsg(t("videoScanFailed"));
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const resultImages = Array.isArray(scanResult?.weapon_images)
    ? scanResult.weapon_images.filter(
        (name) => typeof name === "string" && name.startsWith("weapon_"),
      )
    : [];

  return (
    <div className="px-4 md:px-0">
      <div className="container px-2 md:px-8 mt-6 md:mt-8">
        <h1 className="text-3xl py-2 font-semibold">{t("addVideoTitle")}</h1>
        <p className="text-black-600 mb-6 text-sm md:text-base">
          {t("selectCameraForVideo")}
        </p>

        <div className="mb-6 bg-white rounded-md p-4 md:p-6 shadow-sm ring-1 ring-inset ring-gray-200">
          <label
            htmlFor="video_file_global"
            className="block text-sm font-semibold leading-6 text-black-600"
          >
            {t("selectVideoFile")}
          </label>
          <div className="mt-2.5 flex flex-col md:flex-row gap-3">
            <input
              id="video_file_global"
              type="file"
              accept="video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full rounded-md border-0 px-3.5 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="rounded-md bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black-600 disabled:opacity-50"
            >
              {isUploading ? t("uploading") : t("uploadVideoFromComputer")}
            </button>
            <button
              type="button"
              onClick={handleScanUploadedVideo}
              disabled={!uploadedVideoLink || isScanning}
              className="rounded-md bg-red px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:opacity-50"
            >
              {isScanning
                ? t("processingVideoPleaseWait")
                : t("scanUploadedVideo")}
            </button>
          </div>
          <div className="mt-2">
            <label className="block text-xs font-semibold text-black-600 mb-1">
              {t("videoName")}
            </label>
            <input
              type="text"
              value={scanVideoName}
              onChange={(e) => setScanVideoName(e.target.value)}
              placeholder={
                isRTL
                  ? "أدخل اسماً فريداً لهذا الفحص"
                  : "Enter a unique name for this scan"
              }
              dir="auto"
              className="block w-full rounded-md border-0 px-3.5 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModel}
                isRTL={isRTL}
              />
            </div>
            <div>
              <label
                htmlFor="compute_device"
                className="block text-xs font-semibold text-black-600 mb-1"
              >
                {t("computeDevice")}
              </label>
              <select
                id="compute_device"
                value={computeDevice}
                onChange={(e) => setComputeDevice(e.target.value)}
                className="block w-full rounded-md border-0 px-3.5 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
              >
                <option value="gpu">{t("scanWithGpu")}</option>
                <option value="cpu">{t("scanWithCpu")}</option>
              </select>
              {computeDevice === "gpu" && !gpuAvailable ? (
                <p className="mt-2 text-sm font-semibold text-red">
                  GPU is unavailable. Processing will run on CPU.
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-xs font-semibold text-black-600 mb-1">
                {t("weaponSnapshotInterval")}
              </label>
              <select
                value={snapshotIntervalSeconds}
                onChange={(e) =>
                  setSnapshotIntervalSeconds(Number(e.target.value))
                }
                className="block w-full rounded-md border-0 px-3.5 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
              >
                {[1, 3, 5, 7, 10, 30, 60].map((v) => (
                  <option key={v} value={v}>
                    {v}s
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="debug_inference"
                type="checkbox"
                checked={debugInference}
                onChange={(e) => setDebugInference(e.target.checked)}
                className="h-4 w-4"
              />
              <label
                htmlFor="debug_inference"
                className="text-xs font-semibold text-black-600"
              >
                {isRTL ? t("enableDebugInference") : t("enableDebugInference")}
              </label>
            </div>
          </div>
          {uploadMsg ? (
            <p className="mt-2 text-sm text-black-600">{uploadMsg}</p>
          ) : null}
          {uploadedVideoLink ? (
            <p className="mt-2 text-xs text-black-600 break-all">
              {t("uploadedVideoPath")}: {uploadedVideoLink}
            </p>
          ) : null}
          {scanMsg ? (
            <div className="mt-3 rounded-md border border-gray-300 bg-black-100 px-3 py-2 text-sm text-black">
              {scanMsg}
              {scanResult?.model_used ? (
                <div className="mt-2 text-xs text-black-600">
                  {isRTL ? "النموذج المستخدم" : "Model used"}:{" "}
                  {scanResult.model_used}
                </div>
              ) : null}
              {scanResult?.debug_inference ? (
                <div className="mt-1 text-xs text-black-600">
                  {isRTL ? "تم تشغيل التشخيص" : "Debug inference enabled"}
                </div>
              ) : null}
              {scanResult?.debug_path ? (
                <div className="mt-1 text-xs text-black-600 break-all">
                  {isRTL ? "ملف التشخيص" : "Debug file"}:{" "}
                  {scanResult.debug_path}
                </div>
              ) : null}
              {isScanning ? (
                <div className="mt-2">
                  <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                    <div
                      className="h-2 bg-red transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, scanProgress))}%`,
                      }}
                    />
                  </div>
                  <span className="block mt-1 text-xs">
                    {t("scanProgress")}: {scanProgress}%
                  </span>
                  <span className="block mt-1 text-xs font-semibold">
                    {t("remainingTime")}: {formatEta(scanEtaSeconds)}
                  </span>
                </div>
              ) : null}
              {scanResult && scanResult.weapon_found ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs">
                    {t("detectedImagesCount")}:{" "}
                    {scanResult.weapon_images_count || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowResultsModal(true)}
                    className="rounded-md bg-black px-2.5 py-1 text-xs font-semibold text-white hover:bg-black-600"
                  >
                    {t("show")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cameras.map((cam) => (
            <li
              key={cam.id}
              className="bg-white drop-shadow-md p-4 rounded-md ring-1 ring-inset ring-gray-200"
            >
              <div className="font-semibold text-lg">{cam.name}</div>
              <div className="text-sm text-black-600">
                {cam.location || "-"}
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link
                  href={
                    uploadedVideoLink
                      ? `${routerBase}dashboard/cameras/video/${cam.id}?video_type=mp4&video_link=${encodeURIComponent(uploadedVideoLink)}`
                      : routerBase + "dashboard/cameras/video/" + cam.id
                  }
                  className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-black-600"
                >
                  {t("addVideo")}
                </Link>
                <Link
                  href={routerBase + "dashboard/cameras/" + cam.id}
                  className="flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold border-2 leading-6 text-black shadow-sm hover:bg-black-600"
                >
                  {t("back")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showResultsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-5xl rounded-lg bg-white shadow-xl ring-1 ring-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm md:text-base font-semibold">
                {t("detectedImagesCount")}:{" "}
                {scanResult?.weapon_images_count || 0}
              </h3>
              <button
                type="button"
                onClick={() => setShowResultsModal(false)}
                className="rounded-md bg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
              >
                {t("close")}
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              {resultImages.length === 0 ? (
                <p className="text-sm text-black-600">
                  {t("noWeaponDetected")}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {resultImages.map((imgName) => (
                    <div
                      key={imgName}
                      className="rounded-md border border-gray-200 overflow-hidden bg-black-100"
                    >
                      <img
                        src={`${PUBLIC_URL}/${scanResult?.scan_name}/${imgName}`}
                        alt={imgName}
                        className="w-full h-48 object-cover"
                      />
                      <div className="px-2 py-1 text-xs text-black-600">
                        {imgName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
