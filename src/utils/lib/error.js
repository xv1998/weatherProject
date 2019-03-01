import { wxShowModal } from './wxApi'
import regeneratorRuntime from '../third-party/runtime' // eslint-disable-line

let Raven = require('../third-party/raven')

function throwError(msg, code) {
    let errMsg = msg
    if (code) {
        errMsg += `错误码: ${code}`
    }
    let err = new Error(errMsg)
    err.code = code
    // 删除本层函数的错误栈信息
    err.stack = err.stack.replace(/\n.*\n/, '\n')
    Raven.captureException(errMsg, {
        level: 'error'
    })
    throw err
}

/**
 * 通用错误弹窗
 * @param options
 */
const showError = async function (options) {
    let optionObj
    if (typeof options === 'string') {
        optionObj = {
            content: options
        }
    } else {
        optionObj = options
    }
    let _options = Object.assign({
        title: '提示',
        showCancel: false,
        content: '系统繁忙，请稍后再来'
    }, optionObj)
    await wxShowModal(_options)
}

export { throwError, showError }
