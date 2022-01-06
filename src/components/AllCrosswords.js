import { formatDate } from "../utils";
import { getAllCrosswords } from "../Firebase";
import { useEffect, useState } from "react";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { useNavigate , Link} from "react-router-dom";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function AllCrosswords() {
  const navigate = useNavigate();
  const columns = [
    // {
    //   field: "id",
    //   headerName: "מספר",
    //   width: 150,      
    // },
    {
      field: "name",
      headerName: "שם",
      width: 150,     
    },
    {
      field: "text",
      headerName: "תוכן",
      width: 150,      
    },
    {
      field: "createdAt",
      headerName: "תאריך יצירה",
      width: 300,
      valueFormatter: ({ value }) => formatDate(new Date(value)),
    },
    {
      field: "updatedAt",
      headerName: "תאריך עדכון",
      width: 300,
      valueFormatter: ({ value }) => formatDate(new Date(value)),
    },
    {
      field: "act-ions",
      type: "actions",
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          component={Link}
          to={`/crosswords/${params.id}`}
          label="Edit"
        />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" />,
      ],
    },
  ];

  const onClick = (p, e) => {
    console.log("onClick", p, e);
  };
  const [sortModel, setSortModel] = useState([
    {
      field: "updatedAt",
      sort: "desc",
    },
  ]);

  const [allCrosswords, setAllCrosswords] = useState();
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const res = await getAllCrosswords();
      console.log("got all crosswords ", res);
      setAllCrosswords(res);
    })();
  }, []);

  const modelToItem = (model) => ({
    id: model.id,
    createdAt: model.createdAt.seconds * 1000,
    updatedAt: model.updatedAt.seconds * 1000,
    text: model.textInput,
  });

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
              onRowClick={(params) => {
                navigate(`/crosswords/${params.id}`)                
              }}
              sortModel={sortModel}
              rowLength={5}
              disableColumnMenu={true}
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
