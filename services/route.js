class Route {
  async create(values) {
    return await models.Route.create(values);
  }

  async updateOrInsert(values, conditions) {
    let obj = await models.Route.findOne({where: conditions});
    if(obj) {
      return await obj.update(values);
    } else {
      return await models.Route.create(values);
    }
  }
}

module.exports = Route;