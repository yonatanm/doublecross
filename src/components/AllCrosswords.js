import { formatDate } from "../utils";
import { getAllCrosswords } from "../Firebase";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function AllCrosswords() {
  const [allCrosswords, setAllCrosswords] = useState();
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const res = await getAllCrosswords();
      console.log("got all crosswords ", res);
      setAllCrosswords(res);
    })();
  }, []);

  const modelToItem = (model) => {
    const item = {}; //JSON.parse(JSON.stringify(model))
    item.id = model.id;
    item.createdAt = formatDate(new Date(model.createdAt.seconds * 1000));
    item.updatedAt = formatDate(new Date(model.updatedAt.seconds * 1000));
    item.text = model.textInput;
    return item;
  };

  const showFilter = () => {
    return (
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        ></input>
      </div>
    );
  };

  const applyFilter = (item) => {
    if (!search || search?.trim().length === 0) return true;
    return item.text.indexOf(search.trim()) >= 0;
    
  };

  const showGrid = () => {
    if (!allCrosswords) {
      return <></>;
    }
    return (
      <div>
        {showFilter()}
        <ul>
          {allCrosswords
            .map((model) => modelToItem(model))
            .filter((item) => applyFilter(item))
            .map((item) => {
              return (
                <li key={item.id}>
                  <Link to={"/crosswords/" + item.id}>
                    {item.id} - {item.createdAt} ({item.updatedAt}) 
                  </Link>
                </li>
              );
            })}
        </ul>
      </div>
    );
  };

  return <h1>{showGrid()}</h1>;
}
