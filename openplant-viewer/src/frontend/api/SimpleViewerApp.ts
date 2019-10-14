/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import { BentleyCloudRpcParams } from "@bentley/imodeljs-common";
import { Config, UrlDiscoveryClient, OidcFrontendClientConfiguration, IOidcFrontendClient } from "@bentley/imodeljs-clients";
import { IModelApp, OidcBrowserClient, FrontendRequestContext } from "@bentley/imodeljs-frontend";
import { Presentation } from "@bentley/presentation-frontend";
import { UiCore } from "@bentley/ui-core";
import { UiComponents } from "@bentley/ui-components";
import { UseBackend } from "../../common/configuration";
import initLogging from "./logging";
import initRpc from "./rpc";

// initialize logging
initLogging();

// subclass of IModelApp needed to use imodeljs-frontend
export class SimpleViewerApp {

  private static _isReady: Promise<void>;
  private static _oidcClient: IOidcFrontendClient;

  /** Gets the OIDC client
   * @return the OIDC client
   */
  public static get oidcClient() { return this._oidcClient; }

  /** Gets whether or not the application is ready to launch
   * @return whether or not the application is ready to launch
   */
  public static get ready(): Promise<void> { return this._isReady; }

  /** Handles app start-up */
  public static startup() {
    IModelApp.startup();

    // contains various initialization promises which need
    // to be fulfilled before the app is ready
    const initPromises = new Array<Promise<any>>();

    // initialize localization for the app
    initPromises.push(IModelApp.i18n.registerNamespace("SimpleViewer").readFinished);

    // initialize UiCore
    initPromises.push(UiCore.initialize(IModelApp.i18n));

    // initialize UiComponents
    initPromises.push(UiComponents.initialize(IModelApp.i18n));

    // initialize Presentation
    Presentation.initialize({
      activeLocale: IModelApp.i18n.languageList()[0],
    });

    // initialize RPC communication
    initPromises.push(SimpleViewerApp.initializeRpc());

    // initialize OIDC
    initPromises.push(SimpleViewerApp.initializeOidc());

    // the app is ready when all initialization promises are fulfilled
    this._isReady = Promise.all(initPromises).then(() => { });
  }

  /** Initializes rpc with connection info
   * @return a promise
   */
  private static async initializeRpc(): Promise<void> {
    const rpcParams = await this.getConnectionInfo();
    initRpc(rpcParams);
  }

  /** Initializes oidc with configuration ids & uri */
  private static async initializeOidc() {
    const clientId = Config.App.get("imjs_browser_test_client_id");
    const redirectUri = Config.App.getString("imjs_browser_test_redirect_uri"); // must be set in config
    const scope = Config.App.getString("imjs_browser_test_scope");
    const oidcConfig: OidcFrontendClientConfiguration = { clientId, redirectUri, scope };

    this._oidcClient = new OidcBrowserClient(oidcConfig);

    const requestContext = new FrontendRequestContext();
    await this._oidcClient.initialize(requestContext);

    IModelApp.authorizationClient = this._oidcClient;
  }

  /** Shuts down the application */
  public static shutdown() {
    this._oidcClient.dispose();
    IModelApp.shutdown();
  }

  /** Gets connection info to initialize rpc
   * @return a promise to the application's connection info
   */
  private static async getConnectionInfo(): Promise<BentleyCloudRpcParams | undefined> {
    const usedBackend = Config.App.getNumber("imjs_backend", UseBackend.Local);

    if (usedBackend === UseBackend.Navigator) {
      const urlClient = new UrlDiscoveryClient();
      const requestContext = new FrontendRequestContext();
      const orchestratorUrl = await urlClient.discoverUrl(requestContext, "iModelJsOrchestrator.SF", undefined);
      return { info: { title: "navigator-backend", version: "v1.0" }, uriPrefix: orchestratorUrl };
    }

    if (usedBackend === UseBackend.Local)
      return undefined;

    throw new Error(`Invalid backend "${usedBackend}" specified in configuration`);
  }
}
