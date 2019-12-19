import uuid from 'uuid/v4';

export default class Operative {
  #httpClient;

  constructor({httpClient}) {
    this.#httpClient = httpClient;
  }

  loadAll() {
    return this.#httpClient.get('/').then(({data}) => data);
  }

  create(attributes) {
    const createOperation = {
      action: 'create',
      id: uuid(),
      recordId: uuid(),
      attributes,
    };
    return this.#sendOperations([createOperation]).then(({data}) => ({
      id: data[0],
      ...attributes,
    }));
  }

  update(record, attributes) {
    const updateOperation = {
      action: 'update',
      id: uuid(),
      recordId: record.id,
      attributes,
    };
    return this.#sendOperations([updateOperation]).then(() => ({
      ...record,
      ...attributes,
    }));
  }

  delete(record) {
    const deleteOperation = {action: 'delete', id: uuid(), recordId: record.id};
    return this.#sendOperations([deleteOperation]).then(() => record);
  }

  #sendOperations = operations => {
    return this.#httpClient.post('/', operations, {
      headers: {'Content-Type': 'application/json'},
    });
  };
}
