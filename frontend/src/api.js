import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// axios instance riêng cho các route không có prefix /api
const raw = axios.create({ timeout: 10000 })

export const crawl = () => api.get('/crawl')

export const generate = () => api.post('/generate')

export const getPosts = (status = null, skip = 0, limit = 50) => {
  const params = { skip, limit }
  if (status) params.status = status
  return api.get('/posts', { params })
}

export const approvePost = (id) => api.post(`/posts/approve/${id}`)

export const rejectPost = (id) => api.post(`/posts/reject/${id}`)

export const publishPost = (id, { image_url, comment_text } = {}) =>
  api.post(`/posts/publish/${id}`, { image_url, comment_text })

// Shopee Affiliate
export const getShopeeConfig = () => api.get('/shopee/config')

// Shortlink
export const createShortLink = (url) => raw.post('/shorten', { url })
export const listShortLinks = (skip = 0, limit = 100) => raw.get('/shortlinks', { params: { skip, limit } })

// Crawl single URL → AI summary
export const crawlUrl = (url) => api.post('/crawl/url', { url })

// Update post content (review/edit)
export const updatePostContent = (id, content) => api.put(`/posts/${id}/content`, { content })

export default api
