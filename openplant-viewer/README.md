# **Plant Viewer**

[[_TOC_]]

## **User Guide**

### **About**

- This is an electron application to view P&ID drawings of iModels.
- Provide the credentials of the iModel to view.
- An electron application opens up and presents the iModel.

### **Prerequisites**

- Download and Install
  - [**Git**](https://git-scm.com/downloads)
  - [**Node.Js**](https://nodejs.org/en/download/current)
    - npm is installed with Node.js (https://www.npmjs.com/get-npm)

### **Recommendations**

- Download and Install
    - [**Visual Studio Code**](https://code.visualstudio.com/docs/?dv=win)
      - Visual Studio Code is being used for ReactJs part development, because it has convenient environment and big community.
    - [**Notepad++**](https://notepad-plus-plus.org/download/v7.7.1.html)
    - [**Google Chrome**](https://www.google.com/chrome/b/)
    - [**Tslint**](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin)
    - [**Mocha**](https://mochajs.org/)
    - [**Azure CLI**](https://dev.azure.com/bentleycs)

### **References**
- [**Getting Started Installing Git**](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [**Electron**](https://electronjs.org/)
- [**npm**](https://www.w3schools.com/nodejs/nodejs_npm.asp)
- [**Electron in Git**](https://github.com/Microsoft/vscode-recipes/tree/master/Electron)
- [**Debugging in the Visual Studio Code**](https://code.visualstudio.com/docs/editor/debugging)



### **Clone**

1. If you do not already have a project, create a new project with the default settings by clicking [here for **Production**](https://imodeljs.github.io/iModelJs-docs-output/getting-started/registration-dashboard/) or [here for **QA**](http://builds.bentley.com/prgbuilds/AzureBuilds/iModelJsDocs/public/getting-started/registration-dashboard/).
2. Open the Command Prompt and navigate to where you would like the repository to be created (it will create a new folder called **imodeljs-openplant-viewer**).
3. Type the following command to clone the repository in the "imodeljs-openplant-viewer" folder.
   - **`git clone https://dev.azure.com/bentleycs/Plant%20Design/_git/imodeljs-openplant-viewer`**
4. Type the following commands to open the repository in Visual Studio Code.
   - **`cd imodeljs-openplant-viewer`**
   - **`code .`**

### **Build**

1. Open src/common/configuration.json, scroll down to the very bottom, and comment/uncomment the lines for your client (Production or QA).
2. In the same file, at the very bottom, set auto_fit_view to true or false. This toggles whether to auto-fit each drawing by zooming into it automatically.
3. Open the src/common/settings.json, and put the names of the project, iModel, and drawing (optional - if a valid drawing name is given, that drawing will be shown on start-up and after refreshing the iModel).
4. Save your changes.
5. Type **[CTRL+`]** to open the terminal in Visual Studio Code.
6. Type the following command in the terminal to install the dependencies (may take a few minutes).
   - **`npm install`**
   - **_This only has to be done once even if you make changes and build again!_**
7. Type the following command in the terminal to build the applicaiton (should only take a few seconds).
   - **`npm run build`**
   - `or`
   - **`npm run go`** (builds and runs the application)

   [**Note**]
   `Before building, determine which iModelHub repository you will be using: Production or QA. Edit the "CLIENT SELECTION" in the` [**.\src\common\configuration.ts**] `file.`



### **Run**

1. Type the following command in the terminal to run the application. An electron window will open within seconds.
   - **`npm run electron`**
   - `or`
   - **`npm run go`** (builds and runs the application)
2. View the **Help** section below to see how to use the application.
3. Close the electron window to stop running the application.
4. If you want to re-run the application without any changes to the program files, go back to step 1.
5. If you want to re-run the application and make changes to the program files, go back to the **Build** section above to re-build the application.

### **Help**

1. When prompted, **log-in** with your credentials. This grants access to the backend servers that contain the iModel information.
2. Use the **Drawings** dropdown menu in the header to select a different drawing.
3. Click on the **refresh icon** in the header to refresh the iModel if it was changed after the viewer was opened.
4. To select an element, click on the **Select Elements** (the mouse / left-most option) in the **Toolbar** (top-right of viewport).
5. To view the element's properties, click on the **Properties** toolbar icon (right of viewport under the Toolbar).

### **Configuration**
Configurations are currently set in in json format files. These files are .\src\common folder
When running the viewer, one of these files need to be selected. These files should contain valid iModelHub Project/iModel combinations
- Example of json contents:
 {"project_name":"OP_CE_VIEW","imodel_name":"MistyMountainTop","drawing_name":"PID001"}

#### Method 1

1. Navigate to imodeljs-openplant-viewer/lib/common and open iModel.Settings.json.
2. In the file, edit the project and imodel values.
3. Run the application normally.

#### Method 2

1. Create a new file called [FileName].Settings.json.
2. Populate this file in the same format as iModel.Settings.json, and fill in your own values.
3. Run the application, and, on the opening screen, navigate to and select your new configuration file.

### **Workflow**

- The [**Azure DevOps repository**](https://dev.azure.com/bentleycs/Plant%20Design/_git/imodeljs-openplant-viewer) contains all up-to-date revisions.
- The [**GitHub repository**](https://github.com/openplanttools/ElectronPlantViewer) contains only the published, operational, user-friendly revisions.

1. To push changes to either repository, type the following command in the terminal to create a new branch.
   - **`git checkout -b [branch name]`**
2. Type in the following command to stage your changes to the new branch.
   - **`git add .`**
3. Type in the following command to commit your changes to the new branch.
   - **`git commit -m "[comment describing changes]"`**
4. Type in the following command to push your changes to the new branch.
   - **`git push origin [branch name]`**
5. Open the repository in the browser ([**Azure DevOps**](https://dev.azure.com/bentleycs/Plant%20Design/_git/imodeljs-openplant-viewer) or [**GitHub**](https://github.com/openplanttools/ElectronPlantViewer)).
6. Create a pull request for the new branch, and then approve and complete it.
7. The master branch has now been updated with the pushed changes.
8. Remember to type the following commands in your terminal to get the updated master branch.
   - **`git checkout master`**
   - **`git pull origin master`**

## **Merging DevOps Repository into GitHub Repository**

1. Have local repositories on your machine for both Azure DevOps and GitHub.
   - **`git clone https://dev.azure.com/bentleycs/Plant%20Design/_git/imodeljs-openplant-viewer`** will create a folder named **imodeljs-openplant-viewer** for the **Azure DevOps** repository.
   - **`git clone https://github.com/openplanttools/ElectronPlantViewer`** will create a folder named **ElectronPlantViewer** for the **GitHub repository**.
2. Ensure both branches are up-to-date by typing **`git pull origin master`** in the terminal in both repositories.
3. In a file explorer, delete the **public**, **src**, and **test** folders in **ElectronPlantViewer**.
4. In a file explorer, copy the **public**, **src**, and **test** folders from **imodeljs-openplant-viewer** to **ElectronPlantViewer**.
5. *NOTE: These are the only files that should normally be merged from DevOps to GitHub. Changes to other files (eg. README.md) are not meant to be merged to the GitHub repository.*
6. Follow the **Workflow** section above to push your changes to the GitHub repository.


## **Pull Request Guide**

See **docs/Pull-Request-Guide.md**.

### **Set up local git repository**

Get a local copy of the repository (`master` branch):

- `git clone https://bentleycs@dev.azure.com/bentleycs/Plant%20Design/_git/imodeljs-openplant-viewer`

If you already have a local git repository set up, then run the following to ensure that you are synchronized with VSTS (check with a team member - this may be done for you already):

- `git remote set-url origin https://bentleycs@dev.azure.com/bentleycs/Plant%20Design/_git/imodeljs-openplant-viewer`

You may verify your remote handles:

- `git remote -v`

*IMPORTANT:* We never work directly off of the `master` branches on our local machines!

### **Create a new feature branch for each work item**

1. Ensure that you are on the `master` branch:
   - `git checkout master`
2. Pull the latest changes:
   - `git pull origin master`
3. Create a new feature branch for your work item:
   - `git checkout - b [UR-branch-name]`

Use the following branch naming convention:

- `{InitialsAllCaps}-{descriptive-name-of-branch-with-dashes}`
  - ex. `AM-this-is-a-sample`

### **Regularly update your development branch**

*IMPORTANT:* It is recommended to do this twice a day!

Instead of the above, you may also do the following:

1. `git fetch origin master`
2. `git merge origin master`

### **Check in your work**

1. Review your local changes (make sure you know what you're changing):
   - `git status`
2. Stage your changes that you intend to check in:
   - `git add [fileName1 fileName2 ...]`
3. Commit your changes with a descriptive message:
   - `git commit -m "[Commit message]"`
4. Push your changes:
   - `git push origin [UR-branch-name]`
5. Navigate over to view all branches via [VSTS](https://bentleycs@dev.azure.com/bentleycs/Plant%20Design/_git/imodeljs-openplant-viewer).
6. Set the `master` branch as the compare branch.
7. Submit a pull request and be sure to add at least one team member to review your work.
8. Once someone reviews your work and approves your changes, merge your changes to the `master` branch.
9. *IMPORTANT:* Please be sure to delete your feature branch after you merge your changes! (you can check the option to do this on the merge confirmation page)
