import uuid from 'uuid/v4';

export default class Operative {
  #httpClient;
  #records;
  #lastSync;

  constructor({httpClient}) {
    this.#httpClient = httpClient;
  }

  loadAll() {
    return this.#httpClient.get('/').then(({data}) => {
      this.#records = data;
      this.#trackLastSync();
    });
  }

  get records() {
    return this.#records;
  }

  applyRemoteOperations() {
    return this.#httpClient
      .get(this.#operationsUrl())
      .then(this.#handleRemoteOperations);
  }

  create(attributes) {
    const createOperation = {
      action: 'create',
      id: uuid(),
      recordId: uuid(),
      attributes,
    };
    return this.#sendOperations([createOperation]).then(
      this.#handleRemoteOperations,
    );
  }

  update(record, attributes) {
    const updateOperation = {
      action: 'update',
      id: uuid(),
      recordId: record.id,
      attributes,
    };
    return this.#sendOperations([updateOperation]).then(
      this.#handleRemoteOperations,
    );
  }

  delete(recordToDelete) {
    const deleteOperation = {
      action: 'delete',
      id: uuid(),
      recordId: recordToDelete.id,
    };
    return this.#sendOperations([deleteOperation]).then(
      this.#handleRemoteOperations,
    );
  }

  #operationsUrl = () => `/operations?since=${this.#lastSync}`;

  #sendOperations = operations => {
    return this.#httpClient.post(this.#operationsUrl(), operations, {
      headers: {'Content-Type': 'application/json'},
    });
  };

  #trackLastSync = () => {
    this.#lastSync = new Date().getTime();
  };

  #handleRemoteOperations = ({data: operations}) => {
    this.#records = operations.reduce(this.#applyOperation, this.#records);
    this.#trackLastSync();
  };

  #applyOperation = (records, operation) => {
    switch (operation.action) {
      case 'create': {
        const record = {
          id: operation.recordId,
          ...operation.attributes, // TODO: handle server-generated attributes. Or maybe we can't have those in this model. at least dates?
        };
        return [...records, record];
      }
      case 'update':
        return records.map(record =>
          record.id === operation.recordId
            ? {...record, ...operation.attributes}
            : record,
        );
      case 'delete':
        return records.filter(record => record.id !== operation.recordId);
    }
  };
}
