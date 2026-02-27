import React, { useMemo, useState } from "react";
import { API_URL, PUBLIC_URL } from "@/app/config/config";
import { useGlobalContext } from "@/app/context/store";
import { useTranslations } from "@/app/translations";
import axios from "axios";

const parseWeaponImages = (item) => {
  const raw = item?.weapon_images;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return item?.image_path ? [item.image_path] : [];
};

function DataTable({ data, itemsPerPage }) {
  const { isRTL } = useGlobalContext();
  const t = useTranslations(isRTL);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [rows, setRows] = useState(data);

  React.useEffect(() => {
    setRows(data);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return rows.slice(startIndex, endIndex);
  }, [currentPage, itemsPerPage, rows]);

  const handleDeleteAlert = async (eventId) => {
    try {
      await axios.delete(API_URL + "/event/events/" + eventId);
      setRows((prev) => prev.filter((item) => item.id !== eventId));
      if (selectedAlert?.id === eventId) {
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  return (
    <div className="container mx-auto bg-white rounded-lg overflow-hidden">
      <h1 className="text-3xl py-2 font-semibold mb-8">
        {t("allAlertsTitle")}
      </h1>
      <table className="min-w-full divide-y border-2 border-gray divide-gray">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray text-left text-md leading-4 font-bold uppercase tracking-wider">
              {t("locationCol")}
            </th>
            <th className="px-6 py-3 bg-gray text-left text-md leading-4 font-bold uppercase tracking-wider">
              {t("statusCol")}
            </th>
            <th className="px-6 py-3 bg-gray text-left text-md leading-4 font-bold uppercase tracking-wider">
              {t("dateTimeCol")}
            </th>
            <th className="px-6 py-3 bg-gray text-left text-md leading-4 font-bold uppercase tracking-wider">
              {t("imageCol")}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentData.map((item, index) => {
            const images = parseWeaponImages(item);
            return (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-gray-light" : "bg-white"}
              >
                <td className="px-6 py-4 whitespace-no-wrap">
                  {item.video_name}
                </td>
                <td className="px-6 py-4 whitespace-no-wrap">{item.status}</td>
                <td className="px-6 py-4 whitespace-no-wrap">
                  {item.date_time}
                </td>
                <td className="px-6 py-4 whitespace-no-wrap flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAlert(item)}
                    className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black-600"
                  >
                    {t("show")} ({images.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(item.id)}
                    className="rounded-md bg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                  >
                    {t("delete")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="bg-white max-w-md px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={`px-4 py-2 text-sm leading-5 font-medium rounded-md ${
            currentPage === 1
              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
              : "text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
          }`}
        >
          {t("previous")}
        </button>
        <span className="text-sm leading-5 text-gray-700">
          {t("pageOf")} {currentPage} {t("of")} {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 text-sm leading-5 font-medium rounded-md ${
            currentPage === totalPages
              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
              : "text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
          }`}
        >
          {t("next")}
        </button>
      </div>

      {selectedAlert ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-5xl rounded-lg bg-white shadow-xl ring-1 ring-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm md:text-base font-semibold">
                {selectedAlert.video_name} - {t("imagesTitle")} (
                {parseWeaponImages(selectedAlert).length})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-md bg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
              >
                {t("close")}
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {parseWeaponImages(selectedAlert).map((imgName) => (
                  <div
                    key={imgName}
                    className="rounded-md border border-gray-200 overflow-hidden bg-black-100"
                  >
                    <img
                      src={`${PUBLIC_URL}/${selectedAlert.video_name}/${imgName}`}
                      alt={imgName}
                      className="w-full h-48 object-cover"
                    />
                    <div className="px-2 py-1 text-xs text-black-600">
                      {imgName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DataTable;
