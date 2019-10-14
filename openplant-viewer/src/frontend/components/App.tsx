/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { Id64String, OpenMode } from "@bentley/bentleyjs-core";
import { Range3d } from "@bentley/geometry-core";
import { AccessToken, ConnectClient, IModelQuery, Project, Config } from "@bentley/imodeljs-clients";
import {
  IModelApp, IModelConnection, FrontendRequestContext, AuthorizedFrontendRequestContext,
  DrawingViewState, ScreenViewport, EmphasizeElements, FeatureOverrideType,
} from "@bentley/imodeljs-frontend";
import { Presentation, SelectionChangeEventArgs, ISelectionProvider } from "@bentley/presentation-frontend";
import { Button, ButtonSize, ButtonType, Spinner, SpinnerSize } from "@bentley/ui-core";
import { SignIn } from "@bentley/ui-components";
import { SimpleViewerApp } from "../api/SimpleViewerApp";
import PropertiesWidget from "./Properties";
import ViewportContentControl from "./Viewport";
import "@bentley/icons-generic-webfont/dist/bentley-icons-generic-webfont.css";
import "./App.css";
import { Drawing } from "@bentley/imodeljs-backend";
import chroma = require("chroma-js");
import distinctColors = require("distinct-colors");
import { ColorDef, ViewDefinitionProps } from "@bentley/imodeljs-common";
import TitleBar from "./Title";
import { ipcRenderer, Event } from "electron";
import { ViewGroupWidget } from "./ViewGroup";
import { fitTheView } from "./Toolbar";
import { delay } from "q";
import * as messages from "../../backend/electron/messages";
import { LayoutGroupWidget } from "./LayoutGroup";
// tslint:disable: no-console
// cSpell:ignore imodels

// Setting instance variables for multi-class usage
export let thisApp: App;
let requestContext: AuthorizedFrontendRequestContext | undefined;
let connectClient: ConnectClient | undefined;
let currentProject: Project;
let currentIModel: string;
let views3D: ViewDefinitionProps[];
let views2D: ViewDefinitionProps[];
let viewMap: Map<string, ViewDefinitionProps>;
let currentProjectName: string = "";
let currentIModelName: string = "";
let initialDrawingName: string = "";
let initialView: ViewDefinitionProps;
let currentView: ViewDefinitionProps;

// Getters for instance variables
export function getCurrentProject() {
  return currentProject;
}
export function getCurrentIModel() {
  return currentIModel;
}
export function get3DViews() {
  return views3D;
}
export function get2DViews() {
  return views2D;
}
export function getInitialView() {
  return initialView;
}

// delay constants
const SHORT: number = 100;
const LONG: number = 1000;

/** Updates the App's view definition
 * @param viewId the new view ID
 */
export async function updateView(viewId: string) {
  await thisApp.onIModelSelected(thisApp.state.imodel, viewId);

  // clear the selection
  clearSelection();
}

/** Updates the App's layout ID
 * @param layoutId the new layout ID
 */
export function updateLayout(layoutId: string) {
  thisApp.setState({ layoutID: layoutId });
}

/** Handles onClick for the Properties toolbar button */
export async function propertiesClick() {
  await thisApp.menuClick();
}

/** Expands a viewport and collapses the other
 * @param is3D whether or not the modified viewport is 3D or not
 */
export function expandCollapseViewport(is3D: boolean) {
  thisApp.setState({
    is2DCollapsed: !thisApp.state.is2DCollapsed && !thisApp.state.is3DCollapsed && !is3D ? true : false,
    is3DCollapsed: !thisApp.state.is2DCollapsed && !thisApp.state.is3DCollapsed && is3D ? true : false,
  });
}

/** Auto-fits the view (if the configuration permits it to do so)
 * @param delayLength the number of milliseconds to wait for the view to load before performing auto-fit
 */
async function autoFitView(delayLength: number) {
  if (Config.App.get("auto_fit_view")) {
    // hard-coded fix to wait for viewer to finish loading
    await delay(delayLength);
    // simulates clicking the fit view button
    fitTheView();
  }
}

