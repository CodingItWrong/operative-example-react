import uuid from 'uuid/v4';

export default class Operative {
  #httpClient;
  #records;
  #operationsEnqueuedForServer;
  #lastSync;

  constructor({httpClient}) {
    this.#httpClient = httpClient;
    this.#operationsEnqueuedForServer = [];
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

  sync() {
    const operations = this.#operationsEnqueuedForServer;
    console.log({operations});

    const request =
      operations.length === 0
        ? this.#getOperations()
        : this.#sendOperations(operations);
    return request.then(returnedOperations => {
      this.#applyOperations(returnedOperations, {skip: operations});
      this.#operationsEnqueuedForServer = [];
    });
  }

  create(attributes) {
    const createOperation = {
      action: 'create',
      id: uuid(),
      recordId: uuid(),
      attributes,
    };
    return this.#sendOperationsWithQueueing([createOperation]).then(
      this.#applyOperations,
    );
  }

  update(record, attributes) {
    const updateOperation = {
      action: 'update',
      id: uuid(),
      recordId: record.id,
      attributes,
    };
    return this.#sendOperationsWithQueueing([updateOperation]).then(
      this.#applyOperations,
    );
  }

  delete(recordToDelete) {
    const deleteOperation = {
      action: 'delete',
      id: uuid(),
      recordId: recordToDelete.id,
    };
    return this.#sendOperationsWithQueueing([deleteOperation]).then(
      this.#applyOperations,
    );
  }

  #operationsUrl = () => `/operations?since=${this.#lastSync}`;

  #sendOperationsWithQueueing = operations => {
    return this.#sendOperations(operations).catch(e => {
      console.log(e);
      this.#operationsEnqueuedForServer = [
        ...this.#operationsEnqueuedForServer,
        ...operations,
      ];

      // resolve to allow applying operations locally
      return operations;
    });
  };

  #getOperations = () => {
    return this.#httpClient
      .get(this.#operationsUrl())
      .then(({data: operations}) => operations);
  };

  #sendOperations = operations => {
    console.log('#sendOperations', {operations});
    return this.#httpClient
      .post(this.#operationsUrl(), operations, {
        headers: {'Content-Type': 'application/json'},
      })
      .then(({data: operations}) => operations);
  };

  #trackLastSync = () => {
    this.#lastSync = new Date().getTime();
  };

  #applyOperations = (operations, {skip = []} = {}) => {
    const idsToSkip = skip.map(o => o.id);
    const operationsToApply = operations.filter(o => !idsToSkip.includes(o.id));
    this.#records = operationsToApply.reduce(
      this.#applyOperation,
      this.#records,
    );
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
