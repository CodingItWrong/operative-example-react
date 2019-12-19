import React, {useState, useEffect} from 'react';
import axios from 'axios';
import Operative from './Operative';

const httpClient = axios.create({
  baseURL: 'http://localhost:3000/todos',
});

const operative = new Operative({httpClient});

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    operative.loadAll().then(setTodos);
  }, []);

  const handleSubmit = e => {
    e.preventDefault();
    operative.create({name}).then(newTodo => {
      setTodos([...todos, newTodo]);
      setName('');
    });
  };

  const handleRename = todoToRename =>
    operative.update(todoToRename, {name: 'Renamed'}).then(renamedTodo => {
      console.log({renamedTodo});
      setTodos(
        todos.map(todo => (todo.id === renamedTodo.id ? renamedTodo : todo)),
      );
    });

  const handleDelete = todoToDelete =>
    operative
      .delete(todoToDelete)
      .then(deletedTodo =>
        setTodos(todos.filter(todo => todo.id !== deletedTodo.id)),
      );

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </form>
      <ul>
        {todos.map(todo => (
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
