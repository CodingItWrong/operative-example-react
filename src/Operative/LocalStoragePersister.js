export class LocalStoragePersister {
  #key;

  constructor(key) {
    if (!key) throw new Error('key must be provided');

    this.#key = key;
  }

  save(data) {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(this.#key, serializedData);
    console.log('LocalStoragePersister.save()', serializedData);
    return Promise.resolve();
  }

  load() {
    const serializedData = localStorage.getItem(this.#key);
    console.log('LocalStoragePersister.load()', serializedData);
    let data;
    if (serializedData == null) {
      data = null;
    } else {
      data = JSON.parse(serializedData);
    }
    return Promise.resolve(data);
  }
}
