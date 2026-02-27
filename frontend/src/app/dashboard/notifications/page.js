"use client";

import { API_URL, PUBLIC_URL } from "@/app/config/config";
import { useGlobalContext } from "@/app/context/store";
import { useTranslations } from "@/app/translations";
import { getTimeDelay } from "@/app/utils/utils";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import SortDropdown from "@/app/components/SortDropdown";
import FullscreenImageModal from "@/app/components/FullscreenImageModal";
import AdvancedFilterPanel from "@/app/components/AdvancedFilterPanel";

// Helper function to extract video name only (remove scan_ and hash prefix)
const cleanVideoName = (videoName) => {
  if (!videoName) return "";
  let name = videoName.replace(/^scan_/, "");
  if (name.includes("_")) {
    const parts = name.split("_");
    return parts[parts.length - 1];
  }
  return name;
};

const parseWeaponImages = (item) => {
  const raw = item?.weapon_images;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return item?.image_path ? [item.image_path] : [];
};

const Notifications = () => {
  const { alerts, state } = useGlobalContext();
  const { isRTL } = useGlobalContext();
  const t = useTranslations(isRTL);

  const [data, setData] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const [sortValue, setSortValue] = useState("timestamp_desc");
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const isFetchingRef = React.useRef(false);
  const lastFetchRef = React.useRef(0);

  const handleDeleteAlert = async (eventId) => {
    try {
      await axios.delete(API_URL + "/event/events/" + eventId);
      setData((prev) => prev.filter((item) => item.id !== eventId));
      if (selectedAlert?.id === eventId) {
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  useEffect(() => {
    axios
      .get(API_URL + "/camera/cameras")
      .then((response) => setCameras(response.data))
      .catch((error) => console.error("Error fetching cameras:", error));
  }, []);

  const fetchEvents = async (sort = "timestamp_desc", filters = {}) => {
    const now = Date.now();
    if (isFetchingRef.current || now - lastFetchRef.current < 1000) return;

    isFetchingRef.current = true;
    lastFetchRef.current = now;
    setIsLoading(true);

    try {
      let url = "";
      if (Object.keys(filters).length > 0) {
        const params = new URLSearchParams();
        if (filters.q) params.append("q", filters.q);
        if (filters.start_date) params.append("start_date", filters.start_date);
        if (filters.end_date) params.append("end_date", filters.end_date);
        if (filters.camera_name) params.append("camera_name", filters.camera_name);
        url = `${API_URL}/event/events/filter?${params.toString()}`;
      } else {
        const [sortBy, order] = sort.split("_");
        url = `${API_URL}/event/events/sort?sort_by=${sortBy}&order=${order}`;
      }
      
      const response = await axios.get(url);
      const eventsData = response.data.results || response.data;
      setData(eventsData.slice(0, 12));
    } catch (error) {
      console.error("Error fetching events:", error);
      try {
        const fallbackResponse = await axios.get(`${API_URL}/event/events`);
        setData(fallbackResponse.data.slice(0, 12));
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchEvents(sortValue);
  }, [sortValue]);

  const handleApplyFilters = (filters) => {
    fetchEvents(sortValue, filters);
  };

  const handleClearFilters = () => {
    fetchEvents(sortValue);
  };

  const handleSortChange = (newSort) => {
    setSortValue(newSort);
  };

  const openFullscreen = (imageUrl, title) => {
    setFullscreenImage({ url: imageUrl, title });
  };

  const latestDbAlert = useMemo(() => (data.length > 0 ? data[0] : null), [data]);
  const latestImages = parseWeaponImages(latestDbAlert);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('threatNotifications')}</h1>
              <p className="text-sm text-gray-600 mt-1">{data.length} {t('eventsFound')}</p>
            </div>
            <div className="flex items-center gap-3">
              <SortDropdown value={sortValue} onChange={handleSortChange} />
            </div>
          </div>

          {/* Advanced Filter Panel */}
          <div className="mt-4">
            <AdvancedFilterPanel
              cameras={cameras}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              showSearch={true}
              showDateRange={true}
              showCameraFilter={true}
              searchPlaceholder={t('searchByVideoNameOrStatus')}
            />
          </div>
        </div>
      </div>

      {/* Latest Alert Banner */}
      {latestDbAlert || alerts.length !== 0 ? (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-2 text-red-800 font-semibold">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {t('weaponDetectedImmediateAttention')}
            </div>

            {latestDbAlert ? (
              <div className="mt-4 md:grid gap-4 grid-cols-2 bg-white rounded-lg shadow-sm p-4">
                <div
                  className="relative group cursor-pointer"
                  onClick={() =>
                    openFullscreen(
                      `${PUBLIC_URL}/${latestDbAlert.video_name}/${latestDbAlert.image_path}`,
                      latestDbAlert.video_name,
                    )
                  }
                >
                  <img
                    src={`${PUBLIC_URL}/${latestDbAlert.video_name}/${latestDbAlert.image_path}`}
                    alt="Latest threat detection"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="px-4 py-4">
                  <div className="font-semibold text-lg text-gray-900">
                    {latestDbAlert.date_time}
                  </div>
                  <div className="font-medium text-gray-700">
                    {cleanVideoName(latestDbAlert.video_name)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {t('status')}: {latestDbAlert.Threat_status}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAlert(latestDbAlert)}
                      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                    >
                      {t('show')} ({latestImages.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAlert(latestDbAlert.id)}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border-b border-green-200 px-4 py-4">
          <div className="max-w-7xl mx-auto text-center text-green-800 font-semibold flex items-center justify-center gap-2">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('noWeaponDetectedAllClear')}
          </div>
        </div>
      )}

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          {t('threatRecordings')}
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
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
        ) : data.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('noEventsFound')}
            </h3>
            <p className="text-gray-500">
              {t('noThreatEventsRecorded')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((item, key) => {
              const images = parseWeaponImages(item);
              return (
                <div
                  key={key}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div
                    className="relative group cursor-pointer h-40"
                    onClick={() =>
                      openFullscreen(
                        `${PUBLIC_URL}/${item.video_name}/${item.image_path}`,
                        item.video_name,
                      )
                    }
                  >
                    <img
                      src={`${PUBLIC_URL}/${item.video_name}/${item.image_path}`}
                      alt="Threat detection"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(item);
                        }}
                        className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
                      >
                        {t('show')} ({images.length})
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAlert(item.id);
                        }}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                      >
                        {t('delete')}
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                      {images.length} {t('weapons')}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-500">
                      {getTimeDelay(item.date_time)} {t('ago')}
                    </p>
                    <h5 className="font-semibold text-gray-900 mt-1 truncate">
                      {cleanVideoName(item.video_name)}
                    </h5>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Alert Modal */}
      {selectedAlert ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-5xl rounded-lg bg-white shadow-xl ring-1 ring-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                {cleanVideoName(selectedAlert.video_name)} - {t('imagesTitle')} (
                {parseWeaponImages(selectedAlert).length})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
              >
                {t('close')}
              </button>
            </div>
            <div className="overflow-auto p-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {parseWeaponImages(selectedAlert).map((imgName) => (
                  <div
                    key={imgName}
                    className="rounded-md border border-gray-200 overflow-hidden bg-gray-50 cursor-pointer group relative"
                    onClick={() =>
                      openFullscreen(
                        `${PUBLIC_URL}/${selectedAlert.video_name}/${imgName}`,
                        imgName,
                      )
                    }
                  >
                    <img
                      src={`${PUBLIC_URL}/${selectedAlert.video_name}/${imgName}`}
                      alt={imgName}
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </div>
                    <div className="px-2 py-1 text-xs text-gray-600 bg-white border-t border-gray-200 truncate">
                      {imgName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <FullscreenImageModal
          imageUrl={fullscreenImage.url}
          title={fullscreenImage.title}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </div>
  );
};

export default Notifications;
