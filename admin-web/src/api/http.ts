import axios from 'axios'

/**
 * 统一请求实例。
 *
 * <p>业务代码只通过 `src/api/` 下的模块使用它，组件里不直接 import axios。
 * 令牌注入、错误提示、401 跳登录等横切逻辑集中在这里。
 */
export const http = axios.create({
  baseURL: '/api',
  timeout: 30_000,
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    // 后端错误是 RFC 9457 Problem Details；需要按业务分支时读 problem.type。
    // M2 接入登录后，这里补 401 → 跳登录。
    return Promise.reject(error)
  },
)
