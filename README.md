# Blackbaud-CRM-Record-Operation-With-Search
Record operations are designed to make changes to records without additional user input. Usually, the necessary context is pulled from the page or section where the record operation is located. There are a few circumstances where an organization will want their users to be able to supply additional information. We heard a case where someone wanted to reassign the owner of interactions displayed in a custom data list. They wished to select multiple interaction records, open a search to choose another owner, and have those records reassigned. Unfortunately, a standard record operation is not designed to take input in this manner.
There are several ways to accomplish this task. You could create a global change that takes in a selection or create an edit form that displays a list to choose from, but a record operation with a search could accomplish this in fewer steps and a cleaner interface. Since this cannot be done through a record operation, how do you do it?
This code sample will walk you through creating a JavaScript CLR action to duplicate the functionality of a record operation with a search. It covers the following concepts:
*	Adding custom JavaScript CLR page actions
*	Writing JavaScript that will display a search list and run a record operation an add form
*	Creating an add form to update multiple records
## Prerequisites
*	An installation of CRM
*	Administrator-level access rights to said installation
*	Access to said installation's database and virtual directory
*	A specified and valid probe path in your installation's web config file
*	Basic knowledge of JavaScript
Loading customizations is covered in our [SDK Guide](https://www.blackbaud.com/files/support/guides/infinitydevguide/infsdk-developer-help.htm) and other [code samples](https://github.com/blackbaud-community/Blackbaud-CRM-Fixer-Integration-Sample). So, we will not address that here.
## Moving Multiple Queries to a New Folder
The Infinity Technical Reference has a section on the [BBUI API](https://www.blackbaud.com/files/support/guides/infinitytechref/Content/apidocs-BB_4-0/index.html). It shows accessible functions from JavaScript and examples on how to use them. Instead of writing a new code sample, we will demonstrate functionality from the Information Library page.
In this example, a user has mistakenly put a few revenue queries into a constituent folder. We would like to move those to the revenue folder. So, we select those queries and choose the Move operation.
![Image showing move action selected](username.github.com/repository/img/image.jpg)

This opens a form which allows us to choose the new folder for those queries.
![Image showing Query Move Folder Add Data Form](username.github.com/repository/img/image.jpg)

After pressing save, the queries are relocated to the correct folder.

![Image showing queries after being moved](username.github.com/repository/img/image.jpg)

## Writing the Code
To create this “record operation”, take the following steps. First, create the add form that will take in the queries and the new folder and reassign them. Second, write the JavaScript action to open the add form. Finally, add the JavaScript action to the page.
### Query Move Folder Add Data Form
The first question you may ask is, “why an add form?” This is a fair question, as the change we are making is more akin to an edit action or record operation. We are not using an edit action because edit actions usually focus on a single record and we are not calling a function to load the information we want to edit. We cannot choose a record operation because it will not allow us to show a UI. Hence, we use an add form.

``` sql
create procedure dbo.USP_DATAFORMTEMPLATE_ADD_QUERYMOVEFOLDER
(
	@ID uniqueidentifier output,
	@CHANGEAGENTID uniqueidentifier = null,
	@FOLDERID uniqueidentifier = null,
	@QUERIES xml = null
)
as

set nocount on;

if @ID is null
  set @ID = newid()

if @CHANGEAGENTID is null  
    exec dbo.USP_CHANGEAGENT_GETORCREATECHANGEAGENT @CHANGEAGENTID output

declare @CURRENTDATE datetime
set @CURRENTDATE = getdate()

begin try

		-- move ad-hoc queries
		update dbo.[ADHOCQUERY] set
			[FOLDERID] = @FOLDERID,
			[CHANGEDBYID] = @CHANGEAGENTID,
			[DATECHANGED] = @CURRENTDATE
		where [ID] in
    (
      select
      T.c.value('(ID)[1]','uniqueidentifier') AS 'ID'
      from @QUERIES.nodes('/QUERIES/ITEM') T(c)
    )

		-- move smart query instances
		update dbo.[SMARTQUERYINSTANCE] set
			[FOLDERID] = @FOLDERID,
			[CHANGEDBYID] = @CHANGEAGENTID,
			[DATECHANGED] = @CURRENTDATE
		where [ID] in
    (
      select
      T.c.value('(ID)[1]','uniqueidentifier') AS 'ID'
      from @QUERIES.nodes('/QUERIES/ITEM') T(c)
    )
	
end try

begin catch
    exec dbo.USP_RAISE_ERROR
    return 1
end catch

return 0			
```

The add form SQL is simple. We take in the folder we want as a unique identifier and the queries as an xml collection of unique identifiers. We then call a couple update operations, dynamically parsing the XML object and extracting the IDs. If this were a more complicated operation, we would parse the XML object into a temporary table, which would help the SQL optimizer make a better plan, but that is not necessary here.
### Query Move Folder JavaScript Action
The JavaScript action is a bit more complex. JavaScript also reads differently from .NET code as you must write your function code above the code that calls it. 
 
``` javascript
(function () {

    BBUI.ns("BBUI.customactions.platform.informationlibrary");

    BBUI.customactions.platform.informationlibrary.QueryMoveFolderAction = function (host) {
        this.host = host;
    };

    BBUI.customactions.platform.informationlibrary.QueryMoveFolderAction.prototype = {

        //Beginning of executed code on button click
        executeAction: function (callback) {
            var Util = BBUI.forms.Utility,
                scriptHost = this.host,
                dataFormInstanceId = "7f97d246-b859-4106-be70-47ed87f1434e",
                ids = scriptHost.getContextRecordIds();
```
 
First, we declare our custom action, creating a namespace and then adding an action. We set the data form instance to that of our add form and set ids equal to the selected queries from our data list. The [BBUI API Documentation](https://www.blackbaud.com/files/support/guides/infinitytechref/Content/apidocs-BB_4-0/index.html) provides insight into the various objects and methods that are available through JavaScript actions.
 
``` javascript
            function formShowHandler() {
                // The form is now visible; stop waiting.
                Util.endWait();
            }

            function formConfirmedHandler(args) {
                // Form confirmed
                callback();
            }
``` 
 
Next, we create our handlers for when the add form is shown and the add form is saved. The first function ends the screen wait. The second function calls the save operation when the users presses “save”.

``` javascript
            function main() {
                var values,
                    records,
                    record,
                    count,
                    dialog,
                    options;

                Util.beginWait();

                records = [];

                for (count = 0; count < ids.length; count++) {
                    record = [];
                    record.push({ name: "ID", value: ids[count] });
                    records.push(record);
                }
```

The main function is where we process the action itself. We begin a screen wait and create an array to hold the IDs that were selected. We push the selected IDs into our array for later use.

``` javascript
                values = [
                    {
                        name: "QUERIES",
                        collectionValue: records
                    }
                ];

                options = {
                    defaultValues: values,
                    state: this
                };

                dialog = new BBUI.dataforms.DataFormDialog(scriptHost.uiModelingSvc, dataFormInstanceId, options);

                dialog.on({
                    "confirm": formConfirmedHandler,
                    "show": formShowHandler
                });

                dialog.show();

            }

            main();
```

We then create an object for the parameter we are setting in the add form, Queries, specifying that it is a collection of the records array we created. Then, we call the open dialog for the add form, specifying event handlers we created earlier for showing and saving the form.
Finally, we execute the main function which calls all the rest of the code.
### The Information Library Page
We’re almost there! Now we just need to modify the page to call our JavaScript action.

``` xml
<Action ID="0E96CC61-EFD6-4462-BC2A-593C93423223" Caption="Move" ImageKey="RES:recordoperationspec" Visible="=Fields!GROUPEDBY=0" Enabled="=(Fields!OTHERSCANMODIFY orelse Globals.CurrentAppUserIsSysAdmin() orelse String.Compare(Globals.CurrentAppUserID.toString, Fields!OWNERID, True) = 0)" CaptionResourceKey="$$move">
    <c:ExecuteCLRAction>
        <c:ScriptIdentifier Url="browser/htmlforms/platform/informationlibrary/QueryMoveFolderAction.js" ObjectName="BBUI.customactions.platform.informationlibrary.QueryMoveFolderAction">
            <c:AllowsMultiSelect />
        </c:ScriptIdentifier>
        <c:ActionContext>
            <c:SectionField>ID</c:SectionField>
        </c:ActionContext>
        <c:PostActionEvent>
            <c:RefreshOtherSections>
                <c:Sections>
                    <c:SectionID>C3B173FA-9697-403C-9008-8EF5A4B34F60</c:SectionID>
                </c:Sections>
            </c:RefreshOtherSections>
        </c:PostActionEvent>
    </c:ExecuteCLRAction>
</Action>
```

First, we create the action. We give it the record operation image so that it has the look and feel of a record operation. For the action itself, we specify a JavaScript CLR Action. We point it to the folder where we have our JavaScript file saved. You will want to use your customizations folder and not our information library folder. We also specify the action that we declared in the JavaScript file. Finally, we specify the context as the record(s) selected by the user.
That’s it! Now, we have a “record operation” that takes in a search as input.