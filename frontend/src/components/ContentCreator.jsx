import { useState } from 'react'
import { crawlUrl, updatePostContent, approvePost, publishPost } from '../api'

const URL_REGEX = /^https?:\/\/.+/

export default function ContentCreator() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [post, setPost] = useState(null) // { post_id, title, summary, content }
  const [editContent, setEditContent] = useState('')
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
    setPublished(false)
    setLoading(true)
    try {
      const res = await crawlUrl(trimmed)
      const data = res.data
      setPost(data)
      setEditContent(data.content || '')
    } catch (err) {
      setError(err.response?.data?.detail || 'Không thể crawl URL này.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Save edited content
  const handleSave = async () => {
    if (!post || !editContent.trim()) return
    setSaving(true)
    try {
      const res = await updatePostContent(post.post_id, editContent.trim())
      setPost((prev) => ({ ...prev, content: res.data.content }))
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi khi lưu nội dung.')
    } finally {
      setSaving(false)
    }
  }

  // Step 3: Approve + Publish to Facebook
  const handlePublish = async () => {
    if (!post) return
    setPublishing(true)
    setError('')
    try {
      // Save latest content first
      if (editContent.trim() !== post.content) {
        await updatePostContent(post.post_id, editContent.trim())
      }
      // Approve
      await approvePost(post.post_id)
      // Publish
      await publishPost(post.post_id)
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
    setEditContent('')
    setError('')
    setPublished(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center pt-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500 shadow-lg mb-3">
          <span className="text-2xl">📝</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Tạo bài viết từ URL</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dán link → AI tóm tắt → Review → Đăng Facebook
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
              className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang crawl...
                </span>
              ) : (
                'Crawl'
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <span>⚠️</span> {error}
            </p>
          )}
        </div>

        {/* Step 2: Review crawled content */}
        {post && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              2. Nội dung đã crawl
            </label>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-800">{post.title}</h3>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {post.summary?.slice(0, 800)}{post.summary?.length > 800 ? '…' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: AI summary + edit */}
        {post && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                3. Bài viết Facebook (AI tạo — chỉnh sửa tùy ý)
              </label>
              <span className="text-xs text-gray-400">{editContent.length} ký tự</span>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              disabled={published}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y disabled:bg-gray-100"
              placeholder="Nội dung bài viết Facebook..."
            />
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || published || !editContent.trim()}
                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition"
              >
                {saving ? 'Đang lưu...' : '💾 Lưu chỉnh sửa'}
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing || published || !editContent.trim()}
                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition"
              >
                {publishing ? 'Đang đăng...' : published ? '✅ Đã đăng' : '🚀 Đăng Facebook'}
              </button>
            </div>
          </div>
        )}

        {/* Published success */}
        {published && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Đã đăng bài lên Facebook thành công!</p>
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
