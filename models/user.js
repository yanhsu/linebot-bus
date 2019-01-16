module.exports = (sequelize, DataTypes) => {
    var User = sequelize.define('User', {
        lineId: {
            allowNull: false,
            type: DataTypes.STRING,
        }
    });

    User.associate = function (models) {
        User.hasMany(models.Favorite);
    };
    return User;
};