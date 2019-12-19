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

  delete(record) {
    const deleteOperation = {action: 'delete', id: record.id};
    return this.#httpClient
      .post('/', [deleteOperation], {
        headers: {'Content-Type': 'application/json'},
      })
      .then(() => record.id);
  }
}
