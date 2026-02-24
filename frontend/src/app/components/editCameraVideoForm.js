'use client'
import { useEffect, useState } from 'react'
import { InputField } from './InputFiled'
import { API_URL, routerBase } from '../config/config'
import axios from 'axios'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGlobalContext } from '../context/store'
import { useTranslations } from '../translations'

function EditCameraVideoForm({ camId }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isRTL } = useGlobalContext()
  const t = useTranslations(isRTL)
  const [formData, setFormData] = useState({
    video_type: 'mp4',
    video_link: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const linkTypes = ['mp4', 'rtsp', 'HLS']

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.put(
        API_URL + '/camera/cameras/update/' + camId,
        JSON.stringify({
          updated_fields: {
            video_type: formData.video_type,
            video_link: formData.video_link,
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.status === 200) {
        router.push(routerBase + 'dashboard/cameras/' + camId)
      }
    } catch (error) {
      console.error('Video update error:', error)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadMsg('')
    try {
      const data = new FormData()
      data.append('video', selectedFile)
      const response = await axios.post(API_URL + '/camera/cameras/upload-video', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      const uploadedPath = response?.data?.video_link || ''
      if (uploadedPath) {
        setFormData((prev) => ({
          ...prev,
          video_type: 'mp4',
          video_link: uploadedPath,
        }))
        setUploadMsg(t('uploadSuccess'))
      }
    } catch (error) {
      console.error('Video upload error:', error)
      setUploadMsg(t('uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    axios.get(API_URL + '/camera/cameras/' + camId)
      .then((response) => {
        setFormData({
          video_type: response.data.video_type || 'mp4',
          video_link: response.data.video_link || '',
        })
      })
      .catch((error) => {
        console.error('Error fetching camera for video update:', error)
      })
  }, [camId])

  useEffect(() => {
    const videoLink = searchParams.get('video_link')
    const videoType = searchParams.get('video_type')
    if (videoLink) {
      setFormData((prev) => ({
        ...prev,
        video_link: videoLink,
        video_type: videoType || prev.video_type || 'mp4',
      }))
    }
  }, [searchParams])

  return (
    <div className='max-w-xl'>
      <form onSubmit={handleSubmit}>
        <div className='py-4'>
          <label htmlFor='video_type' className='block text-sm font-semibold leading-6 text-black-600'>{t('streamType')}</label>
          <select
            className='block w-full rounded-md border-0 px-3.5 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6'
            id='video_type'
            name='video_type'
            value={formData.video_type}
            onChange={handleChange}
          >
            {linkTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className='py-4'>
          <label htmlFor='video_file' className='block text-sm font-semibold leading-6 text-black-600'>{t('selectVideoFile')}</label>
          <div className='mt-2.5 flex flex-col md:flex-row gap-3'>
            <input
              id='video_file'
              type='file'
              accept='video/*'
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className='block w-full rounded-md border-0 px-3.5 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300'
            />
            <button
              type='button'
              onClick={handleFileUpload}
              disabled={!selectedFile || isUploading}
              className='rounded-md bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black-600 disabled:opacity-50'
            >
              {isUploading ? t('uploading') : t('uploadVideo')}
            </button>
          </div>
          {uploadMsg ? <p className='mt-2 text-sm text-black-600'>{uploadMsg}</p> : null}
        </div>
        <div className='py-4'>
          <InputField
            label={t('videoUrl')}
            type='text'
            id='video_link'
            name='video_link'
            value={formData.video_link}
            onchange={handleChange}
          />
        </div>
        <div className='py-4 flex gap-4'>
          <button
            type='submit'
            className='flex w-full justify-center rounded-md bg-black px-3 py-3.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-black-600'
          >
            {t('saveVideo')}
          </button>
          <Link
            href={routerBase + 'dashboard/cameras/' + camId}
            className='flex w-full justify-center rounded-md bg-white px-3 py-3.5 text-sm font-semibold border-2 leading-6 text-black shadow-sm hover:bg-black-600'
          >
            {t('cancel')}
          </Link>
        </div>
      </form>
    </div>
  )
}

export default EditCameraVideoForm
