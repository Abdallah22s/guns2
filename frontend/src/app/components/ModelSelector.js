'use client'

/**
 * ModelSelector Component
 * YOLO model selector with available local weapon weights.
 */
export default function ModelSelector({
  value,
  onChange,
}) {
  const models = [
    { id: 'yolov9e', label: 'YOLOv9 Extra', description: 'Best accuracy', recommended: true },
    { id: 'yolo11m', label: 'YOLO11 Medium', description: 'High accuracy' },
    { id: 'yolov9c', label: 'YOLOv9 Compact', description: 'Balanced' },
    { id: 'yolov8x', label: 'YOLOv8 XLarge', description: 'Fast and accurate' },
    { id: 'yolov8n', label: 'YOLOv8 Nano', description: 'Fastest' },
  ]

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-3 text-gray-700">
        نماذج الذكاء الاصطناعي الداعمة لكشف السلاح | AI Models That Support Weapon Detection
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onChange(model.id)}
            className={`
              relative flex flex-col items-start p-3 rounded-lg border-2
              transition-all duration-200 ease-in-out text-left
              ${value === model.id
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }
            `}
          >
            {model.recommended && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                Recommended
              </div>
            )}

            <span className="font-semibold text-sm">{model.label}</span>
            <span className="text-xs mt-1 opacity-75">{model.description}</span>

            {value === model.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
