// pages/test/test.js
import regeneratorRuntime from '../../utils/third-party/runtime' // eslint-disable-line
import { api } from '../../config/api'
import { request, login, authorize, weekDay } from '../../utils/lib/request'
import { showError } from '../../utils/lib/error'

const app = getApp()
var location;
var showLoading;
var longi;//经度
var lat;//维度

Page({

    /**
     * 页面的初始数据
     */
    data: {
        location: '佛山市',
        hasRefresh: false,
        nowBackGround: [100, 8],
        nowTemperature: '0 ℃',
        nowWind: '晴/东北风  微风',
        nowAir: '50  优',
        dailyForecast: [],
        week: ''
    },
   async Weather(lat, longi) {
    try{
      var _this = this;
      //数据集合
      var data = {
        "key": "bff5cc9bcfdf46b0a0e9bf0c260ff14f",
        "location": location ? longi + "," + lat : "guangzhou",
        "lang": "zh",
        "unit": "m"
      };
      let res = await request({
        url: 'https://free-api.heweather.com/s6/weather',
        method: 'GET',
        needLogin: false,
        data: data
      })
      if(res.statusCode ==200){
        var now = res.data.HeWeather6[0].now; //获取实时天气
        var daily = res.data.HeWeather6[0].daily_forecast;//获取一周天气
        _this.setData({
          nowBackGround: [now.cond_code, now.tmp],
          nowTemperature: now.tmp + "℃",
          nowWind: now.cond_txt + "/" + now.wind_dir + "   " + now.wind_sc,
          dailyForecast: daily,
        })
      }
    }catch(e){
      console.error(e)
    }
  },
  //地理反编码
  async getLocationCode(lat,longi){
    try{
      var _this = this;
      var data = {
        'key': '05e62c98ebc533cb8811ae71ca817033',
        'location': longi + "," + lat
      }
      let res = await request({
        url: 'https://restapi.amap.com/v3/geocode/regeo',
        method: 'GET',
        needLogin: false,
        data: data
      })
      if (res.statusCode == 200){
        console.log(res.data)
        _this.setData({
          showLoading : false,
          location: res.data.regeocode.addressComponent.district + res.data.regeocode.addressComponent.township
        })//获取高德地图api的地理位置
        //location = "youzhi"
        _this.Weather(lat, longi)
      }
    }catch(e){
      console.error(e)
    }
  },
  onLoad: function () {
    this.getLocationAction()
    this.setData({
      week: weekDay()
    })
  },
  getLocationAction: function () {
    // var location;
    var _this = this;
    wx.getLocation({
      success: function (res) {
        lat = res.latitude
        longi = res.longitude
        //console.log(lat,longi);
        _this.getLocationCode(lat,longi)
      },
      fail: function () {
        _this.Weather("", "");
      }
    })
  },
  chooseLocation: function () {
    var isopenLoction;
    var _this = this;
    wx.getSetting({
      success: (res) => {
        // console.log(res)
        isopenLoction = res.authSetting["scope.userLocation"]
        // console.log(isopenLoction)
        if (isopenLoction) {
          wx.chooseLocation({
            success: function (res) {
              // console.log(res)
              _this.setData({
                location: res.address,
              })
              longi = res.longitude
              lat = res.latitude
              location = res.latitude + ":" + res.longitude
              _this.Weather(res.latitude, res.longitude)
            },
          })
        } else {
          wx.showToast({
            title: '检测到您没获得位置权限，请先开启哦',
            icon: "none",
            duration: 3000
          })
        }
      }
    })
  },

    /**
     * 生命周期函数--监听页面加载
     */

    bindInput(e) {
        console.log(e)
        this.setData({
            [e.currentTarget.dataset.key]: e.detail.value
        })
    },

    /**
     * 校园网登录方法
     */
    
    async login() {
        try {
            await login(this.data.account, this.data.password)
        } catch (e) {
            console.error(e)
            if (e.message === '密码错误') {
                await showError('密码错误')
            } else {
                await showError()
            }

        }
    },

    /**
     * Oauth授权方法
     */
    async authorize() {
        try {
            await authorize()
        } catch (e) {
            console.error(e)
            if (e.message.indexOf('Oauth登录过期，请重新登录') > -1) {
                await showError('登录过期，请重新登录')
                console.log('重定向到登录页面')
            } else {
                await showError()
            }
        }
    },

    async getUserInfo() {
        await request({
            url: api.user_info
        })
    },


    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {

    }
})
