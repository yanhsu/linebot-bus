module.exports = (sequelize, DataTypes) => {
  var Route = sequelize.define('Route', {
    routeUID: { // 路線唯一ID
      allowNull: false,
      type: DataTypes.STRING
    },
    routeName: { // 路線名稱
      allowNull: false,
      type: DataTypes.STRING
    },
    departureStopName: {// 起點站名
      allowNull: false,
      type: DataTypes.STRING
    },
    destinationStopName: { // 終點站名
      allowNull: false,
      type: DataTypes.STRING
    }
  });
  return Route;
};