/** Clears the elements selected in the viewer */
function clearSelection() {
  // clears the elements selected (removes highlighting and properties from menu)
  Presentation.selection.clearSelection("", thisApp.state.imodel as IModelConnection);
  // updates the app state to indicate no elements are now selected
  thisApp.setState({
    elementSelected: false,
  });
}

/** React state of the App component */
export interface AppState {
  user: {
    accessToken?: AccessToken;
    isLoading?: boolean;
  };
  offlineIModel: boolean;
  imodel?: IModelConnection;
  iModelName: string;
  project?: Project;
  projectName: string;
  drawing?: Drawing;
  drawingName: string;
  viewDefinitionId?: Id64String;
  menuOpened: boolean;
  menuName: string;
  shouldCall: boolean;
  displayProperties: boolean;
  elementSelected: boolean;
  is3DCollapsed: boolean;
  is2DCollapsed: boolean;
  layoutID: string;
}

/** A component the renders the whole application UI */
export default class App extends React.Component<{}, AppState> {

  /** Creates an App instance
   * @param props the data provider props for the applicaiton
   * @param context the context provided for the application
   */
  constructor(props?: any, context?: any) {
    super(props, context);
    this.state = {
      user: {
        isLoading: false,
        accessToken: undefined,
      },
      projectName: currentProjectName,
      iModelName: currentIModelName,
      drawingName: "",
      offlineIModel: false,
      menuOpened: false,
      menuName: "+",
      shouldCall: false,
      // ***change to hide properties when no element selected***
      displayProperties: true, // false,
      elementSelected: false,
      is3DCollapsed: false,
      is2DCollapsed: false,
      layoutID: "left-2d-right-3d", // change this to default layout as well as in LayoutList.tsx
    };
    // this.makeCalls();
    thisApp = this;
  }

  /** React method, activates when the application will be mounted, making initial calls on start-up */
  public async componentWillMount() {
    await this.makeCalls();
  }

  /** Gets the current desired project as saved either from the settings.json file or from the Config.App singleton */
  private async _getCorrectProjectName() {

    // Sets up listener for response back from main/server
    ipcRenderer.on("readConfigResults", async (event: Event, configObject: any) => {
      if (event) {
        console.log(event);
      }

      // assigns correct config value, changes the state of the app accordingly
      this.setState(() => ({
        projectName: configObject.project_name,
        iModelName: configObject.imodel_name,
      }));
      currentProjectName = configObject.project_name;
      currentIModelName = configObject.imodel_name;
      if (configObject.drawing_name) {
        initialDrawingName = configObject.drawing_name;
      }
      if (configObject.project_name && configObject.imodel_name) {
        await this._startProcess(configObject.project_name, configObject.imodel_name);
      }
    });

    // sends signal that main app is ready for config values
    ipcRenderer.send("readConfig", "project");
  }

  /** Returns an updated iModelConnection
   * @param updatedIModelId the new iModel ID
   * @param updatedIModelProjectId the new project ID
   */
  public async updateIModelConnection(updatedIModelId: string, updatedIModelProjectId: string) {
    if (updatedIModelId && updatedIModelProjectId) {
      const iModelConnection = await IModelConnection.open(updatedIModelProjectId, updatedIModelProjectId, OpenMode.Readonly);
      return iModelConnection;
    }
    return "undefined";
  }

  /** React method, after a component mounted sets up non-ui portions */
  public async componentDidMount() {
    // Subscribe for unified selection changes
    Presentation.selection.selectionChange.addListener(this._onSelectionChanged);

    // Initialize authorization state, and add listener to changes
    SimpleViewerApp.oidcClient.onUserStateChanged.addListener(this._onUserStateChanged);
    if (SimpleViewerApp.oidcClient.isAuthorized) {
      await SimpleViewerApp.oidcClient.getAccessToken(new FrontendRequestContext())
        .then((accessToken: AccessToken | undefined) => {
          this.setState((prev) => ({ user: { ...prev.user, accessToken, isLoading: false } }));
        });
    }
  }

  /** React method, activates when the component will be removed  */
  public componentWillUnmount() {
    // Unsubscribe from unified selection changes
    Presentation.selection.selectionChange.removeListener(this._onSelectionChanged);
    // Unsubscribe from user state changes
    SimpleViewerApp.oidcClient.onUserStateChanged.removeListener(this._onUserStateChanged);
  }

