"use client";

import React from "react";

/**
 * SortDropdown Component
 * Dropdown selector for sorting options
 */
export default function SortDropdown({
  value = "timestamp_desc",
  onChange,
  className = "",
}) {
  const sortOptions = [
    { value: "timestamp_desc", label: "Newest First" },
    { value: "timestamp_asc", label: "Oldest First" },
    { value: "weapon_count_desc", label: "Most Weapons" },
    { value: "weapon_count_asc", label: "Least Weapons" },
  ];

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
