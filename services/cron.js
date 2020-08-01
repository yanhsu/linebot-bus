const cron = require('node-cron');
const bus = require('../bus/route');
const moment = require('moment-timezone');
const { formatEstimatedTimeOfArrival } = require('../util/common');
class Cron {
  Cron() {

  }
  async pushFavoriteStop(bot) {
    const timeNow = moment().tz("Asia/Taipei").format("HH:mm");
    const favorites = await favoriteService.findByTriggerTime(timeNow);
    for(let favorite of favorites) {
      let res = await bus.getEstimateTimeByStopId(favorite.routeId, favorite.direction, favorite.stopId);
      const msg = formatEstimatedTimeOfArrival(res.data[0]);
      console.log(`push to client => ${favorite.routeId}路公車 \n${res.data[0].StopName.Zh_tw}站 ${msg}`)
      bot.push(favorite.User.lineId, `${favorite.routeId}路公車 \n${res.data[0].StopName.Zh_tw}站 ${msg}`);
    }
  }

  async updateRouteInfo() {
    const res= await bus.getAllRoute();
    for(let route of res.data) {
      let value = {
        routeUID: route.RouteUID,
        routeName: route.RouteName.Zh_tw,
        departureStopName: route.DepartureStopNameZh,
        destinationStopName: route.DestinationStopNameZh
      }
      const condition = {
        routeUID: route.RouteUID
      }
      await routeService.updateOrInsert(value, condition);
    }
  }

  async setCache(myCache) {
    const allRoute = await routeService.findAll();
    for(let route of allRoute) {
      console.log(route.routeName);
      myCache.set(route.routeName, route.dataValues, 86400);
    }
  }

}

module.exports = Cron;