  /** Changes the viewport to display a new drawing by drawing ID
   * @param newDrawingId the new drawing ID
   * @param vp the Viewport
   * @param doFit whether or not to change the view to show the whole drawing
   */
  public async changeView(newDrawingId: string, vp: ScreenViewport, doFit?: boolean) {
    const view = vp.view;
    if (!(view instanceof DrawingViewState)) // This only works if the viewport is showing a DrawingView
      return;

    const newView = view.clone(); // Make a copy of the current ViewState. This keeps the set of categories displayed and DisplayStyle
    (newView.baseModelId as Id64String) = newDrawingId; // Change the base model id (cast is necessary since it's marked as readonly after its been constructed)

    await newView.load(); // Load the model
    view.displayStyle.viewFlags.fill = false;
    vp.changeView(newView); // And point the Viewport at the new drawing

    if (doFit) { // Optionally, change the view to show the whole drawing
      const range = await vp.iModel.models.queryModelRanges([newDrawingId]); // Get the drawing's range
      vp.zoomToVolume(Range3d.fromJSON(range[0]), { animateFrustumChange: false }); // Don't bother to animate since starting point is not relevant
    }
  }

  /**
   * Sets up the display of the drawing model with elements colored by their category
   * @param modelId Drawing model id
   * @param vp Viewport the model is displayed in
   */
  public async setupDisplayByCategories(modelId: Id64String, vp: ScreenViewport) {
    // Setup default appearance for "background" elements
    const emphasize = EmphasizeElements.getOrCreate(vp);
    emphasize.createDefaultAppearance();
    // Note: Starting with 0.192.0 (expected to be available June 3, 2019), you can customize defaultAppearance with this call
    // e.g., emphasize.defaultAppearance = FeatureSymbology.Appearance.fromRgb(new ColorDef(ColorByName.lightGray));

    // Determine all distinct categories in the model
    const categoryIds = new Array<Id64String>();
    for await (const categoryId of vp.iModel.query("SELECT DISTINCT Category.Id as id FROM bis.GeometricElement2d WHERE Model.Id=:modelId", { modelId })) {
      categoryIds.push(categoryId.id);
    }

    // Determine a palette of visually distinct colors for every category of elements in the model
    const colorPalette: chroma.Color[] = distinctColors({ count: categoryIds.length });

    // Setup the display for each distinct category in the selected model
    emphasize.clearOverriddenElements(vp);
    for (let ii = 0; ii < categoryIds.length; ii++) {
      // Gather up the elements in the model and category
      const elementIds = new Array<Id64String>();
      const categoryId = categoryIds[ii];
      const ecsql = "SELECT ECInstanceId as id FROM bis.GeometricElement2d WHERE Model.Id=:modelId AND Category.Id=:categoryId";
      for await (const elementId of vp.iModel.query(ecsql, { modelId, categoryId })) {
        elementIds.push(elementId.id);
      }

      // Override the display of the elements
      const overrideColor = ColorDef.from(...colorPalette[ii].rgb());
      emphasize.overrideElements(elementIds, vp, overrideColor, FeatureOverrideType.ColorOnly, false);
    }
  }

  /** When the drawing is changed, handle that change in selection, get a new drawing, and update properties and viewings
   * @param evt the selection change event
   * @param selectionProvider the data provider for the selection change
   */
  private _onSelectionChanged = (evt: SelectionChangeEventArgs, selectionProvider: ISelectionProvider) => {
    const selection = selectionProvider.getSelection(evt.imodel, evt.level);
    if (!selection.isEmpty) {
      selection.instanceKeys.forEach(async (ids, ecClass) => {
        if (ecClass === "BisCore:Drawing") { // If we clicked on a row that is a drawing, switch the view to it.
          const viewport = IModelApp.viewManager.selectedView!;
          const drawingId = ids.values().next().value;
          await this.changeView(drawingId, viewport, true);
          await this.setupDisplayByCategories(drawingId, viewport);
        }
      });
    }
    // ***uncomment to hide properties button & menu when no element selected***
    // this.setState({
    //   displayProperties: !selection.isEmpty,
    // });
    this.setState({
      elementSelected: !selection.isEmpty,
    });
  }

