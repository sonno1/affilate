import { useState, useEffect, useCallback } from 'react'
import { getPosts, approvePost, rejectPost, publishPost } from '../api'
import PostCard from './PostCard'

const TABS = [
  { label: 'Tất cả', value: null },
  { label: 'Chờ duyệt', value: 'pending' },
  { label: 'Đã duyệt', value: 'approved' },
  { label: 'Đã đăng', value: 'published' },
  { label: 'Từ chối', value: 'rejected' },
]

export default function PostList({ refreshSignal }) {
  const [activeTab, setActiveTab] = useState(null)
  const [posts, setPosts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getPosts(activeTab)
      setPosts(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      setError(err.response?.data?.detail || 'Không thể tải bài viết.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, refreshSignal])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleApprove = async (id) => {
    try {
      await approvePost(id)
      fetchPosts()
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi duyệt bài.')
    }
  }

  const handleReject = async (id) => {
    try {
      await rejectPost(id)
      fetchPosts()
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi từ chối bài.')
    }
  }

  const handlePublish = async (id) => {
    try {
      await publishPost(id)
      fetchPosts()
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi đăng Facebook.')
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={String(tab.value)}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center pr-1">
          {total} bài
        </span>
      </div>

      {/* Content */}
      {loading && (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      )}
      {error && (
        <div className="text-center py-12 text-red-500">{error}</div>
      )}
      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Chưa có bài viết nào. Nhấn "Crawl Now" để bắt đầu.
        </div>
      )}
      {!loading && !error && posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onApprove={handleApprove}
              onReject={handleReject}
              onPublish={handlePublish}
            />
          ))}
        </div>
      )}
    </div>
  )
}
