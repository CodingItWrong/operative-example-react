import {useState, useMemo, useCallback, useEffect} from 'react';
import Operative from './Operative';

const useOperative = ({httpClient}) => {
  const operative = useMemo(() => new Operative({httpClient}), [httpClient]);
  const [records, setRecords] = useState([]);

  const create = useCallback(
    attributes =>
      operative.create(attributes).then(() => setRecords(operative.records)),
    [operative],
  );

  const update = useCallback(
    (record, attributes) =>
      operative
        .update(record, attributes)
        .then(() => setRecords(operative.records)),
    [operative],
  );

  const destroy = useCallback(
    recordToDelete =>
      operative
        .delete(recordToDelete)
        .then(() => setRecords(operative.records)),
    [operative],
  );

  const applyRemoteOperations = useCallback(
    () =>
      operative
        .applyRemoteOperations()
        .then(() => setRecords(operative.records)),
    [operative],
  );

  useEffect(() => {
    operative.loadAll().then(() => setRecords(operative.records));
  }, [operative]);

  return {records, create, update, destroy, applyRemoteOperations};
};

export default useOperative;
