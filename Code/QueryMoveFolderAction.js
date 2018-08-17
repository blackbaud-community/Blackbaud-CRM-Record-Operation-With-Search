/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/jQuery/jquery-vsdoc.js" />
/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/ExtJS/ext-3.2.0/adapter/jquery/ext-jquery-adapter.js" />
/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/ExtJS/ext-3.2.0/ext-all-debug.js" />
/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/BBUI/json/json.js" />
/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/BBUI/bbui/bbui.js" />
/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/BBUI/forms/utility.js" />
/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/BBUI/uimodeling/servicecontracts.js" />
/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/BBUI/uimodeling/service.js" />
/// <reference path="../../../../../../Blackbaud.AppFx.Server/Deploy/browser/BBUI/webshell/service.js" />

/*jslint bitwise: true, browser: true, eqeqeq: true, onevar: true, undef: true, white: true */
/*extern BBUI, Ext, $ */
/*JSLint documentation: http://www.jslint.com/lint.html */

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

            function formShowHandler() {
                // The form is now visible; stop waiting.
                Util.endWait();
            }

            function formConfirmedHandler(args) {
                // Form confirmed
                callback();
            }

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
        }
    };
})();
