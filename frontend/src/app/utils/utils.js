"use client";

export function getTimeDelay(DateTime) {
  // Return the date as-is to prevent infinite re-renders
  // The dynamic "time ago" calculation causes constant re-renders
  return DateTime || "";
}
