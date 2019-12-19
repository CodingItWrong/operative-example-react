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
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
    </>
  );
};

export default TodoList;