  /** Function for if there is no internet connection */
  private _onOffline = () => {
    this.setState((prev) => ({ user: { ...prev.user, isLoading: false }, offlineIModel: true }));
  }

  /** Handles beginning of sign-in process */
  private _onStartSignin = async () => {
    this.setState((prev) => ({ user: { ...prev.user, isLoading: true } }));
    await SimpleViewerApp.oidcClient.signIn(new FrontendRequestContext());
  }

  /** Handles when the user state changes, quasi-react method
   * @param accessToken the access token for the user's sign-in
   */
  private _onUserStateChanged = (accessToken: AccessToken | undefined) => {
    this.setState((prev) => ({ user: { ...prev.user, accessToken, isLoading: false } }));
  }

  /** Picks the provided spatial view definition in the iModel
   * If none is provided, picks the first
   * @param imodel the iModel connection
   * @param viewId the ID for the provided spatial view definition (if given & valid)
   * @return a promise to the string of the view definition ID
   */
  private async getViewDefinitionId(imodel: IModelConnection, viewId?: string): Promise<Id64String> {
    const viewSpecs = await imodel.views.queryProps({});
    // Array of view definitions, eventually, all 3D view definitions could be changed
    const acceptedViewClasses = [
      "BisCore:OrthographicViewDefinition", // 3D view
      "BisCore:DrawingViewDefinition", // 2D view
    ];

    // Filters the possible view definitions of the imodel down to the accepted onces we provide
    const acceptedViewSpecs = viewSpecs.filter((spec) => (-1 !== acceptedViewClasses.indexOf(spec.classFullName)));
    if (0 === acceptedViewSpecs.length) {
      alert("No valid view definitions for selected iModel. Please select another one.");
      throw new Error("No valid view definitions for selected iModel. Please select another one.");
    }

    if (viewId) {
      // if a view ID is provided, use that to update the current view and return its ID
      currentView = viewMap.get(viewId) as ViewDefinitionProps;
      return viewId!;
    } else {
      // otherwise, load all the available views in the arrays/maps and pick one
      views3D = [];
      views2D = [];
      viewMap = new Map<string, ViewDefinitionProps>();
      for (const elem of acceptedViewSpecs) {
        if (elem.classFullName === "BisCore:OrthographicViewDefinition") {
          // 3D views
          views3D[views3D.length] = elem;
          viewMap.set(elem.id! as string, elem);
        } else if (elem.classFullName === "BisCore:DrawingViewDefinition") {
          // 2D views
          views2D[views2D.length] = elem;
          viewMap.set(elem.id! as string, elem);
          // check if the initial drawing name provided in the config file is actually one of the 2D views
          if ((elem.code.value as string).toLowerCase() === initialDrawingName.toLowerCase()) {
            initialView = elem;
          }
        }
      }
      // sort the view definitions in ABC order
      views3D.sort(this.viewSort);
      views2D.sort(this.viewSort);
      if (!initialView) {
        // if the initial draiwng name didn't match any of the actual 2D views, select the first 2D drawing by default
        initialView = views2D[0];
      }
      // use the initial view to update the current view and return its ID
      currentView = initialView;
      return initialView.id!;
    }
  }

  /** Helper method to sort an array of view definitions
   * @param a the first view definition to compare
   * @param b the second view definition to compare
   * @return a number comparing a to b (a - b)
   */
  private viewSort(a: ViewDefinitionProps, b: ViewDefinitionProps): number {
    const valA: string = a.code.value as string;
    const valB: string = b.code.value as string;
    return valA.localeCompare(valB);
  }

