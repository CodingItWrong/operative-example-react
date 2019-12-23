import {useState, useCallback, useEffect} from 'react';
import Operative from './Operative';

const useOperative = ({httpClient, handleOutOfOrder}) => {
  const [operative, setOperative] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    Operative.create({httpClient, handleOutOfOrder}).then(newOperative => {
      setOperative(newOperative);
    });
  }, [httpClient, handleOutOfOrder]);

  const ready = operative !== null;

  const updateState = useCallback(() => setRecords(operative.records), [
    operative,
  ]);

  const create = useCallback(
    attributes => operative.create(attributes).then(updateState),
    [operative, updateState],
  );

  const update = useCallback(
    (record, attributes) =>
      operative.update(record, attributes).then(updateState),
    [operative, updateState],
  );

  const destroy = useCallback(
    recordToDelete => operative.delete(recordToDelete).then(updateState),
    [operative, updateState],
  );

  const sync = useCallback(() => operative.sync().then(updateState), [
    operative,
    updateState,
  ]);

  useEffect(() => {
    if (ready) {
      operative.loadAll().then(updateState);
    }
  }, [ready, operative, updateState]);

  return {ready, records, create, update, destroy, sync};
};

export {useOperative};
