import {useState, useCallback, useEffect} from 'react';
import Operative from './Operative';

const useOperative = ({httpClient, webSocket, handleOutOfOrder, persister}) => {
  const [operative, setOperative] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    Operative.create({
      httpClient,
      webSocket,
      handleOutOfOrder,
      persister,
      onChange: setRecords,
    }).then(newOperative => {
      setOperative(newOperative);
    });
  }, [httpClient, webSocket, handleOutOfOrder, persister]);

  const ready = operative !== null;

  const create = useCallback(attributes => operative.create(attributes), [
    operative,
  ]);

  const update = useCallback(
    (record, attributes) => operative.update(record, attributes),
    [operative],
  );

  const destroy = useCallback(
    recordToDelete => operative.delete(recordToDelete),
    [operative],
  );

  const sync = useCallback(() => operative.sync(), [operative]);

  useEffect(() => {
    if (ready) {
      setRecords(operative.records);
      operative.loadAll();
    }
  }, [ready, operative]);

  return {ready, records, create, update, destroy, sync};
};

export {useOperative};