  /** Handles iModel open event
   * @param imodelId the iModel connection
   * @param viewId the string of the ID for the new view definition (if given & valid)
   */
  public onIModelSelected = async (imodel: IModelConnection | undefined, viewId?: string) => {
    console.log("In _onIMODEL" + imodel + " THIS IS THE IMODEL CONNECTION");
    if (!imodel) {
      // Reset the state when imodel is closed
      return;
    }
    try {
      // Attempt to get a view definition
      // const viewDefinitionId = imodel ? await this.getSheetViews(imodel) : undefined;
      const viewDefinitionId = imodel ? await this.getViewDefinitionId(imodel, viewId) : undefined;
      this.setState({ imodel, viewDefinitionId });

      // auto-fit-view
      let delayLength: number;
      if (viewId) {
        delayLength = SHORT;
      } else {
        delayLength = LONG;
      }
      await autoFitView(delayLength);

    } catch (e) {
      // If failed, close the imodel and reset the state
      if (this.state.offlineIModel) {
        await imodel.closeSnapshot();
      } else {
        await imodel.close();
      }
      // this.setState({ imodel: undefined, viewDefinitionId: undefined });
    }
  }

  /** Grabs the configuration redirect URI */
  private get _signInRedirectUri() {
    const split = (Config.App.get("imjs_browser_test_redirect_uri") as string).split("://");
    return split[split.length - 1];
  }

  /** Handles full screen menu button state change (DEPRECIATED) */
  public menuClick = async () => {
    this.setState({
      menuOpened: !this.state.menuOpened,
    });
    if (this.state.menuOpened) {
      this.setState({
        menuName: "+",
      });
    } else {
      this.setState({
        menuName: "-",
      });
    }
  }

  /** Finds project and iModel ID's using their names
   * @param projectName the name of the project to get the ID for
   * @param imodelName the name of the iModel to get the ID for
   * @return a promise to the new project and iModel IDs
   */
  private async getIModelInfo(projectName: string, imodelName: string): Promise<{ projectId: string, imodelId: string }> {
    // Requests a context and connection client to access the iModelHub, and retrieves a list of projects
    requestContext = await AuthorizedFrontendRequestContext.create();
    connectClient = new ConnectClient();

    // Try catch block gets a project, if the project doesnt exist, throw an alert
    try {
      currentProject = await connectClient.getProject(requestContext, { $filter: `Name+eq+'${projectName}'` });
    } catch (e) {
      // alert(`Project with name "${projectName}" does not exist.`);
      throw new Error(`Project with name "${projectName}" does not exist.`);
    }

    // Creates a new iModelQuery to connect to the database, and queries with specified context and project
    // Then resolves that promise and sends that information to constiuent components that need the data
    const imodelQuery = new IModelQuery();
    imodelQuery.byName(imodelName);

    // Gets the specific imodel, returns the project and imodel wsdId's to the functions handling initial startup/rendering
    const imodels = await IModelApp.iModelClient.iModels.get(requestContext, currentProject.wsgId, imodelQuery);
    if (imodels.length === 0) {
      // alert(`iModel with name "${imodelName}" does not exist in project "${projectName}".`);
      throw new Error(`iModel with name "${imodelName}" does not exist in project "${projectName}".`);
    }
    currentIModel = imodels[0].wsgId;

    // Returns
    return { projectId: currentProject.wsgId, imodelId: imodels[0].wsgId };
  }

  /** Handles on-click for initial open iModel button
   * @param projectName the name of the project
   * @param imodelName the name of the iModel
   */
  private _startProcess = async (projectName: string, imodelName: string) => {
    let imodel: IModelConnection | undefined;
    try { // Attempt to open the imodel
      const info = await this.getIModelInfo(projectName, imodelName);
      imodel = await IModelConnection.open(info.projectId, info.imodelId, OpenMode.Readonly);
      await this.onIModelSelected(imodel);
    } catch (e) {
    }
  }

  /** Makes calls on initial start-up to set-up the app */
  private async makeCalls() {
    if (this.state.projectName.length < 1 || this.state.iModelName.length < 1) {
      await this._getCorrectProjectName();
    } else {
      await this._startProcess(this.state.projectName, this.state.iModelName);
    }
  }

