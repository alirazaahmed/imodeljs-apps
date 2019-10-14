/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { IModelApp, IModelConnection } from "@bentley/imodeljs-frontend";
import { Tree } from "@bentley/ui-components";
import { IPresentationTreeDataProvider, PresentationTreeDataProvider, treeWithUnifiedSelection } from "@bentley/presentation-components";

// create a HOC tree component that supports unified selection
// tslint:disable-next-line:variable-name
const SimpleTree = treeWithUnifiedSelection(Tree);

/** React properties for the tree component, that accepts an iModel connection with ruleset id */
export interface IModelConnectionProps {
  /** iModel whose contents should be displayed in the tree */
  imodel: IModelConnection;
  /** ID of the presentation rule set to use for creating the hierarchy in the tree */
  rulesetId: string;
}

/** React properties for the tree component, that accepts a data provider */
export interface DataProviderProps {
  /** Custom tree data provider. */
  dataProvider: IPresentationTreeDataProvider;
}

/** React properties for the tree component */
export type Props = IModelConnectionProps | DataProviderProps;

/** Tree component for the viewer app */
export default class SimpleTreeComponent extends React.PureComponent<Props> {

  /** Returns a data provider for the tree
   * @param props the data provider props
   */
  private getDataProvider(props: Props) {
    if ((props as any).dataProvider) {
      const providerProps = props as DataProviderProps;
      return providerProps.dataProvider;
    } else {
      const imodelProps = props as IModelConnectionProps;
      const provider: PresentationTreeDataProvider = new PresentationTreeDataProvider(imodelProps.imodel, imodelProps.rulesetId);
      // tslint:disable-next-line: no-floating-promises
      return provider;
    }
  }

  /* Fills the tree using the data provider when the app is updated */
  public render() {
    return (
      <>
        <h3 data-testid="tree-component-header">{IModelApp.i18n.translate("SimpleViewer:components.tree")}</h3>
        <div style={{ flex: "1" }}>
          <SimpleTree dataProvider={this.getDataProvider(this.props)} />
        </div>
      </>
    );
  }
}
