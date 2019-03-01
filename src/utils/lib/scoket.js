/**
 * @author 小糖
 * @date 2019/2/17
 * @Description: 课程表后台socket工具包
 */

import regeneratorRuntime from '../third-party/runtime' // eslint-disable-line
import { wxRequest } from './wxApi'

let app = getApp()
let socket

function initSocket() {
    const io = require('../third-party/weapp.socket.io.js')

    socket = io('http://localhost:7003/req', {

        // 实际使用中可以在这里传递参数
        query: {},

        transports: ['websocket']
    })

    socket.on('connect', () => {
        const id = socket.id
        if (!app) {
            app = getApp()
        }
        app.globalData.socket_id = id

        console.log('socket #connect,', id, socket)

        // 监听自身 id 以实现 p2p 通讯
        socket.on(id, async msg => {
            console.log('#receive,', msg)
            if (msg.request) {
                console.log('#socket前端代理,', msg.request)
                try {
                    const options = msg.request.options || {}
                    let res = await wxRequest({
                        ...options
                    })
                    socket.emit('response', {
                        pid: msg.request.pid,
                        req_id: msg.request.req_id,
                        req: {
                            header: res.header,
                            cookie: res.cookies,
                            statusCode: res.statusCode,
                            data: res.data,
                        }
                    })
                } catch (e) {
                    socket.emit('response', {
                        pid: msg.request.pid,
                        req_id: msg.request.req_id,
                        error: {
                            message: e.message,
                            stack: e.stack
                        }
                    })
                }
            }
        })
    })

    // 系统事件
    socket.on('disconnect', msg => {
        console.log('#disconnect', msg)
        socket.off(app.globalData.socket_id)
        app.globalData.socket_id = null
    })

    socket.on('disconnecting', () => {
        console.log('#disconnecting')
        socket.off(app.globalData.socket_id)
        app.globalData.socket_id = null
    })

    socket.on('error', () => {
        console.log('#error')
        if (!app) {
            app = getApp()
        }
        socket.off(app.globalData.socket_id)
        app.globalData.socket_id = null
    })
}

export { initSocket }
