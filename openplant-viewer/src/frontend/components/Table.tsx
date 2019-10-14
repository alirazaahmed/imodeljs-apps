/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { Table } from "@bentley/ui-components";
import {
  IPresentationTableDataProvider,
  PresentationTableDataProvider,
  tableWithUnifiedSelection,
} from "@bentley/presentation-components";

// create a HOC table component that supports unified selection
// tslint:disable-next-line:variable-name
const SimpleTable = tableWithUnifiedSelection(Table);

/** React properties for the table component, that accepts an iModel connection with ruleset id */
export interface IModelConnectionProps {
  /** iModel whose contents should be displayed in the table */
  imodel: IModelConnection;
  /** ID of the presentation rule set to use for creating the content displayed in the table */
  rulesetId: string;
}

/** React properties for the table component, that accepts a data provider */
export interface DataProviderProps {
  /** Custom property pane data provider. */
  dataProvider: IPresentationTableDataProvider;
}

/** React properties for the table component */
export type Props = IModelConnectionProps | DataProviderProps;

/** Table component for the viewer app */
export default class SimpleTableComponent extends React.PureComponent<Props> {

  /** Gets the data provider to fill the Table widget
   * @param props the data provider props
   */
  private getDataProvider(props: Props) {
    if ((props as any).dataProvider) {
      const providerProps = props as DataProviderProps;
      return providerProps.dataProvider;
    } else {
      const imodelProps = props as IModelConnectionProps;
      return new PresentationTableDataProvider({ imodel: imodelProps.imodel, ruleset: imodelProps.rulesetId });
    }
  }

  /** Renders the Table widget */
  public render() {
    return (
      <div style={{ height: "100%" }}>
        <SimpleTable dataProvider={this.getDataProvider(this.props)} />
      </div>
    );
  }
}
