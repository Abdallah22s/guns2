"use client";
import { useEffect, useState } from "react";
import { InputField } from "./InputFiled";
import { API_URL, routerBase } from "../config/config";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGlobalContext } from "../context/store";
import { useTranslations } from "../translations";

function EditCameraForm({ camId }) {
  const router = useRouter();
  const { isRTL } = useGlobalContext();
  const t = useTranslations(isRTL);

  const [formData, setFormData] = useState({
    video_type: "",
    link: "",
    name: "",
    location: "",
    address: "",
    frame_skip_size: 100,
    lat: "",
    long: "",
  });
  const [updateformData, setupdateFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const link_types = ["mp4", "rtsp", "HLS"];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = isRTL
        ? "الاسم مطلوب. مثال: الكاميرا الأمامية"
        : "Name is required. Example: Front Camera";
    }

    if (
      formData.lat &&
      formData.lat.trim() &&
      isNaN(parseFloat(formData.lat))
    ) {
      newErrors.lat = isRTL
        ? "خط العرض يجب أن يكون رقماً. مثال: 24.7136"
        : "Latitude must be a number. Example: 24.7136";
    }

    if (
      formData.long &&
      formData.long.trim() &&
      isNaN(parseFloat(formData.long))
    ) {
      newErrors.long = isRTL
        ? "خط الطول يجب أن يكون رقماً. مثال: 46.6753"
        : "Longitude must be a number. Example: 46.6753";
    }

    // Validate latitude range
    if (
      formData.lat &&
      formData.lat.trim() &&
      !isNaN(parseFloat(formData.lat))
    ) {
      const lat = parseFloat(formData.lat);
      if (lat < -90 || lat > 90) {
        newErrors.lat = isRTL
          ? "خط العرض يجب أن يكون بين -90 و 90. مثال: 24.7136"
          : "Latitude must be between -90 and 90. Example: 24.7136";
      }
    }

    // Validate longitude range
    if (
      formData.long &&
      formData.long.trim() &&
      !isNaN(parseFloat(formData.long))
    ) {
      const long = parseFloat(formData.long);
      if (long < -180 || long > 180) {
        newErrors.long = isRTL
          ? "خط الطول يجب أن يكون بين -180 و 180. مثال: 46.6753"
          : "Longitude must be between -180 and 180. Example: 46.6753";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setupdateFormData({
      ...updateformData,
      [name]: value,
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.put(
        API_URL + "/camera/cameras/update/" + camId,
        JSON.stringify({ updated_fields: updateformData }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 200) {
        console.log("Form submitted successfully");
        router.push("/dashboard/cameras/" + camId);
      } else {
        const errorData = await response.json();
        setErrors({
          submit:
            errorData.message ||
            (isRTL ? "فشل في تحديث الكاميرا" : "Failed to update camera"),
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setErrors({
        submit: isRTL ? "حدث خطأ في الإرسال" : "Error submitting form",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    axios
      .get(API_URL + "/camera/cameras/" + camId)
      .then((response) => {
        console.log(response.data);
        const resData = response.data;
        setFormData(resData);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="py-4">
          <label
            htmlFor="video_type"
            className="block text-sm font-semibold leading-6 text-black-600"
          >
            {t("streamType")}
          </label>
          <select
            className="block w-full rounded-md border-0 px-3.5 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            id="video_type"
            name="video_type"
            value={formData.video_type}
            onChange={handleChange}
          >
            {link_types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="py-4">
          <InputField
            label={t("videoUrl")}
            type={"text"}
            id={"video_link"}
            name={"video_link"}
            value={formData.video_link}
            onchange={handleChange}
            dir="auto"
            placeholder={isRTL ? "rtsp://..." : "rtsp://..."}
          />
          <InputField
            label={t("name")}
            type={"text"}
            id={"name"}
            name={"name"}
            value={formData.name}
            onchange={handleChange}
            required={true}
            dir="auto"
            placeholder={isRTL ? "اسم الكاميرا" : "Camera name"}
            error={errors.name}
          />
          <InputField
            label={t("location")}
            type={"text"}
            id={"location"}
            name={"location"}
            value={formData.location}
            onchange={handleChange}
            dir="auto"
            placeholder={isRTL ? "الموقع" : "Location"}
          />
          <InputField
            label={t("address")}
            type={"text"}
            id={"address"}
            name={"address"}
            value={formData.address}
            onchange={handleChange}
            dir="auto"
            placeholder={isRTL ? "العنوان" : "Address"}
          />
          <div className="flex flex-warp py-4 gap-4 ">
            <InputField
              label={t("latitude")}
              type={"text"}
              id={"lat"}
              name={"lat"}
              value={formData.lat}
              onchange={handleChange}
              dir="auto"
              placeholder={isRTL ? "خط العرض" : "Latitude"}
              error={errors.lat}
            />
            <InputField
              label={t("longitude")}
              type={"text"}
              id={"long"}
              name={"long"}
              value={formData.long}
              onchange={handleChange}
              dir="auto"
              placeholder={isRTL ? "خط الطول" : "Longitude"}
              error={errors.long}
            />
          </div>
        </div>

        {/* Error message for form submission */}
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="py-4 flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex w-full justify-center rounded-md bg-black px-3 py-3.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-black-600 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? t("loading") : t("updateCamera")}
          </button>
          <Link
            href={"/app/dashboard/cameras"}
            className="flex w-full justify-center rounded-md bg-white px-3 py-3.5 text-sm font-semibold border-2 leading-6 text-black shadow-sm hover:bg-black-600 "
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default EditCameraForm;
