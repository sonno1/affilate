import { useState } from 'react'
import { crawlUrl, updatePostContent, approvePost, publishPost } from '../api'

const URL_REGEX = /^https?:\/\/.+/

export default function ContentCreator() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [post, setPost] = useState(null)
  const [viral, setViral] = useState(null)    // {post, comment, metadata}
  const [editCaption, setEditCaption] = useState('')
  const [editComment, setEditComment] = useState('')
  const [editBgTitle, setEditBgTitle] = useState('')
  const [selectedImage, setSelectedImage] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  // Step 1: Crawl the URL
  const handleCrawl = async () => {
    const trimmed = url.trim()
    if (!URL_REGEX.test(trimmed)) {
      setError('Vui lòng nhập URL hợp lệ (bắt đầu bằng http:// hoặc https://).')
      return
    }
    setError('')
    setPost(null)
    setViral(null)
    setPublished(false)
    setLoading(true)
    try {
      const res = await crawlUrl(trimmed)
      const d = res.data
      setPost(d)
      if (d.viral) {
        setViral(d.viral)
        setEditCaption(d.viral.post?.caption || d.content || '')
        setEditComment(d.viral.comment?.text || '')
        setEditBgTitle(d.viral.post?.background_title || '')
        setSelectedImage(d.viral.post?.image_url || d.image_url || '')
      } else {
        setEditCaption(d.content || '')
        setEditComment(`Chi tiết tại đây 👇\n${trimmed}`)
        setSelectedImage(d.image_url || '')
        setEditBgTitle('')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Không thể crawl URL này.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Save edited caption
  const handleSave = async () => {
    if (!post || !editCaption.trim()) return
    setSaving(true)
    try {
      await updatePostContent(post.post_id, editCaption.trim())
      setPost((prev) => ({ ...prev, content: editCaption.trim() }))
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi khi lưu nội dung.')
    } finally {
      setSaving(false)
    }
  }

  // Step 3: Approve + Publish + Auto-comment
  const handlePublish = async () => {
    if (!post) return
    setPublishing(true)
    setError('')
    try {
      // Save latest content
      if (editCaption.trim() !== post.content) {
        await updatePostContent(post.post_id, editCaption.trim())
      }
      await approvePost(post.post_id)
      await publishPost(post.post_id, {
        image_url: selectedImage || null,
        comment_text: editComment.trim() || null,
      })
      setPublished(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi khi đăng Facebook.')
    } finally {
      setPublishing(false)
    }
  }

  const handleReset = () => {
    setUrl('')
    setPost(null)
    setViral(null)
    setEditCaption('')
    setEditComment('')
    setEditBgTitle('')
    setSelectedImage('')
    setError('')
    setPublished(false)
  }

  const postType = viral?.post?.type || (selectedImage ? 'image_post' : 'background_post')
  const contentType = viral?.metadata?.content_type || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center pt-10 px-4 pb-16">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500 shadow-lg mb-3">
          <span className="text-2xl">🔥</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Viral Content Creator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dán link → AI tạo nội dung viral → Review → Đăng Facebook + Auto-comment
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-5">
        {/* Step 1: Input URL */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            1. Dán link bài viết
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
              placeholder="https://example.com/bai-viet"
              disabled={loading}
              className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
            />
            <button
              onClick={handleCrawl}
              disabled={loading || !url.trim()}
              className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                '🚀 Crawl & Tạo'
              )}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <span>⚠️</span> {error}
            </p>
          )}
        </div>

        {/* Step 2: Crawled content preview */}
        {post && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                2. Nội dung đã crawl
              </label>
              {contentType && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {contentType}
                </span>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-h-40 overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-800">{post.title}</h3>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {post.summary?.slice(0, 600)}{post.summary?.length > 600 ? '…' : ''}
              </p>
            </div>

            {/* Image gallery */}
            {(post.images?.length > 0) && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Ảnh tìm được (click để chọn):</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {post.images.slice(0, 5).map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                        selectedImage === img ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                  {/* Option to remove image */}
                  <button
                    type="button"
                    onClick={() => setSelectedImage('')}
                    className={`shrink-0 w-20 h-20 rounded-lg border-2 flex items-center justify-center text-xs text-gray-400 transition ${
                      !selectedImage ? 'border-blue-500 ring-2 ring-blue-300 text-blue-500' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    Không ảnh
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Edit viral content */}
        {post && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                3. Bài viết Facebook
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({postType === 'image_post' ? '📷 Ảnh' : '🎨 Background'})
                </span>
              </label>
              <span className="text-xs text-gray-400">{editCaption.length} ký tự</span>
            </div>

            {/* Caption */}
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={4}
              disabled={published}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y disabled:bg-gray-100"
              placeholder="Caption viral..."
            />

            {/* Background title (only for background_post) */}
            {postType === 'background_post' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Background Title (ALL CAPS)</label>
                <input
                  value={editBgTitle}
                  onChange={(e) => setEditBgTitle(e.target.value.toUpperCase())}
                  disabled={published}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold uppercase disabled:bg-gray-100"
                  placeholder="CHẤN ĐỘNG: SỰ THẬT BẤT NGỜ"
                />
              </div>
            )}

            {/* Selected image preview */}
            {selectedImage && (
              <div className="rounded-xl overflow-hidden border border-gray-200 max-h-48">
                <img src={selectedImage} alt="Ảnh đính kèm" className="w-full h-48 object-cover" />
              </div>
            )}

            {/* Comment preview */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                💬 Comment đầu tiên (chứa link gốc)
              </label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                rows={2}
                disabled={published}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none disabled:bg-gray-100"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || published || !editCaption.trim()}
                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition"
              >
                {saving ? 'Đang lưu...' : '💾 Lưu'}
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing || published || !editCaption.trim()}
                className="flex-1 px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition"
              >
                {publishing ? 'Đang đăng...' : published ? '✅ Đã đăng' : '🚀 Đăng Facebook + Comment'}
              </button>
            </div>
          </div>
        )}

        {/* Published success */}
        {published && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-sm font-semibold text-green-800">
                Đã đăng bài + comment link gốc lên Facebook thành công!
              </p>
              <button
                onClick={handleReset}
                className="mt-1 text-xs text-green-600 hover:text-green-800 underline"
              >
                Tạo bài viết mới
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
