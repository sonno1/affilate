import { useState } from 'react'
import { crawl, generate } from '../api'

export default function Controls({ onRefresh }) {
  const [crawling, setCrawling] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState(null)

  const handleCrawl = async () => {
    setCrawling(true)
    setMessage(null)
    try {
      const res = await crawl()
      setMessage({ type: 'success', text: res.data.message })
      onRefresh()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Crawl thất bại.' })
    } finally {
      setCrawling(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setMessage(null)
    try {
      const res = await generate()
      setMessage({ type: 'success', text: res.data.message })
      onRefresh()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Generate thất bại.' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={handleCrawl}
        disabled={crawling}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
      >
        {crawling ? (
          <span className="animate-spin">⟳</span>
        ) : (
          '📥'
        )}
        Crawl Now
      </button>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
      >
        {generating ? (
          <span className="animate-spin">⟳</span>
        ) : (
          '🤖'
        )}
        Generate All
      </button>

      {message && (
        <span
          className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}
        >
          {message.text}
        </span>
      )}
    </div>
  )
}
