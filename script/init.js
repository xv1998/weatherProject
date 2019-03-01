let fs = require('fs')
let exec = require('child_process').exec

function command(cmdStr) {
    exec(cmdStr, function (err, stdout, stderr) {
        if (err) {
            console.log('command error:' + stderr)
        } else {
            console.log(stdout)
        }
    })
}

sass('./src', './src')

/**
 * 递归处理目录内的sass，将其转换成wxss
 * @param src
 */
function sass(src) {
    fs.readdir(src, function (err, paths) {
        if (err) {
            console.error(err)
        } else {
            paths.forEach(function (path) {
                let _src = src + '/' + path
                fs.stat(_src, function (err, stat) {
                    if (err) {
                        console.error(err)
                    } else {
                        // 判断是文件还是目录
                        if (stat.isFile()) {
                            switch (true) {
                                case /.scss$/.test(_src):
                                    console.log(`sass ${_src} ${_src.replace(/.scss$/, '.wxss')}`)
                                    command(`sass ${_src} ${_src.replace(/.scss$/, '.wxss')} --sourcemap=none`)
                                    break
                            }
                        } else if (stat.isDirectory()) {
                            // 当是目录是，递归复制
                            sass(_src)
                        }
                    }
                })
            })
        }
    })
}

