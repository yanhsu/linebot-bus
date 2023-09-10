module.exports = (sequelize, DataTypes) => {
    var Favorite = sequelize.define('favorite', {
        routeId: { // 路線唯一id
            allowNull: false,
            type: DataTypes.STRING
        },
        routeName: { //路線名稱
            allowNull: false,
            type: DataTypes.STRING
        },
        direction: { // 方向
            allowNull: false,
            type: DataTypes.INTEGER
        },
        stopId: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        stopName: DataTypes.STRING,
        triggerTime: DataTypes.STRING
    }, {schema:"bus"});
    Favorite.associate = function (models) {
        Favorite.belongsTo(models.user);
    };
    return Favorite;
};