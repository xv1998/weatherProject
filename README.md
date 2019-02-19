# weatherProject

### 这个项目基于小程序自带的map组件和和风天气提供的api来完成的

### 用到的技术

#### map
longitude和latitude属性是设置地图中心位置的经纬度，代码示例：
```
wx.getLocation({
      type: 'wgs84',   //默认为 wgs84 返回 gps 坐标，gcj02 返回可用于 wx.openLocation 的坐标 
      success: function (res) {
        // success  
        var longitude = res.longitude
        var latitude = res.latitude
        _self.loadCity(longitude, latitude)
        console.log(longitude, latitude)
      }
    })

```

#### 地址反编码
代码示例：
```
loadCity: function (longitude, latitude) {
    var _self = this;
    wx.request({
      url: 'https://restapi.amap.com/v3/geocode/regeo',
      data: {
        key: '你的高德key',
        location: longitude + "," + latitude,
        extensions: "all",
        s: "rsx",
        sdkversion: "sdkversion",
        logversion: "logversion"
 
      },
      success: function (res) {
        _self.setData({
          city: res.data.regeocode.addressComponent.city
        })
        // console.log(res.data.regeocode.addressComponent.city);
      },
      fail: function (res) {
        console.log('获取地理位置失败')
      }
    })
  }

```
