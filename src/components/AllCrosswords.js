import { useEffect, useState, useContext } from "react";
import { formatDate } from "../utils";
import { getAllCrosswords } from "../Firebase";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { useNavigate, Link } from "react-router-dom";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getUrlForScreenshot } from "../Firebase";

export default function AllCrosswords() {
  const [selectedId, setSelectedId] = useState();
  const [previewUrl, setPreviewUrl] = useState();
  const [crosswordName, setCrosswordName] = useState();
  const columns = [
    {
      field: "act-ions",
      type: "actions",
      width: 40,
      getActions: (params) => [
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" />,
        <GridActionsCellItem
          icon={<EditIcon />}
          component={Link}
          to={`/crosswords/${params.id}`}
          label="Edit"
        />,
      ],
    },
    // {
    //   field: "id",
    //   headerName: "מספר",
    //   width: 150,
    // },
    {
      field: "name",
      headerName: "שם",
      width: 300,
      sortable: false,
    },
    // {
    //   field: "text",
    //   headerName: "תוכן",
    //   width: 150,
    // },
    {
      field: "createdAt",
      headerName: "תאריך יצירה",
      width: 300,
      valueFormatter: ({ value }) => formatDate(new Date(value)),
      sortable: false,
    },
    {
      field: "updatedAt",
      headerName: "תאריך עדכון",
      width: 300,
      valueFormatter: ({ value }) => formatDate(new Date(value)),
      sortable: false,
    },
  ];

  const [allCrosswords, setAllCrosswords] = useState();
  // const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const res = await getAllCrosswords();
      console.log("got all crosswords ", res);
      setAllCrosswords(res);
    })();
  }, []);

  const modelToItem = (model) => ({
    id: model.id,
    name: model.name,
    createdAt: model.createdAt.seconds * 1000,
    updatedAt: model.updatedAt.seconds * 1000,
    text: model.textInput,
  });

  // const showFilter = () => {
  //   return (
  //     <div>
  //       <input
  //         type="text"
  //         value={search}
  //         onChange={(e) => {
  //           setSearch(e.target.value);
  //         }}
  //       ></input>
  //     </div>
  //   );
  // };

  // const applyFilter = (item) => {
  //   if (!search || search?.trim().length === 0) return true;
  //   return item.text.indexOf(search.trim()) >= 0;
  // };

  useEffect(() => {
    async function f() {
      if (selectedId) {
        const imageUrl = await getUrlForScreenshot(selectedId);
        console.log("imageUrl", imageUrl);
        setPreviewUrl(imageUrl);
      }
    }
    f();
  }, [selectedId]);

  const showPreview = () => {
    console.log("previewUrl =", previewUrl);
    if (previewUrl) return <img alt="123" src={previewUrl}></img>;
    return <></>;
  };

  const showGrid = () => {
    if (!allCrosswords) {
      return <></>;
    }
    return (
      <div className="all-crosswords-panel">
        <div className="list-panel">
          {/* {showFilter()} */}

          <div style={{ display: "flex", height: "100%" }}>
            <div style={{ flexGrow: 1 }}>
              <DataGrid
                hideFooter={true}
                onRowMouseEnter={(event) => console.log("onAuxClick", event)}
                onRowClick={(params) => {
                  setCrosswordName(params.row.name);
                  setSelectedId(params.id);
                }}
                sortModel={[
                  {
                    field: "updatedAt",
                    sort: "desc",
                  },
                ]}
                rowLength={5}
                disableColumnMenu={true}
                maxColumns={6}
                rows={
                  allCrosswords.map((model) => modelToItem(model))
                  // .filter((item) => applyFilter(item))
                }
                columns={columns}
              />
            </div>
          </div>
        </div>
        <div className="preview-panel">
          <div className="crossword-name">{crosswordName}</div>
          {showPreview()}
        </div>
      </div>
    );
  };

  return <h1>{showGrid()}</h1>;
}
