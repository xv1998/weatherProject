import { config } from './config'

// 全局常量
const constant = {
    environment: config.environment,
    production: 'production',
    development: 'development',
}

// 存放Cache key 的map
const cacheKeyMap = {
    loginState: Symbol('login_key')
}

export { constant, cacheKeyMap }
