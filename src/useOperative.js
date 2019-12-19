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

  const getRemoteOperations = useCallback(
    () =>
      operative.getRemoteOperations().then(operations => {
        let updatedRecords = records;
        console.log({operations});
        operations.forEach(operation => {
          switch (operation.action) {
            case 'create': {
              console.log('create');
              const record = {
                id: operation.recordId,
                ...operation.attributes, // TODO: handle server-generated attributes. Or maybe we can't have those in this model. at least dates?
              };
              updatedRecords = [...updatedRecords, record];
              console.log({updatedRecords});
              break;
            }
            case 'update':
              updatedRecords = updatedRecords.map(record =>
                record.id === operation.recordId
                  ? {...record, ...operation.attributes}
                  : record,
              );
              break;
            case 'delete':
              updatedRecords = updatedRecords.filter(
                record => record.id !== operation.recordId,
              );
              break;
          }
        });
        setRecords(updatedRecords);
      }),
    [operative, records],
  );

  useEffect(() => {
    operative.loadAll().then(setRecords);
  }, [operative]);

  return {records, create, update, destroy, getRemoteOperations};
};

export default useOperative;
