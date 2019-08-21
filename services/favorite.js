class Favorite {
    async create(values) {
        return await models.Favorite.create(values);
    }
    
    async findByUserId(UserId) {
        let options = {
            where: {
                UserId
            }
        };
        let favorites = await models.Favorite.findAll(options);
        return favorites;
    }

    async destroyById(favoriteId) {
        let options = {
            where: {
                id: favoriteId
            }
        };
        let result = await models.Favorite.destroy(options);
        return result == 1;
    }

    async updateTimeByUserId(UserId, routeId,time) {
        let options = {
            triggerTime: time
        }
        let result = await models.Favorite.update(options, { where: { UserId: UserId, routeId }});
        return result;
    }
    
    async findByTriggerTime(time) {
        let options = {
            where: {
                triggerTime: time
            },
            include: [ { model: models.User, require: false }]
        };
        let favorites = await models.Favorite.findAll(options);
        return favorites;
    }
}

module.exports = Favorite;