class User {
    async create(values) {
        return await models.User.create(values);
    }

    async findByLineId(lineId) {
        let options = {
            where: { 
                lineId 
            }
        };
        let user =  await models.User.findOne(options);
        return user;
    }
}
module.exports = User;