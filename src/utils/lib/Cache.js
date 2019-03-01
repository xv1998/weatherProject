/**
 * 缓存类，封装小程序storage接口，缓存已经读取过的缓存
 */
class Cache {
    /**
     * 获取指定缓存
     * @param symbolKey
     * @returns {*}
     */
    get(symbolKey) {
        const key = symbolKey.toString()
        if (this[key]) {
            // 从内存中读取
            return this[key]
        }
        // 从存储读取
        this[key] = wx.getStorageSync(key) || null
        return this[key]
    }

    /**
     * 设置指定缓存
     * @param symbolKey
     * @param value
     */
    set(symbolKey, value) {
        const key = symbolKey.toString()
        this[key] = value
        // 异步写入存储
        wx.setStorage({ key, data: value })
    }

    /**
     * 清除指定缓存
     * @param symbolKey
     */
    remove(symbolKey) {
        const key = symbolKey.toString()
        if (this[key]) {
            this[key] = null
        }
        wx.removeStorage({ key })
    }
}



let cache = new Cache()
export {
    cache
}
