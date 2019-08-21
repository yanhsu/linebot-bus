module.exports = (sequelize, DataTypes) => {
    var Favorite = sequelize.define('Favorite', {
        routeId: { // 路線名稱
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
    });
    Favorite.associate = function (models) {
        Favorite.belongsTo(models.User);
    };
    return Favorite;
};