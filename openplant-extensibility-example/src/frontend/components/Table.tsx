import * as React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Table.css";
import * as _ from "lodash";
import MUIDataTable, {SelectableRows} from "mui-datatables";
import * as messages from "../../backend/electron/messages";
import {
  createMuiTheme,
  MuiThemeProvider
} from "@material-ui/core";
import { ThemeOptions } from "@material-ui/core/styles/createMuiTheme";


interface TableProps {
  data: any;
  iModelConn: any;
  dbResult: any;
  displayColumns:any;
}

interface TableState {
  elements: any;
  selectedColumns: [];
}

export class Table extends React.Component<TableProps, TableState> {
  constructor(props: any) {
    super(props);
  }

  public customBodyRendererColumn = (value: any, tableMeta: any, updateValue: any) => {
    console.log("Value: ",value, " TableMeta: ",tableMeta, " UpdatedValue: ", updateValue);
    if (value != "" || value) {
      return (
        <div className="ManufacturerColumn" style = {{backgroundColor:"#ecf0f1", borderRadius: 3, width:"100%",}}>
          {value}
        </div>
      );
    }
    return(
      <></>
    );
  }


   materialTheme =() => {
     return createMuiTheme({
      overrides: {
        MUIDataTable:{
          tableRoot:{
            borderRight:"2px solid #34495e",
            borderLeft:"2px solid #34495e",
            borderTop:"2px solid #34495e",
            borderBottom:"2px solid #34495e",
            pointerEvents: "none",

          }
        },

        MUIDataTableHeadCell: {
          fixedHeader: {
            fontSize:12,
            padding: "5px 10px 5px 10px",
            fontFamily:"Arial, Verdana, Sans-serif",
            marginBottom:10,
            marginRight:10,
            borderRight:"1px solid grey",
            borderLeft:"1px solid grey",
            borderTop:"1px solid grey",
            backgroundColor:"#ecf0f1"
          }
        },
        MUIDataTableBodyCell: {
          root: {
            padding: "5px",
            fontSize:10,
            borderRight:"1px solid grey",
            borderLeft:"1px solid grey",
            borderTop:"1px solid grey",
            borderBottom:"1px solid grey",
            textAlign:"center",
          },

        }
      }
    } as ThemeOptions);
  }

  public showMUITable() {

    if (this.state && this.state.elements) {
      let columns = (Object.keys(this.state.elements[0]).map((item: any) => {
        const colVals = this.state.elements.map((element:any) => element[item]);
        console.log(colVals);
        //const isColEmpty = colVals.every((val:any) => String(val) == "" );
        let col: any;
        /*if (isColEmpty) {
          col =  {name: stringManipulator(item.toUpperCase()), options:{display:false} };
        }
        else*/ if (String(item) == "geometry" || String(item) == "geometryStream"|| String(item) == "bBoxHigh" || String(item) == "bBoxLow") {

          col =  {name: stringManipulator(item.toUpperCase()), options:{display:false} };
        }else {
          col = {name: stringManipulator(item.toUpperCase()), options:{display:true} };
        }

        if (String(item) == "mANUFACTURER_ADDRESS" ) {
          col["options"] = Object.assign({customBodyRender:this.customBodyRendererColumn},col["options"]);
        }



        return col;

      }));
      const rows = this.state.elements.map((item: any) => (Object.values(item).map((i: any) => {
        if (typeof i === "object" && i !== null) {
          return String(Object.values(i).map( (rowItem: any) => (String(rowItem).replace(/,/g, ' ')  ) ));
        }else if (typeof i == "number") {
          return String(truncateDecimals(i,2));
        }

        return String(i);

      })) );

      const data = [
         ...rows
      ];

      const options = {
        pagination: false,
        search: false,
        print: false,
        download: true,
        selectableRows: "none" as SelectableRows,
        selectableRowsHeader: false,
        selectableRowsOnClick: false,
        downloadOptions: {filename: "EquipmentList.csv", title:"Dialog", separator: ","}

      };

      return (
        <MuiThemeProvider theme={this.materialTheme()}>
          <MUIDataTable
            title={messages.tableTitle}
            data={data}
            columns={columns as any}
            options={options}
          />
        </MuiThemeProvider>

      );
    }
    return <></>;
  }

