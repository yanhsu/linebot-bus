const UserService = require('./user');
const FavoriteService = require('./favorite')
module.exports = class Services {
    constructor () {
      // export models to global
      global.models = require('../models');
      global.userService = new UserService();
      global.favoriteService = new FavoriteService();
    }
  };