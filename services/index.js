const UserService = require('./user');
const FavoriteService = require('./favorite');
const RouteService = require('./route');
const CronService = require('./cron');
module.exports = class Services {
    constructor () {
      // export models to global
      global.models = require('../models');
      global.userService = new UserService();
      global.favoriteService = new FavoriteService();
      global.routeService = new RouteService();
      global.cronService = new CronService();
    }
  };