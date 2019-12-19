import {useState, useMemo, useCallback, useEffect} from 'react';
import Operative from './Operative';

const useOperative = ({httpClient}) => {
  const operative = useMemo(() => new Operative({httpClient}), [httpClient]);
  const [records, setRecords] = useState([]);

  const create = useCallback(
    attributes =>
      operative.create(attributes).then(newRecord => {
        setRecords([...records, newRecord]);
      }),
    [operative, records],
  );

  const update = useCallback(
    (record, attributes) =>
      operative.update(record, attributes).then(updatedRecord => {
        setRecords(
          records.map(record =>
            record.id === updatedRecord.id ? updatedRecord : record,
          ),
        );
      }),
    [operative, records],
  );

  const destroy = useCallback(
    recordToDelete =>
      operative
        .delete(recordToDelete)
        .then(deletedRecord =>
          setRecords(records.filter(record => record.id !== deletedRecord.id)),
        ),
    [operative, records],
  );

  useEffect(() => {
    operative.loadAll().then(setRecords);
  }, [operative]);

  return {records, create, update, destroy};
};

export default useOperative;
