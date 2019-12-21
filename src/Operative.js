import uuid from 'uuid/v4';

// queuedOps are already applied locally, so for this implementation don't need to apply again
// but do need to pass them in here in case future algorithms need them
// eslint-disable-next-line no-unused-vars
export const handleOutOfOrderSloppy = ({queuedOps, remoteOps, newOps = []}) => [
  ...remoteOps,
  ...newOps,
];

export default class Operative {
  #httpClient;
  #handleOutOfOrder;
  #records;
  #operationsEnqueuedForServer;
  #lastSync;

  constructor({httpClient, handleOutOfOrder}) {
    this.#httpClient = httpClient;
    this.#handleOutOfOrder = handleOutOfOrder;
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
    const queuedOps = this.#operationsEnqueuedForServer; // A
    console.log({queuedOps});

    if (queuedOps.length === 0) {
      return this.#getOperations().then(this.#applyOperations);
    }

    return this.#sendOperations(queuedOps).then(remoteOps => {
      const operationsToApply = this.#handleOutOfOrder({
        remoteOps,
        queuedOps,
      });
      // Just receives C back
      // Call the reconciliation function here, with A and C, and B is empty
      this.#applyOperations(operationsToApply);
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

  #sendOperationsWithQueueing = newOps => {
    const queuedOps = this.#operationsEnqueuedForServer;

    // A = this.#operationsEnqueuedForServer
    // B = operations
    const operationsToSendToServer = [...queuedOps, ...newOps];

    // Sends A and B
    return this.#sendOperations(operationsToSendToServer)
      .then(remoteOps => {
        const operationsToApply = this.#handleOutOfOrder({
          remoteOps,
          newOps,
          queuedOps,
        });
        console.log({
          newOps,
          queuedOps,
          remoteOps,
          operationsToSendToServer,
          operationsToApply,
        });
        this.#operationsEnqueuedForServer = [];
        return operationsToApply;
      })
      .catch(e => {
        console.log(e);
        this.#operationsEnqueuedForServer = operationsToSendToServer;

        // resolve to allow applying operations locally
        return newOps;
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

  #applyOperations = operations => {
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