  /** Renders the app */
  public render() {
    let layout: React.ReactNode;
    let view: React.ReactNode;
    let ui: React.ReactNode;

    if (this.state.user.isLoading || window.location.href.includes(this._signInRedirectUri)) {
      // If user is currently being loaded, just say that
      layout = (<></>);
      view = (<></>);
      ui = `${IModelApp.i18n.translate("SimpleViewer:signing-in")}...`;
    } else if (!this.state.user.accessToken && !this.state.offlineIModel) {
      // If user doesn't have an access token, show sign in page
      layout = (<></>);
      view = (<></>);
      ui = (<SignIn onSignIn={this._onStartSignin} onOffline={this._onOffline} />);
    } else if (!this.state.imodel || !this.state.viewDefinitionId) {
      // if we don't have an imodel / view definition id - render a button that initiates imodel open
      layout = (<></>);
      view = (<></>);
      ui = (<span className="open-imodel"><Spinner size={SpinnerSize.XLarge} /></span>);
    } else {
      // If we do have an imodel and view definition id - render imodel components
      layout = <LayoutGroupWidget layout={""} />;
      view = <ViewGroupWidget view={""} />;
      ui = (<IModelComponents imodel={this.state.imodel} viewDefinitionId={this.state.viewDefinitionId} menuOpened={this.state.menuOpened} title={""}
        displayProperties={this.state.displayProperties} elementSelected={this.state.elementSelected}
        is3DCollapsed={this.state.is3DCollapsed} is2DCollapsed={this.state.is2DCollapsed} layoutID={this.state.layoutID} />);
    }
    // Render the app
    return (
      <div className="app">
        <div className="app-header">
          <div className="text">
            <TitleBar projectName={this.state.projectName} drawingName={this.state.drawingName} iModelName={this.state.iModelName} />
          </div>
          <div className="layoutlabel">
            Layout:
          </div>
          <div className="layout">
            {layout}
          </div>
          <div className="viewlabel">
            Drawings:
          </div>
          <div className="view">
            {view}
          </div>
          <div className="reload">
            <OpenIModelButton accessToken={this.state.user.accessToken} offlineIModel={this.state.offlineIModel} onIModelSelected={this.onIModelSelected}
              imodelName={this.state.iModelName} projectName={this.state.projectName} initialButton={true} />
          </div>
        </div>
        {ui}
      </div>
    );
  }
}

/** React props for the open iModel button */
interface OpenIModelButtonProps {
  imodelName: string;
  projectName: string;
  accessToken: AccessToken | undefined;
  offlineIModel: boolean;
  onIModelSelected: (imodel: IModelConnection | undefined, viewId?: string) => void;
  getConfigData?: () => void;
  initialButton?: boolean;
}

/** React state for the open iModel button */
interface OpenIModelButtonState {
  isLoading: boolean;
}

/** Renders a button that opens an iModel identified in configuration */
export class OpenIModelButton extends React.PureComponent<OpenIModelButtonProps, OpenIModelButtonState> {
  public state = {
    isLoading: false,
  };

  /** Finds project and iModel ID's using their names
   * @return a promise to the project & iModel IDs
   */
  private async getIModelInfo(): Promise<{ projectId: string, imodelId: string }> {

    const imodelName = this.props.imodelName;
    const projectName = this.props.projectName;
    // Requests a context and connection client to access the iModelHub, and retrieves a list of projects
    requestContext = await AuthorizedFrontendRequestContext.create();
    connectClient = new ConnectClient();

    // Try catch block gets a project, if the project doesnt exist, throw an alert
    try {
      currentProject = await connectClient.getProject(requestContext, { $filter: `Name+eq+'${projectName}'` });
    } catch (e) {
      // alert(`Project with name "${projectName}" does not exist.`);
      throw new Error(`Project with name "${projectName}" does not exist.`);
    }

    // Creates a new iModelQuery to connect to the database, and queries with specified context and project
    // Then resolves that promise and sends that information to constiuent components that need the data
    const imodelQuery = new IModelQuery();
    imodelQuery.byName(imodelName);

    // Gets the specific imodel, returns the project and imodel wsdId's to the functions handling initial startup/rendering
    const imodels = await IModelApp.iModelClient.iModels.get(requestContext, currentProject.wsgId, imodelQuery);
    if (imodels.length === 0) {
      // alert(`iModel with name "${imodelName}" does not exist in project "${projectName}".`);
      throw new Error(`iModel with name "${imodelName}" does not exist in project "${projectName}".`);
    }
    currentIModel = imodels[0].wsgId;
    // Returns
    return { projectId: currentProject.wsgId, imodelId: imodels[0].wsgId };
  }

