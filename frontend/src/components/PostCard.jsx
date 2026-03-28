const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  published: 'bg-green-100 text-green-800',
}

const STATUS_LABELS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  published: 'Đã đăng',
}

export default function PostCard({ post, onApprove, onReject, onPublish }) {
  const colorClass = STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-700'

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-3 border border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 flex-1">
          {post.title}
        </h3>
        <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${colorClass}`}>
          {STATUS_LABELS[post.status] || post.status}
        </span>
      </div>

      {/* AI Content */}
      {post.content ? (
        <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
          {post.content}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-400 italic">
          Chưa có nội dung AI — nhấn "Generate All" để tạo.
        </div>
      )}

      {/* Source */}
      <a
        href={post.source_url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-xs text-blue-500 hover:underline truncate"
      >
        {post.source_url}
      </a>

      {/* Footer meta */}
      <div className="text-xs text-gray-400">
        {new Date(post.created_at).toLocaleString('vi-VN')}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap mt-1">
        {post.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(post.id)}
              className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5 transition"
            >
              ✓ Duyệt
            </button>
            <button
              onClick={() => onReject(post.id)}
              className="flex-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg py-1.5 transition"
            >
              ✗ Từ chối
            </button>
          </>
        )}
        {post.status === 'approved' && (
          <button
            onClick={() => onPublish(post.id)}
            className="flex-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg py-1.5 transition"
          >
            🚀 Đăng Facebook
          </button>
        )}
        {(post.status === 'rejected' || post.status === 'published') && (
          <span className="text-xs text-gray-400 italic">
            {post.status === 'published' ? 'Đã đăng lên Facebook.' : 'Bài bị từ chối.'}
          </span>
        )}
      </div>
    </div>
  )
}
