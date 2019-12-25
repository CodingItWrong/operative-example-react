import uuid from 'uuid/v4';

// queuedOps are already applied locally, so for this implementation don't need to apply again
// but do need to pass them in here in case future algorithms need them
// eslint-disable-next-line no-unused-vars
export const handleOutOfOrderSloppy = ({queuedOps, remoteOps, newOps = []}) => [
  ...remoteOps,
  ...newOps,
];

class Operative {
  #httpClient;
  #webSocket;
  #handleOutOfOrder;
  #persister;
  #onChange;
  #records;
  #operationsEnqueuedForServer;
  #lastSync;

  constructor({
    httpClient,
    webSocket,
    handleOutOfOrder,
    persister,
    onChange,
    records = [],
    operationsEnqueuedForServer = [],
    lastSync = null,
  } = {}) {
    if (!httpClient) throw new Error('httpClient must be provided');
    if (!handleOutOfOrder) throw new Error('handleOutOfOrder must be provided');
    if (!persister) throw new Error('persister must be provided');

    this.#httpClient = httpClient;
    this.#webSocket = webSocket;
    this.#handleOutOfOrder = handleOutOfOrder;
    this.#persister = persister;
    this.#onChange = onChange;
    this.#records = records;
    this.#operationsEnqueuedForServer = operationsEnqueuedForServer;
    this.#lastSync = lastSync;

    this.#setUpWebSocket();
  }

  loadAll() {
    return this.#httpClient.get('/').then(({data}) => {
      this.#records = data;
      this.#trackLastSync();
      this.#persist();
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

    if (this.#webSocket && this.#webSocket.readyState === WebSocket.OPEN) {
      console.log('sending via web socket');
      const message = JSON.stringify(operations);
      this.#webSocket.send(message);
      return Promise.resolve(operations);
    } else {
      console.log('sending via http');
      return this.#httpClient
        .post(this.#operationsUrl(), operations, {
          headers: {'Content-Type': 'application/json'},
        })
        .then(({data: operations}) => operations);
    }
  };

  #trackLastSync = () => {
    this.#lastSync = new Date().getTime();
  };

  #applyOperations = operations => {
    this.#records = operations.reduce(this.#applyOperation, this.#records);
    this.#trackLastSync();
    this.#persist();
    if (this.#onChange) {
      this.#onChange(this.#records);
    }
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

  #persist = () => {
    const data = {
      records: this.#records,
      operationsEnqueuedForServer: this.#operationsEnqueuedForServer,
      lastSync: this.#lastSync,
    };
    this.#persister.save(data);
  };

  #setUpWebSocket = () => {
    const socket = this.#webSocket;

    socket.onopen = () => {
      console.log('Web socket connected');
    };

    socket.onclose = () => {
      console.log('Web socket closed');
    };

    socket.onmessage = ({data: message}) => {
      const operations = JSON.parse(message);
      console.log(`Operations: ${message}`);
      this.#applyOperations(operations);
    };
  };
}

const OperativeFactory = {
  create: ({
    httpClient,
    webSocket,
    handleOutOfOrder,
    persister,
    onChange,
  } = {}) => {
    if (!persister) throw new Error('persister must be provided');

    return persister.load().then(persistedData => {
      return new Operative({
        httpClient,
        webSocket,
        handleOutOfOrder,
        persister,
        onChange,
        ...persistedData,
      });
    });
  },
};

export default OperativeFactory;
