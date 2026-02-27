'use client'

import { API_URL, PUBLIC_URL } from '@/app/config/config'
import axios from 'axios'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

const parseWeaponImages = (item) => {
  const raw = item?.weapon_images
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return item?.image_path ? [item.image_path] : []
}

export default function NotificationDetails({ params }) {
  const [data, setData] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const { id } = params

  useEffect(() => {
    axios
      .get(API_URL + '/event/events/' + id)
      .then((response) => setData(response.data))
      .catch((error) => console.error('Error fetching data:', error))
  }, [id])

  const images = parseWeaponImages(data)

  return (
    <div>
      <div className='container px-8 mt-8'>
        <Link href={'/dashboard/notifications'}>
          <div className='flex font-semibold mb-8'>Back</div>
        </Link>
        {data ? (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pb-4'>
            <div>
              <img
                className='hover:drop-shadow-lg hover:shadow-black rounded'
                src={`${PUBLIC_URL}/${data.video_name}/${data.image_path}`}
                alt='alert preview'
              />
            </div>
            <div>
              <span className='font-semibold block mt-2'>{data.video_name}</span>
              <span className='block mt-2'>{data.date_time}</span>
              <span className='font-semibold block mt-2'>{data.status}</span>
              <button
                type='button'
                onClick={() => setShowModal(true)}
                className='mt-4 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black-600'
              >
                Show ({images.length})
              </button>
            </div>
          </div>
        ) : (
          ''
        )}
      </div>

      {showModal && data ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='w-full max-w-5xl rounded-lg bg-white shadow-xl ring-1 ring-gray-200'>
            <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3'>
              <h3 className='text-sm md:text-base font-semibold'>
                {data.video_name} - Images ({images.length})
              </h3>
              <button
                type='button'
                onClick={() => setShowModal(false)}
                className='rounded-md bg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-black'
              >
                Close
              </button>
            </div>
            <div className='max-h-[70vh] overflow-auto p-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'>
                {images.map((imgName) => (
                  <div key={imgName} className='rounded-md border border-gray-200 overflow-hidden bg-black-100'>
                    <img
                      src={`${PUBLIC_URL}/${data.video_name}/${imgName}`}
                      alt={imgName}
                      className='w-full h-48 object-cover'
                    />
                    <div className='px-2 py-1 text-xs text-black-600'>{imgName}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
