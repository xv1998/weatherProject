// app.js
import regeneratorRuntime from './utils/third-party/runtime'    // eslint-disable-line
import { config } from './config/config'
import { constant } from './config/constant'
import { initSocket } from './utils/lib/scoket'

const Raven = require('./utils/third-party/raven')

App({
    onLaunch: async function () {/*
        console.log(`environment ${config.environment} release: ${config.release}`)

        // init sentry
        this.initSentry()

        // init Socket.io
        initSocket()
    },

    // 初始化sentry
    initSentry() {
        switch (true) {
            case config.environment !== constant.production:
                console.log('开发环境不初始化sentry')
                break
            case !config.sentry && config.sentry.dsn:
                console.log('未配置sentry')
                break
            default:
                Raven.config(config.sentry.dsn, config.sentry.options).install()
        }
    */},
    globalData: {
        oauthSession: {},   // 资源服务器session
        syllabusSession: {}, // 课程表业务后台session
        socket_id: null,    // socket id
    },

    onError(msg) {
        Raven.captureException(msg, {
            level: 'error'
        })
    }
})
