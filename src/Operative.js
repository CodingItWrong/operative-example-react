import uuid from 'uuid/v4';

export default class Operative {
  #httpClient;
  #records;
  #lastUpdate;

  constructor({httpClient}) {
    this.#httpClient = httpClient;
  }

  loadAll() {
    return this.#httpClient.get('/').then(({data}) => {
      this.#records = data;
      this.#recordUpdate();
    });
  }

  get records() {
    return this.#records;
  }

  applyRemoteOperations() {
    const url = `/operations?since=${this.#lastUpdate}`;
    return this.#httpClient.get(url).then(this.#handleRemoteOperations);
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

  #sendOperations = operations => {
    const url = `/operations?since=${this.#lastUpdate}`;
    return this.#httpClient.post(url, operations, {
      headers: {'Content-Type': 'application/json'},
    });
  };

  #recordUpdate = () => {
    this.#lastUpdate = new Date().getTime();
  };

  #handleRemoteOperations = ({data: operations}) => {
    this.#records = operations.reduce(this.#applyOperation, this.#records);
    this.#recordUpdate();
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
