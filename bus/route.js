const axios = require('axios');
const { getAuthorizationHeader } = require('../util/common');

class Route {
	async getRoute(routeId) {
		try {
			return await axios({
				url: `https://ptx.transportdata.tw/MOTC/v2/Bus/Route/City/Taichung/?$filter=%20RouteID%20eq%20%27${routeId}%27&$format=json`,
				method: 'get',
				headers: getAuthorizationHeader(),
			});
		} catch (error) {
			throw error;
		}
	}
	async getStop(routeId, direction) {
		try {
			return await axios({
				url: `https://ptx.transportdata.tw/MOTC/v2/Bus/StopOfRoute/City/Taichung/?$filter=%20RouteID%20eq%20%27${routeId}%27%20and%20Direction%20eq%20%27${direction}%27&$format=json`,
				method: 'get',
				headers: getAuthorizationHeader(),
			});
		} catch (error) {
			throw error;
		}
  }
  async getEstimateTime(routeId, direction, stopSequence) {
    try {
			return await axios({
				url: `https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/Taichung?$filter=RouteName%2FZh_tw%20eq%20%27${routeId}%27%20and%20Direction%20eq%20%27${direction}%27%20and%20StopSequence%20eq%20${stopSequence}&$format=json`,
				method: 'get',
				headers: getAuthorizationHeader(),
			});
		} catch (error) {
			throw error;
		}
  }
  async getEstimateTimeByStopId(routeId, direction, stopId) {
    try {
			return await axios({
				url: `https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/Taichung?$filter=RouteName%2FZh_tw%20eq%20%27${routeId}%27%20and%20Direction%20eq%20%27${direction}%27%20and%20StopID%20eq%20%27${stopId}%27&$format=json`,
				method: 'get',
				headers: getAuthorizationHeader(),
			});
		} catch (error) {
			throw error;
		}
  }
}
function createRoute() {
	return new Route();
}
module.exports = createRoute();