  /** Handles iModel open event
   * @param imodel the iModel connection
   */
  private async onIModelSelected(imodel: IModelConnection | undefined, viewId?: string) {
    this.props.onIModelSelected(imodel, viewId);
  }

  /** Handles on-click for open iModel button */
  private _onClick = async () => {
    if (this.props.initialButton || !this.state.isLoading) {
      this.setState({ isLoading: true });
      let imodel: IModelConnection | undefined;
      try {
        // Attempt to open the imodel
        if (this.props.offlineIModel) {
          const offlineIModel = Config.App.getString("imjs_offline_imodel");
          imodel = await IModelConnection.openSnapshot(offlineIModel);
        } else {
          const info = await this.getIModelInfo();
          imodel = await IModelConnection.open(info.projectId, info.imodelId, OpenMode.Readonly);
        }
      } catch (e) {
        // alert(e.message);
      }
      this.setState({ isLoading: false });

      // ensure iModel is reloaded with current drawing displayed
      await this.onIModelSelected(imodel, currentView.id!);

      // clear the selection
      clearSelection();
    }
  }

  /** Performs onClick on initial start-up */
  public async componentWillMount() {
    await this._onClick();
  }

  /** Renders the open iModel button */
  public render() {
    return (
      <Button size={ButtonSize.Default} buttonType={ButtonType.Primary} className="button-reload-imodel" onClick={this._onClick}
        title={this.state.isLoading ? "Refreshing..." : "Refresh"}>
        {this.state.isLoading ? <span style={{ marginLeft: "8px" }}><Spinner size={SpinnerSize.Small} /></span> : <img src="refresh.png" alt="Refresh"></img>}
      </Button>
    );
  }
}

/** React props for an iModel component */
interface IModelComponentsProps {
  imodel: IModelConnection;
  viewDefinitionId: Id64String;
  menuOpened: boolean;
  title: string;
  displayProperties: boolean;
  elementSelected: boolean;
  is3DCollapsed: boolean;
  is2DCollapsed: boolean;
  layoutID: string;
}

/** The live state for an iModel component */
interface IModelComponentState {
  iModel: IModelConnection;
  viewId: Id64String;
  displayProperties: boolean;
  elementSelected: boolean;
  is3DCollapsed: boolean;
  is2DCollapsed: boolean;
  layoutID: string;
}

/** Renders a viewport, and properties if the menu is open */
export class IModelComponents extends React.PureComponent<IModelComponentsProps, IModelComponentState> {

  /** Creates an iModel component instance */
  constructor(props: IModelComponentsProps) {
    super(props);
    this.state = {
      iModel: this.props.imodel,
      viewId: this.props.viewDefinitionId,
      displayProperties: this.props.displayProperties,
      elementSelected: this.props.elementSelected,
      is3DCollapsed: this.props.is3DCollapsed,
      is2DCollapsed: this.props.is2DCollapsed,
      layoutID: this.props.layoutID,
    };
  }

