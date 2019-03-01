/**
 * @author 小糖
 * @date 2019/2/15
 * @Description: 请求工具包
 */

import regeneratorRuntime from '../third-party/runtime' // eslint-disable-line
import { wxGetUserInfo, wxLogin, wxRequest } from './wxApi'
import { cache } from './Cache'
import { config } from '../../config/config'
import { api, errCode } from '../../config/api'
import { cacheKeyMap } from '../../config/constant'
import { throwError } from './error'

const Raven = require('../third-party/raven')

const app = getApp()

const request = async function (options) {

    // 校验登录态
    async function _validateLoginState() {
        // 检查skey
        let loginState = cache.get(cacheKeyMap.loginState)
        if (!loginState) {
            console.warn('登录秘钥不存在，需要重新登录')
            return false
        }

        let { skey, skeyExpiresAt, refresh_key, refreshKeyExpiresAt } = loginState
        if (!skey || new Date(skeyExpiresAt) < new Date()) {
            console.warn('skey无效，检查refreshKey')
            if (!refresh_key || new Date(refreshKeyExpiresAt) < new Date()) {
                console.warn('refresh_key无效，需要重新登录')
                return false
            } else {
                // 刷新skey，重新请求，并更新登录态
                await _refreshLoginState(refresh_key)
            }
        }
        return true
    }

    async function _refreshLoginState(refresh_key) {
        console.log('_refreshLoginState')
        let res = await request({
            url: api.refresh_login_state,
            needLogin: false,
            header: { refresh_key }
        })
        if (res.data.code !== '0') {
            await logout()
            throwError(`刷新skey失败，错误码: ${res.data.code}`)
        }
        // 更新登录秘钥
        let loginState = {
            skey: res.data.skey,
            skeyExpiresAt: res.data.skeyExpiresAt,
            refresh_key: res.data.refresh_key,
            refreshKeyExpiresAt: res.data.refreshKeyExpiresAt
        }
        cache.set(cacheKeyMap.loginState, loginState)
        console.log('刷新登录态成功')
        return loginState
    }

    async function _req(_options) {

        // 请求附带的登录态
        if (_options.needLogin) {
            _options.header['skey'] = cache.get(cacheKeyMap.loginState).skey
        }
        if (_options.showLoading) {
            wx.showLoading({
                title: '加载中...',
                mask: true
            })
        }
        _options.data['r_time'] = new Date().getTime()

        let res
        try {
            res = await wxRequest(_options)
        } catch (e) {
            wx.hideLoading()
            throwError(`发送请求出错 ${e.message || e.errMsg}`)
        }

        // 检验登录态是否有效
        if (_options.needLogin && (
            res.data.code === errCode.validateLoginState.no_skey ||
            res.data.code === errCode.validateLoginState.not_find_session ||
            res.data.code === errCode.validateLoginState.invalid_skey)
        ) {
            if (!hasRetry) {
                hasRetry = true
                // 登录态失效，刷新后重试
                await _refreshLoginState(cache.get(cacheKeyMap.loginState).refresh_key)
                beginTime = Date.now()
                res = await _req(_options)
            } else {
                // 刷新后重试失败，抛出异常
                await logout()
                wx.hideLoading()
                throwError('登录态失效，刷新后重试仍失败')
            }
        }
        console.log(`url: ${_options.url} time: ${Date.now() - beginTime}ms`, res)
        wx.hideLoading()
        return res
    }

    // 请求部分
    let hasRetry = false
    let _options = Object.assign({
        method: 'POST',
        showLoading: true,
        needLogin: true,
        data: {},
        header: {}
    }, options)

    // 请求附带的额外信息
    _options.data['from'] = 'mini-pro'
    _options.data['app_id'] = config.app_id
    _options.data['release'] = config.release
    let currentPage = getCurrentPages()
    _options.data['page'] = currentPage.length > 0 && currentPage[currentPage.length - 1] ? currentPage[currentPage.length - 1].route : 'no page'

    // socket
    _options.header['socket_id'] = app.globalData.socket_id

    if (_options.needLogin) {
        let isLogin = await _validateLoginState()
        if (!isLogin) {
            // 登录态过期，注销
            await logout()
            return
        }
    } else {
        console.log('needLogin: false')
    }

    // sentry 埋点
    Raven.captureBreadcrumb({
        category: 'ajax',
        data: {
            method: _options.method,
            url: _options.url
        }
    })

    // 发起请求
    let beginTime = Date.now()
    const res = await _req(_options)
    return res
}

/**
 * 注销
 */
const logout = async function () {
    console.log('logout')
    cache.remove(cacheKeyMap.loginState)
}


/**
 * 微信登录，获取 code 和 encryptData
 * @returns {Promise<{userInfo: wx.UserInfo | data.userInfo | {} | * | ((options?: {encoding: string}) => {username: string; uid: number; gid: number; shell: any; homedir: string}), code: *, encryptedData: string, iv: string | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | ArrayBuffer}>}
 */
