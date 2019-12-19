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
    return this.#httpClient.get(url).then(({data: operations}) => {
      let updatedRecords = this.#records;
      operations.forEach(operation => {
        switch (operation.action) {
          case 'create': {
            const record = {
              id: operation.recordId,
              ...operation.attributes, // TODO: handle server-generated attributes. Or maybe we can't have those in this model. at least dates?
            };
            updatedRecords = [...updatedRecords, record];
            break;
          }
          case 'update':
            updatedRecords = updatedRecords.map(record =>
              record.id === operation.recordId
                ? {...record, ...operation.attributes}
                : record,
            );
            break;
          case 'delete':
            updatedRecords = updatedRecords.filter(
              record => record.id !== operation.recordId,
            );
            break;
        }
      });
      this.#records = updatedRecords;
    });
  }

  create(attributes) {
    const createOperation = {
      action: 'create',
      id: uuid(),
      recordId: uuid(),
      attributes,
    };
    return this.#sendOperations([createOperation]).then(() => {
      const newRecord = {
        id: createOperation.recordId,
        ...attributes,
      };
      this.#records = [...this.#records, newRecord];
    });
  }

  update(record, attributes) {
    const updateOperation = {
      action: 'update',
      id: uuid(),
      recordId: record.id,
      attributes,
    };
    return this.#sendOperations([updateOperation]).then(() => {
      const updatedRecord = {
        ...record,
        ...attributes,
      };
      this.#records = this.#records.map(record =>
        record.id === updatedRecord.id ? updatedRecord : record,
      );
    });
  }

  delete(recordToDelete) {
    const deleteOperation = {
      action: 'delete',
      id: uuid(),
      recordId: recordToDelete.id,
    };
    return this.#sendOperations([deleteOperation]).then(() => {
      this.#records = this.#records.filter(
        record => record.id !== recordToDelete.id,
      );
    });
  }

  #sendOperations = operations => {
    return this.#httpClient.post('/operations', operations, {
      headers: {'Content-Type': 'application/json'},
    });
  };

  #recordUpdate = () => {
    this.#lastUpdate = new Date().getTime();
  };
}
