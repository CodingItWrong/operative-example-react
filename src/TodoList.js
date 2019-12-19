import React, {useState, useEffect} from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

api.defaults.headers.post['Content-Type'] = 'application/json';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    api.get('/todos').then(({data}) => {
      setTodos(data);
    });
  }, []);

  const handleSubmit = e => {
    e.preventDefault();
    api
      .post('/todos', [
        {
          action: 'create',
          attributes: {name},
        },
      ])
      .then(({data}) => {
        const newTodo = {
          id: data[0],
          name,
        };
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
