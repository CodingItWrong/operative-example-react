export default class Operative {
  #httpClient;

  constructor({httpClient}) {
    this.#httpClient = httpClient;
  }

  loadAll() {
    return this.#httpClient.get('/').then(({data}) => data);
  }

  create(attributes) {
    const createOperation = {action: 'create', attributes};
    return this.#httpClient
      .post('/', [createOperation], {
        headers: {'Content-Type': 'application/json'},
      })
      .then(({data}) => ({
        id: data[0],
        ...attributes,
      }));
  }

  update(record, attributes) {
    const updateOperation = {action: 'update', id: record.id, attributes};
    return this.#httpClient
      .post('/', [updateOperation], {
        headers: {'Content-Type': 'application/json'},
      })
      .then(() => ({
        ...record,
        ...attributes,
      }));
  }

  delete(record) {
    const deleteOperation = {action: 'delete', id: record.id};
    return this.#httpClient
      .post('/', [deleteOperation], {
        headers: {'Content-Type': 'application/json'},
      })
      .then(() => record.id);
  }
}
