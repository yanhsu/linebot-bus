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
}

module.exports = Favorite;