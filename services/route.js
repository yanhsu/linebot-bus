class Route {
  async create(values) {
    return await models.busroute.create(values);
  }

  async updateOrInsert(values, conditions) {
    let obj = await models.busroute.findOne({where: conditions});
    if(obj) {
      return await obj.update(values);
    } else {
      return await models.busroute.create(values);
    }
  }

  async findAll() {
    return await models.busroute.findAll();
  }
}

module.exports = Route;