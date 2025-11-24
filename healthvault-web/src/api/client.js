import axios from 'axios'

// read csrftoken from cookies
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[2]) : null
}

const client = axios.create({
  baseURL: '/api',
  withCredentials: true, // send/receive session cookie
})

// attach CSRF token for non-GET requests
client.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase()
  if (!['get', 'head', 'options'].includes(method)) {
    const token = getCookie('csrftoken')
    if (token) config.headers['X-CSRFToken'] = token
  }
  return config
})

// unwrap data; on 401 send to /login
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err?.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.replace('/login')
    }
    return Promise.reject(err)
  }
)

export default client
