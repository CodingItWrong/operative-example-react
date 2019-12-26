import React, {useState} from 'react';
import axios from 'axios';
import {useOperative, handleOutOfOrderSloppy} from 'operative-react';
import LocalStoragePersister from 'operative-local-storage';

const httpClient = axios.create({
  baseURL: 'http://localhost:3000/todos',
});
const webSocket = new WebSocket('ws://localhost:3000');

const persister = new LocalStoragePersister('operative');

const TodoList = () => {
  const {ready, records, create, update, destroy, sync} = useOperative({
    httpClient,
    webSocket,
    persister,
    handleOutOfOrder: handleOutOfOrderSloppy,
  });
  const [name, setName] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    create({name}).then(() => setName(''));
  };

  const handleRename = todoToRename => update(todoToRename, {name: 'Renamed'});

  const handleDelete = todoToDelete => destroy(todoToDelete);

  if (!ready) {
    return <p>Loading…</p>;
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </form>
      <button onClick={sync}>Sync</button>
      <ul>
        {records.map(todo => (
          <li key={todo.id}>
            {todo.name}
            <button type="button" onClick={() => handleRename(todo)}>
              Rename
            </button>
            <button type="button" onClick={() => handleDelete(todo)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};

export default TodoList;
