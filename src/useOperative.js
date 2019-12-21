import {useState, useMemo, useCallback, useEffect} from 'react';
import Operative from './Operative';

const useOperative = ({httpClient, handleOutOfOrder}) => {
  const operative = useMemo(
    () => new Operative({httpClient, handleOutOfOrder}),
    [httpClient],
  );
  const [records, setRecords] = useState([]);

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
    operative.loadAll().then(updateState);
  }, [operative, updateState]);

  return {records, create, update, destroy, sync};
};

export default useOperative;
