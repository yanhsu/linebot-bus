class User {
    async create(values) {
        return await models.user.create(values);
    }

    async findByLineId(lineId) {
        let options = {
            where: { 
                lineId 
            }
        };
        let user =  await models.user.findOne(options);
        return user;
    }
}
module.exports = User;