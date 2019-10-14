/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { Id64String } from "@bentley/bentleyjs-core";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { ViewportComponent } from "@bentley/ui-components";
import { viewWithUnifiedSelection } from "@bentley/presentation-components";
import Toolbar from "./Toolbar";
import PropertiesButton from "./PropertiesButton";

// create a HOC viewport component that supports unified selection
// tslint:disable-next-line:variable-name
const SimpleViewport = viewWithUnifiedSelection(ViewportComponent);

/** React properties for the viewport component */
export interface ViewportProps {
  /** iModel whose contents should be displayed in the viewport */
  imodel: IModelConnection;
  /** View definition to use when the viewport is first loaded */
  viewDefinitionId: Id64String;
  /** ID of the presentation rule set to use for unified selection */
  rulesetId: string;
  /** whether or not to show the properties button in the viewport */
  showPropertiesButton: boolean;
  /** whether or not an element is selected in the viewport */
  elementSelected: boolean;
  /** whether or not the viewport is in 3D */
  is3D: boolean;
  /** determines whether the title should say to expand or collapse the view */
  title: string;
}

/** Viewport component for the viewer app */
export default class SimpleViewportComponent extends React.Component<ViewportProps> {

  /** Renders the Viewport */
  public render() {
    if (this.props.showPropertiesButton) { // display the properties button in the viewport
      return (
        <>
          <SimpleViewport
            imodel={this.props.imodel}
            ruleset={this.props.rulesetId}
            viewDefinitionId={this.props.viewDefinitionId}
          />
          <Toolbar is3D={this.props.is3D} title={this.props.title} />
          <PropertiesButton elementSelected={this.props.elementSelected} />
        </>
      );
    } else { // don't display the properties button in the viewport
      return (
        <>
          <SimpleViewport
            imodel={this.props.imodel}
            ruleset={this.props.rulesetId}
            viewDefinitionId={this.props.viewDefinitionId}
          />
          <Toolbar is3D={this.props.is3D} title={this.props.title} />
        </>
      );
    }
  }
}
