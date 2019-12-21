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
    const allOperations = [...this.#operationsEnqueuedForServer, ...operations];

    return this.#sendOperations(allOperations)
      .then(operationsReturnedFromServer => {
        const result = this.#removeFromSet({
          set: operationsReturnedFromServer,
          itemsToRemove: this.#operationsEnqueuedForServer,
        });
        console.log({
          operations,
          enqueued: this.#operationsEnqueuedForServer,
          allOperations,
          operationsReturnedFromServer,
          result,
        });
        return result;
      })
      .catch(e => {
        console.log(e);
        this.#operationsEnqueuedForServer = allOperations;

        // resolve to allow applying operations locally
        return operations;
      });
  };

  #removeFromSet = ({set, itemsToRemove}) => {
    const idsToRemove = itemsToRemove.map(o => o.id);
    return set.filter(o => !idsToRemove.includes(o.id));
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
    const result = this.#removeFromSet({set: operations, itemsToRemove: skip});
    console.log({operations, skip, result});

    this.#records = result.reduce(this.#applyOperation, this.#records);
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
