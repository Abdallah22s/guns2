"use client";
import React from "react";

export function InputField({
  label,
  type,
  name,
  id,
  autoComplete,
  value,
  onchange,
  required,
  placeholder,
  dir,
  error,
}) {
  return (
    <div className="w-full mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-semibold leading-6 text-black-600"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-2.5">
        <input
          type={type}
          name={name}
          id={id}
          value={value}
          onChange={onchange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          dir={dir || "auto"}
          required={required}
          className={`block w-full rounded-md border-0 px-3.5 py-3 text-gray-900 shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${error ? "ring-red-300 focus:ring-red-500" : "ring-gray-300"}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