  /** Renders the iModel component */
  public render() {
    // ID of the presentation ruleset used by all of the controls; the ruleset
    // Can be found at `assets/presentation_rules/Default.PresentationRuleSet.xml`
    const rulesetId = "Default";

    // Updates the view ID when a new view is selected
    this.setState(() => ({
      viewId: this.props.viewDefinitionId,
      displayProperties: this.props.displayProperties,
      elementSelected: this.props.elementSelected,
      is3DCollapsed: this.props.is3DCollapsed,
      is2DCollapsed: this.props.is2DCollapsed,
      layoutID: this.props.layoutID,
    }));

    // determine how the 2D and 3D viewports should be laid out (left, right, top, or bottom)
    let layout2D: string;
    let layout3D: string;
    if (this.state.layoutID === "left-2d-right-3d") {
      layout2D = "viewport-left";
      layout3D = "viewport-right";
    } else if (this.state.layoutID === "left-3d-right-2d") {
      layout2D = "viewport-right";
      layout3D = "viewport-left";
    } else if (this.state.layoutID === "top-2d-bottom-3d") {
      layout2D = "viewport-top";
      layout3D = "viewport-bottom";
    } else if (this.state.layoutID === "top-3d-bottom-2d") {
      layout2D = "viewport-bottom";
      layout3D = "viewport-top";
    } else {
      layout2D = "";
      layout3D = "";
    }

    if (this.props.menuOpened) { // Open with Menu expanded
      return (
        <div className="app-content">
          <div className={this.state.is2DCollapsed ? "viewport-collapsed" : (this.state.is3DCollapsed ? "viewport-expanded" : layout2D)} id="viewport-2d">
            {/* 2D viewport with properties menu collapsed */}
            <ViewportContentControl imodel={this.props.imodel} rulesetId={rulesetId} viewDefinitionId={this.state.viewId}
              showPropertiesButton={this.state.is3DCollapsed || (layout2D === "viewport-right" || layout2D === "viewport-top") ? this.state.displayProperties : false}
              elementSelected={this.state.elementSelected} is3D={false}
              title={this.state.is2DCollapsed ? "(collapsed)" : (this.state.is3DCollapsed ? "Show 3D View" : "Collapse 2D View")} />
          </div>
          <div className={this.state.is3DCollapsed ? "viewport-collapsed" : (this.state.is2DCollapsed ? "viewport-expanded" : layout3D)} id="viewport-3d">
            {/* 3D viewport with properties menu collapsed */}
            <ViewportContentControl imodel={this.props.imodel} rulesetId={rulesetId} viewDefinitionId={get3DViews()[0].id!}
              showPropertiesButton={this.state.is2DCollapsed || (layout3D === "viewport-right" || layout3D === "viewport-top") ? this.state.displayProperties : false}
              elementSelected={this.state.elementSelected} is3D={true}
              title={this.state.is3DCollapsed ? "(collapsed)" : (this.state.is2DCollapsed ? "Show 2D View" : "Collapse 3D View")} />
          </div>
          <div className="properties">
            <PropertiesWidget imodel={this.props.imodel} rulesetId={rulesetId} />
            <div className="close-menu">
              <Button size={ButtonSize.Default} buttonType={ButtonType.Hollow} className="button-reload-imodel" onClick={thisApp.menuClick}
                title={messages.closeProperties}> <img src="close.png" alt="Close"></img>
              </Button>
            </div>
          </div>
        </div>
        );
    } else { // Open with Menu collapsed
      return (
        <div className="app-content">
          <div className={this.state.is2DCollapsed ? "viewport-collapsed" : (this.state.is3DCollapsed ? "viewport-expanded-extended" : layout2D + "-extended")} id="viewport-2d">
            {/* 2D viewport with properties menu expanded */}
            <ViewportContentControl imodel={this.props.imodel} rulesetId={rulesetId} viewDefinitionId={this.state.viewId}
              showPropertiesButton={this.state.is3DCollapsed || (layout2D === "viewport-right" || layout2D === "viewport-top") ? this.state.displayProperties : false}
              elementSelected={this.state.elementSelected} is3D={false}
              title={this.state.is2DCollapsed ? "(collapsed)" : (this.state.is3DCollapsed ? "Show 3D View" : "Collapse 2D View")} />
          </div>
          <div className={this.state.is3DCollapsed ? "viewport-collapsed" : (this.state.is2DCollapsed ? "viewport-expanded-extended" : layout3D + "-extended")} id="viewport-3d">
            {/* 3D viewport with properties menu expanded */}
            <ViewportContentControl imodel={this.props.imodel} rulesetId={rulesetId} viewDefinitionId={get3DViews()[0].id!}
              showPropertiesButton={this.state.is2DCollapsed || (layout3D === "viewport-right" || layout3D === "viewport-top") ? this.state.displayProperties : false}
              elementSelected={this.state.elementSelected} is3D={true}
              title={this.state.is3DCollapsed ? "(collapsed)" : (this.state.is2DCollapsed ? "Show 2D View" : "Collapse 3D View")} />
          </div>
        </div>
      );
    }
  }
}
