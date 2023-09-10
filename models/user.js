module.exports = (sequelize, DataTypes) => {
    var User = sequelize.define('user', {
        lineId: {
            allowNull: false,
            type: DataTypes.STRING,
        }
    }, {schema:"bus"});

    User.associate = function (models) {
        User.hasMany(models.favorite);
    };
    return User;
};