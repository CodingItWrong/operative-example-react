import {useState, useMemo, useCallback, useEffect} from 'react';
import Operative from './Operative';

const useOperative = ({httpClient}) => {
  const operative = useMemo(() => new Operative({httpClient}), [httpClient]);
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

  const applyRemoteOperations = useCallback(
    () => operative.applyRemoteOperations().then(updateState),
    [operative, updateState],
  );

  useEffect(() => {
    operative.loadAll().then(updateState);
  }, [operative, updateState]);

  return {records, create, update, destroy, applyRemoteOperations};
};

export default useOperative;