const getWxLoginResult = async function () {

    let loginResult = await wxLogin()
    let userResult = await wxGetUserInfo()
    return {
        code: loginResult.code,
        encryptedData: userResult.encryptedData,
        iv: userResult.iv,
        userInfo: userResult.userInfo,
    }
}


/**
 * Oauth登录，验证汕大账号密码
 * @param account
 * @param password
 * @returns {Promise<void>}
 */
const login = async function (account, password) {
    let res = await request({
        url: api.login,
        method: 'POST',
        needLogin: false,
        data: { account, password }
    })
    switch (res.data.code) {
        case '0':
            break
        case '0120102':
            throw new Error('密码错误')
        default:
            throwError(`Oauth登录失败，错误码${res.data.code}`)
    }
    let oauthSessionKey
    let oauthSessionValue
    try {
        [oauthSessionKey, oauthSessionValue] = res.header['set-cookie'].split(';')[0].split('=')
        console.log('login success')
    } catch (e) {
        throwError(`获取session失败: ${e}`)
    }
    // 存储资源服务器session
    app.globalData.oauthSession = { oauthSessionKey, oauthSessionValue }
}

const authorize = async function () {
    /**
     * Oauth授权
     * @returns {Promise<void>}
     * @private
     */
    async function _oauthLogin() {
        res = await request({
            url: api.authorize,
            method: 'GET',
            header: { cookie: `${oauthSessionKey}=${oauthSessionValue}` },
            needLogin: false,
            data: {
                response_type: 'code',
                client_id: 'stu',
                redirect_uri: api.stu_login,
                state: 'test_state',
                scope: '*',
            }
        })
        if (res.header['content-type'].indexOf('html') > -1) {
            throwError('Oauth登录过期，请重新登录')
        }
        if (res.data.code !== '0') {
            throwError('Oauth认证错误', res.data.code)
        }
        [syllabusSessionKey, syllabusSessionValue] = res.header['set-cookie'].split(';')[0].split('=')
        if (!syllabusSessionKey || !syllabusSessionValue) {
            throwError('获取syllabusSession失败')
        }
        // 存储业务后台session
        app.globalData.syllabusSession = { syllabusSessionKey, syllabusSessionValue }
        console.log('Oauth 授权成功')
    }

    /**
     * 微信小程序登录授权
     * @returns {Promise<void>}
     * @private
     */
    async function _miniLogin() {

        let wxLoginResult = await getWxLoginResult()

        // 构造请求头，包含 code、encryptedData 和 iv
        let code = wxLoginResult.code
        let encryptedData = wxLoginResult.encryptedData
        let iv = wxLoginResult.iv
        let header = {}

        let { syllabusSessionKey, syllabusSessionValue } = app.globalData.syllabusSession
        header['cookie'] = `${syllabusSessionKey}=${syllabusSessionValue}`
        header['X-WX-Code'] = code
        header['X-WX-Encrypted-Data'] = encryptedData
        header['X-WX-IV'] = iv

        // TODO 需要换成统一请求函数
        // 请求服务器登录地址，获得会话信息
        let res = await request({
            url: api.mini_pro_login,
            method: 'GET',
            header: header,
            needLogin: false
        })

        let data = res.data

        if (data.code !== '0') {
            throwError('小程序微信登录出现错误', data.code)
        }
        let loginState = {
            skey: data.skey,
            skeyExpiresAt: data.skeyExpiresAt,
            refresh_key: data.refresh_key,
            refreshKeyExpiresAt: data.refreshKeyExpiresAt
        }
        cache.set(cacheKeyMap.loginState, loginState)
        console.log('小程序授权成功')
    }

    // 函数主体
    let { oauthSessionKey, oauthSessionValue } = app.globalData.oauthSession
    if (!oauthSessionKey || !oauthSessionValue) {
        throwError('no oauthSession')
    }
    let res
    let syllabusSessionKey
    let syllabusSessionValue

    // Oauth授权
    try {
        await _oauthLogin()
    } catch (e) {
        console.error(`Oauth授权失败 ${e}`)
        throw e
    }

    // 微信授权
    try {
        await _miniLogin()
    } catch (e) {
        console.error(`微信授权失败 ${e}`)
        throw e
    }
}
const weekDay = function () {
  var weekDay;
  var week = new Date().getDay();
  console.log(week);
  switch (week) {
    case 0:
      weekDay = '星期日'
      break;
    case 1:
      weekDay = '星期一'
      break;
    case 2:
      weekDay = '星期二'
      break;
    case 3:
      weekDay = '星期三'
      break;
    case 4:
      weekDay = '星期四'
      break;
    case 5:
      weekDay = '星期五'
      break;
    case 6:
      weekDay = '星期六'
      break;
  }
  return weekDay;
}

export {
    request,
    login,
    authorize,
    weekDay
}
