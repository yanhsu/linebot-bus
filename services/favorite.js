class Favorite {
    async create(values) {
        return await models.favorite.create(values);
    }
    
    async findByUserId(UserId) {
        let options = {
            where: {
                "userId": UserId
            }
        };
        let favorites = await models.favorite.findAll(options);
        return favorites;
    }

    async destroyById(favoriteId) {
        let options = {
            where: {
                id: favoriteId
            }
        };
        let result = await models.favorite.destroy(options);
        return result == 1;
    }

    async updateTimeByFavoriteId(favoriteId, time) {
        let options = {
            triggerTime: time
        }
        let result = await models.favorite.update(options, { where: { id: favoriteId }});
        return result;
    }
    
    async findByTriggerTime(time) {
        let options = {
            where: {
                triggerTime: time
            },
            include: [ { model: models.user, require: false }]
        };
        let favorites = await models.favorite.findAll(options);
        return favorites;
    }
}

module.exports = Favorite;