import { useState, useEffect, useRef } from 'react'
import { getShopeeConfig, createShortLink } from '../api'

// Regex: chỉ cho phép https://s.shopee.vn/ với bất kỳ ký tự phía sau
const SHOPEE_REGEX = /^https:\/\/s\.shopee\.vn\/.+$/

// ---------------------------------------------------------------------------
// Rate limiter: tối đa MAX_REQ lần tạo link trong WINDOW_MS
// ---------------------------------------------------------------------------
const MAX_REQ = 50
const WINDOW_MS = 60_000

class RateLimiter {
  constructor() { this._times = [] }
  tryConsume() {
    const now = Date.now()
    this._times = this._times.filter((t) => now - t < WINDOW_MS)
    if (this._times.length >= MAX_REQ) return false
    this._times.push(now)
    return true
  }
  remaining() {
    const now = Date.now()
    this._times = this._times.filter((t) => now - t < WINDOW_MS)
    return MAX_REQ - this._times.length
  }
}

const rateLimiter = new RateLimiter()

export default function Home() {
  const [link, setLink] = useState('')
  const [affiliateId, setAffiliateId] = useState('')
  const [affiliateUrl, setAffiliateUrl] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [shortLoading, setShortLoading] = useState(false)
  const [visitCooldown, setVisitCooldown] = useState(0)  // giây còn lại
  const inputRef = useRef(null)
  const isPastingRef = useRef(false)
  const processingRef = useRef(false)
  const shortTokenRef = useRef('')
  const cooldownTimerRef = useRef(null)

  // Lấy affiliate_id từ backend khi load
  useEffect(() => {
    getShopeeConfig()
      .then((res) => setAffiliateId(res.data.affiliate_id || ''))
      .catch(() => {})
  }, [])

  // --- Kiểm tra định dạng link ---
  const validate = (value) => {
    if (!value.trim()) {
      setError('Vui lòng dán link Shopee vào ô nhập liệu.')
      return false
    }
    if (!SHOPEE_REGEX.test(value.trim())) {
      setError('Đây không phải link shopee copy từ điện thoại.')
      return false
    }
    setError('')
    return true
  }

  // --- Tạo subId theo định dạng yyyy-MM-dd HH:mm:ss ---
  const buildSubId = () => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return (
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    )
  }

  // --- Xây dựng affiliate URL từ một link cụ thể ---
  const buildAffiliateUrl = (rawLink) => {
    const trimmed = rawLink.trim()
    const encodedProduct = encodeURIComponent(trimmed)
    const subId = `fb-reel-${buildSubId()}`
    return (
      `https://s.shopee.vn/an_redir` +
      `?origin_link=${encodedProduct}` +
      `&affiliate_id=${affiliateId}` +
      `&sub_id=${encodeURIComponent(subId)}`
    )
  }

  // --- Đảm bảo shortlink đã tồn tại, tạo mới nếu chưa có ---
  const ensureShortToken = async () => {
    if (shortTokenRef.current) return shortTokenRef.current
    if (!affiliateUrl) return null
    setShortLoading(true)
    try {
      const res = await createShortLink(affiliateUrl)
      shortTokenRef.current = res.data.short_token
      return shortTokenRef.current
    } catch {
      return null
    } finally {
      setShortLoading(false)
    }
  }

  // --- Copy link: copy short URL (tạo nếu chưa có), vẫn giữ hành vi copy ---
  const handleCopy = async () => {
    if (!affiliateUrl) return
    const token = await ensureShortToken()
    const urlToCopy = token
      ? `${window.location.origin}/r/${token}`
      : affiliateUrl  // fallback nếu không tạo được shortlink

    let success = false
    // Thử Clipboard API trước (yêu cầu HTTPS + focus)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(urlToCopy)
        success = true
      } catch { /* fall through to legacy */ }
    }
    // Fallback: execCommand('copy') cho các trường hợp Clipboard API bị chặn
    if (!success) {
      const ta = document.createElement('textarea')
      ta.value = urlToCopy
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:0;left:0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { document.execCommand('copy'); success = true } catch { /* silent */ }
      document.body.removeChild(ta)
    }
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // --- Truy cập: mở short URL (tạo nếu chưa có), vẫn giữ hành vi open ---
  const handleVisit = async () => {
    if (!affiliateUrl || visitCooldown > 0) return
    const token = await ensureShortToken()
    const urlToOpen = token
      ? `${window.location.origin}/r/${token}`
      : affiliateUrl
    window.open(urlToOpen, '_blank', 'noreferrer')

    // Bắt đầu đếm ngược 5 giây
    const COOLDOWN = 5
    setVisitCooldown(COOLDOWN)
    let remaining = COOLDOWN
    cooldownTimerRef.current = setInterval(() => {
      remaining -= 1
      setVisitCooldown(remaining)
      if (remaining <= 0) {
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
    }, 1000)
  }

  // --- Xử lý paste: validate rồi tạo và lưu affiliate URL ngay ---
  const handlePaste = (e) => {
    // Chặn drag-and-drop file / import file
    const files = e.clipboardData?.files
    if (files && files.length > 0) {
      e.preventDefault()
      setError('Không hỗ trợ import file.')
      return
    }

    const pasted = e.clipboardData?.getData('text') || ''
    if (!pasted) return

    // Chặn paste nhiều link cùng lúc (nhiều dòng)
    if (pasted.trim().includes('\n') || pasted.trim().includes('\r')) {
      e.preventDefault()
      setError('Chỉ được dán một link tại một thời điểm.')
      return
    }

    if (!SHOPEE_REGEX.test(pasted.trim())) {
      e.preventDefault()
      setError('Đây không phải link shopee copy từ điện thoại.')
      setAffiliateUrl('')
      return
    }

    // Rate limiting
    if (!rateLimiter.tryConsume()) {
      e.preventDefault()
      setError('Bạn đang tạo link quá nhanh. Vui lòng thử lại sau 1 phút.')
      return
    }

    // Chống race condition: bỏ qua nếu đang xử lý một request khác
    if (processingRef.current) {
      e.preventDefault()
      return
    }
    processingRef.current = true

    setError('')
    setCopied(false)
    shortTokenRef.current = ''
    isPastingRef.current = true
    const builtUrl = buildAffiliateUrl(pasted)
    setAffiliateUrl(builtUrl)
    // Tự động tạo shortlink ngầm
    autoCreateShortLink(builtUrl)

    processingRef.current = false
  }

  const handleChange = (e) => {
    setLink(e.target.value)
    // Nếu thay đổi do paste thì giữ nguyên affiliateUrl, chỉ reset khi user tự sửa tay
    if (isPastingRef.current) {
      isPastingRef.current = false
      return
    }
    setAffiliateUrl('')
    if (error) setError('')
  }

  const handleClear = () => {
    setLink('')
    setAffiliateUrl('')
    setError('')
    setCopied(false)
    setVisitCooldown(0)
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current)
      cooldownTimerRef.current = null
    }
    shortTokenRef.current = ''
    inputRef.current?.focus()
  }

  // --- Tự động tạo shortlink sau khi paste (chạy ngầm, không hiển thị) ---
  const autoCreateShortLink = async (builtAffiliateUrl) => {
    if (shortLoading || shortTokenRef.current) return  // đã tạo rồi hoặc đang tạo
    setShortLoading(true)
    try {
      const res = await createShortLink(builtAffiliateUrl)
      shortTokenRef.current = res.data.short_token
    } catch {
      // Thất bại im lặng, không hiển thị lỗi vì đây là nền
    } finally {
      setShortLoading(false)
    }
  }

  const isValid = SHOPEE_REGEX.test(link.trim()) && !!affiliateUrl

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex flex-col items-center justify-start pt-16 px-4">
      {/* Logo / Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 shadow-lg mb-4">
          <span className="text-3xl">🛍️</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Shopee Affiliate Link Builder
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-500">
          Dán link Shopee, nhận link affiliate của bạn ngay lập tức.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
        {/* Affiliate ID notice */}
        {!affiliateId && (
          <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-800">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>
              Chưa cấu hình <strong>SHOPEE_AFFILIATE_ID</strong> trong file{' '}
              <code className="bg-yellow-100 px-1 rounded">.env</code>. Trường <code className="bg-yellow-100 px-1 rounded">affiliate_id</code> trong URL sẽ bỏ trống.
            </span>
          </div>
        )}

        {/* Input area */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Link sản phẩm Shopee
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="url"
              value={link}
              onChange={handleChange}
              onPaste={handlePaste}
              onDrop={(e) => e.preventDefault()}
              onDragOver={(e) => e.preventDefault()}
              placeholder="Dán link shopee vào đây"
              spellCheck={false}
              className={`w-full pr-10 pl-4 py-3 text-sm rounded-xl border transition focus:outline-none focus:ring-2
                ${error
                  ? 'border-red-400 focus:ring-red-300 bg-red-50'
                  : isValid
                    ? 'border-green-400 focus:ring-green-300 bg-green-50'
                    : 'border-gray-300 focus:ring-orange-400 bg-white'
                }`}
            />
            {/* Clear button */}
            {link && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Xóa link"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.83-10.83a.75.75 0 00-1.06 0L10 8.94 8.23 7.17a.75.75 0 00-1.06 1.06L8.94 10l-1.77 1.77a.75.75 0 101.06 1.06L10 11.06l1.77 1.77a.75.75 0 101.06-1.06L11.06 10l1.77-1.77a.75.75 0 000-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}

          {/* Thông báo đã tạo link (không hiển thị URL) */}
          {affiliateUrl && !error && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Đã tạo xong link. Nhấn <strong>Truy cập</strong> để mở sản phẩm.</span>
            </div>
          )}


        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Truy cập */}
          <button
            type="button"
            onClick={handleVisit}
            disabled={visitCooldown > 0}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-700
              ${visitCooldown > 0
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-gray-800 hover:bg-gray-900 active:bg-black text-white'
              }`}
          >
            {visitCooldown > 0 ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Chờ {visitCooldown}s…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Truy cập
              </>
            )}
          </button>

        </div>
      </div>

      {/* Helper text */}
      <p className="mt-6 text-xs text-gray-400 text-center max-w-sm">
        Mở ứng dụng Shopee → chọn sản phẩm → nhấn Chia sẻ → Sao chép liên kết → dán vào ô trên.
      </p>
    </div>
  )
}
