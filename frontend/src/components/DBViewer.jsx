import { useState, useEffect, useCallback } from 'react'
import { listShortLinks } from '../api'

export default function DBViewer() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listShortLinks(0, 200)
      setRows(res.data)
    } catch {
      setError('Không tải được dữ liệu từ DB.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">🗄️ DB Viewer — Bảng <code className="bg-gray-100 px-1 rounded text-sm">short_links</code></h2>
          <p className="text-xs text-gray-500 mt-0.5">
            SQLite · {rows.length} bản ghi · Mỗi shortlink lưu: <code className="bg-gray-100 px-1 rounded">token</code>, <code className="bg-gray-100 px-1 rounded">target_url</code> (affiliate URL), <code className="bg-gray-100 px-1 rounded">created_at</code>
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Làm mới
        </button>
      </div>

      {/* Cơ chế lưu */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
        <p className="font-semibold text-blue-900 mb-1">📐 Cơ chế lưu trữ</p>
        <p><strong>1. Paste link Shopee</strong> → frontend build <code className="bg-blue-100 px-1 rounded">affiliate URL</code> (an_redir + affiliate_id + sub_id)</p>
        <p><strong>2. Tự động gọi POST /shorten</strong> → backend sinh token 8 ký tự hex (<code className="bg-blue-100 px-1 rounded">secrets.token_hex(4)</code>)</p>
        <p><strong>3. Lưu vào SQLite</strong>: <code className="bg-blue-100 px-1 rounded">token → affiliate URL</code>. Token là khoá duy nhất, affiliate URL không bao giờ lộ ra ngoài.</p>
        <p><strong>4. Redirect</strong>: <code className="bg-blue-100 px-1 rounded">GET /r/&#123;token&#125;</code> → 302 redirect đến affiliate URL, ẩn hoàn toàn affiliate_id.</p>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Table */}
      {rows.length === 0 && !loading ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          Chưa có shortlink nào được tạo.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Token</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Short URL</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Target URL (affiliate)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.id}</td>
                  <td className="px-4 py-3">
                    <code className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-mono">{row.token}</code>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={row.short_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline font-mono text-xs"
                    >
                      {row.short_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <button
                      className="text-left w-full"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      {expandedId === row.id ? (
                        <span className="text-xs text-gray-700 break-all font-mono">{row.target_url}</span>
                      ) : (
                        <span className="text-xs text-gray-400 truncate block max-w-xs">{row.target_url}</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
