import { formatDate } from "../utils";
import { getAllCrosswords } from "../Firebase";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataGrid, GridRowsProp, GridColDef } from "@mui/x-data-grid";

const columns = [
  {
    field: "id",
    headerName: "מספר",
    width: 150,
    renderCell: (params) => {
      return <Link to={"/crosswords/" + params.row.id}>{params.value}</Link>;
    },
  },
  {
    field: "name",
    headerName: "שם",
    width: 150,
    renderCell: (params) => {
      return <Link to={"/crosswords/" + params.row.id}>{params.value}</Link>;
    },
  },
  {
    field: "text",
    headerName: "תוכן",
    width: 150,
    renderCell: (params) => {
      return <Link to={"/crosswords/" + params.row.id}>{params.value}</Link>;
    },
  },
  { field: "createdAt", headerName: "תאריך יצירה", width: 300, 
  renderCell: (params) => {
    return (<Link to={"/crosswords/" + params.row.id}>{params.value}</Link>)
  }, },
  { field: "updatedAt", headerName: "תאריך עדכון", width: 300, 
  renderCell: (params) => {
    return (<Link to={"/crosswords/" + params.row.id}>{params.value}</Link>)
  }, },
];

export default function AllCrosswords() {
  const [allCrosswords, setAllCrosswords] = useState();
  const [search, setSearch] = useState("");

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
      <div style={{ height: 400, width: "100%" }}>
        {showFilter()}

        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ flexGrow: 1 }}>
            <DataGrid
              rowLength={5}
              maxColumns={6}
              rows={allCrosswords
                .map((model) => modelToItem(model))
                .filter((item) => applyFilter(item))}
              columns={columns}
            />
          </div>
        </div>
      </div>
    );
  };

  return <h1>{showGrid()}</h1>;
}