  public componentDidMount() {
    // Doing this becasue different elements have different properties, this distorted the data table.
    const unique = [...new Set(...this.props.data.map((element: any) => (Object.keys(element) )))];

      let properties:any ;
      let dataTable = this.props.data;
      const elems = dataTable.map((element: any) => {

        properties = unique.filter((prop: any)=>  !Object.keys(element).includes(prop));

          properties.map((prop: any) => {
            element[prop] = "";
          });
          let orderedElement:any ={};
          this.getColumnNamesForDisplay(Object.keys(element)).forEach((key: any) => {
            orderedElement[key] = element[key];
          });
          return orderedElement;
      });

      this.setState({elements: elems});
  }

  public getColumnNamesForDisplay(keys: any){
    const colsFromFile = this.props.displayColumns;
    const cKeys = keys.map((item:any) => item.toLowerCase().replace(/\s/g, '').replace(/_/g, ''))
    const indices =  colsFromFile.filter((v:any) => {
      let ind = cKeys.findIndex( (value:any) => v == value )
      if( ind != -1 ) { return true;} return false;
    }).map((value:any) => {
      return cKeys.findIndex((v:any) => v == value)
    })
    const cols = indices.map((ind:any) => keys[ind]);
    console.log(cols);
    return cols;

  }

  public getRows() {
    let rows: any;
    let data: any = [];
    console.log(data);

    if (this.state && this.state.elements) {
      data = this.state.elements;
      rows = data.map((element: any) => (
        <tr key={element.id}>
          {Object.values(element).map((value: any,index: number) =>  <td key={index}> {String(value)} </td>)}
        </tr>
      ));
    } else {
      rows = <></>;
    }
    console.log(rows);
    return rows;
  }

  public hideColumn() {
    if (this.state && this.state.elements && this.state.selectedColumns) {
      const cols = this.state.selectedColumns;
      let elems: any = [];
      console.log(cols);
      this.state.elements.map((element: any) => {
        let properties:any;
        let filteredElement = element;
        cols.map((col: any) => {
          properties = Object.keys(element).filter((value: any) =>  value != col);
          console.log(properties);
          filteredElement = _.pick(filteredElement,  properties);
        })
        elems.push(filteredElement);
      });
      this.setState({elements:elems});
      console.log(elems);
    }
  }

  public getColumns() {
    let cols: any;
    let data: any = [];

    if (this.state && this.state.elements) {
      data = this.state.elements[0];
      cols =  Object.keys(data).map((prop: any, index) =>  <th key={index} scope="col"> {prop} </th>)

    } else {
      cols = <></>;
    }
    return cols;
  }

  public getSelectColumns() {
    if ((this.state) && (this.state.elements)) {
      const columnsToRender = (

        Object.keys(this.props.data[0]).map((col: any, index) => <option key={index} value={col}>{col}</option>));
      return (columnsToRender);
    }
    return ("");
  }

  public onColumnChange(e: any) {
    const options = e.target.options;

    let selectedItems:any =[];
    for (let i =0; i< options.length; ++i) {
      if (options[i].selected) {
      selectedItems.push(options[i].value);
      console.log(options[i].value);
      }
    }

    this.setState({selectedColumns: selectedItems});
  }

  public showColumn() {
    if (this.state && this.state.elements && this.state.selectedColumns) {
      const cols = this.state.selectedColumns;
      let elems: any = [];
      let stateElements = this.state.elements;
      console.log(cols);
      this.props.data.map((element: any, index: any) => {
        let properties:any;
        let filteredElement:any = [];
        cols.map((col: any) => {
          properties = Object.keys(element).filter((value: any) =>  value == col);
          console.log(properties);
          filteredElement.push(Object.assign(_.pick(element,  properties), stateElements[index]) );
        })
        elems.push(filteredElement[0]);
      });
      this.setState({elements:elems});
      console.log(elems);
    }
  }

  public render() {
    return (
      <>
      {this.showMUITable()}
      </>
    );
  }
}

export function stringManipulator(propertyNameBefore: any) {
  var propertyNameAfter: string = '';
  if (propertyNameBefore.charAt(1).match(/(?=[a-z])/)) {
    var x = propertyNameBefore.split(/(?=[A-Z])/);
  }
  else
    var x = propertyNameBefore.split("_");
  for (let i = 0; i < x.length; i++) {
    propertyNameAfter = propertyNameAfter + (x[i].charAt(0).toUpperCase() + x[i].slice(1).toLowerCase());
    if (i < x.length - 1) {
      propertyNameAfter = propertyNameAfter + " ";
    }
  }
  return propertyNameAfter;
}

export function truncateDecimals(number: number, digits: number) {
  var multiplier = Math.pow(10, digits),
      adjustedNum = number * multiplier,
      truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);

  return truncatedNum / multiplier;
};
