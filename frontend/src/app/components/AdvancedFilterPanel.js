"use client";

import React, { useState } from "react";

/**
 * AdvancedFilterPanel Component - Unified, Professional, and Simple
 * Used across all pages with consistent filtering experience
 */
export default function AdvancedFilterPanel({
  cameras = [],
  onApplyFilters,
  onClearFilters,
  showSearch = true,
  showDateRange = true,
  showCameraFilter = true,
  searchPlaceholder = "Search...",
  className = "",
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    camera_name: "",
    status: "",
  });

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    const activeFilters = { ...filters };

    // Add search query if provided
    if (searchQuery.trim()) {
      activeFilters.q = searchQuery.trim();
    }

    // Remove empty values
    const cleanedFilters = Object.fromEntries(
      Object.entries(activeFilters).filter(([_, v]) => v !== ""),
    );

    onApplyFilters(cleanedFilters);
  };

  const handleClear = () => {
    setSearchQuery("");
    setFilters({
      start_date: "",
      end_date: "",
      camera_name: "",
      status: "",
    });
    onClearFilters();
  };

  const hasActiveFilters =
    searchQuery || Object.values(filters).some((v) => v !== "");

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== "",
  ).length;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}
    >
      {/* Main Search Bar */}
      {showSearch && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                placeholder={searchPlaceholder}
                className="block w-full px-4 py-2.5 pl-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
              />
              <svg
                className="absolute left-3.5 top-3 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Search Button */}
            <button
              onClick={handleApply}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              Search
            </button>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium flex items-center gap-2 ${
                isExpanded || hasActiveFilters
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Clear Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded Filter Options */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Camera Filter */}
            {showCameraFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Camera
                </label>
                <select
                  value={filters.camera_name}
                  onChange={(e) =>
                    handleFilterChange("camera_name", e.target.value)
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Cameras</option>
                  {cameras.map((camera) => (
                    <option key={camera.id || camera.name} value={camera.name}>
                      {camera.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Status</option>
                <option value="armed">Armed</option>
                <option value="disarmed">Disarmed</option>
                <option value="detected">Detected</option>
              </select>
            </div>

            {/* Start Date */}
            {showDateRange && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) =>
                      handleFilterChange("start_date", e.target.value)
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) =>
                      handleFilterChange("end_date", e.target.value)
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {/* Apply Button for Expanded Filters */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
