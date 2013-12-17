/*************************************************************************
 * Copyright 2008-2012 Janssen Research & Development, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************/
Ext.onReady(function(){
    advancedWorkflowMenu();
});

function advancedWorkflowMenu() {
    var advancedMenu = null;

    Ext.Ajax.request({
        url : pageInfo.basePath+"/plugin/modules",
        params: {pluginName:'R-Modules'},
        method : 'GET',
        timeout: '1800000',
        success : function(result, request)
        {
            createAdvancedWorkflowMenu(result);
        },
        failure : function(result, request)
        {
            //Ext.Msg.alert("Problem loading the list of available Analysis");
        }
    });
}

function createAdvancedWorkflowMenu(result) {
    var response = Ext.util.JSON.decode(result.responseText)
    if (response.success) {
        var advMenuItems = createAdvancedWorkflowMenuItems(response.modules)
        var advMenu = new Ext.menu.Menu({
            id : 'advancedWorkflowMenu',
            minWidth: 250,
            items : advMenuItems
        });

        Ext.getCmp('advancedWorkflowToolbar')
            .add({
                text : 'Analysis',
                iconCls : 'dassociationbutton',
                disabled : false,
                menu : advMenu
            });
    }
}

function createAdvancedWorkflowMenuItems(modules) {
    var menuItems = [];
    Ext.each(modules, function(module, index) {
        var menuItem = module;
        menuItem.handler = onItemClick;
        menuItems.push(menuItem);
    });

    return menuItems;
}

function onItemClick(item) {
    if(!checkPreviousAnalysis()) return false;

    new Ajax.Updater('dataAssociationBody', pageInfo.basePath + '/dataAssociation/defaultPage',
        {
           asynchronous: true,
           evalScripts: true,
           onComplete: function (e) {
               renderCohortSummary();
               Ext.fly('selectedAnalysis').update(item.text, false);
               Ext.get('analysis').dom.value = item.id;

               new Ajax.Updater('variableSelection', pageInfo.basePath+'/dataAssociation/variableSelection',
               {
                   asynchronous:true,evalScripts:true,
                   onComplete: function(e) {
                       loadPluginView(item.id);
                   },
                   parameters:{analysis:item.id}
               });
           }
        }
    );

    item.parentMenu.hide(true);
}

function waitWindowForAnalysis()
{
    //Mask the panel while the analysis runs.
    Ext.getCmp('dataAssociationPanel').body.mask("Running analysis...", 'x-mask-loading');
}

function loadPluginView(){

    //Remove the output screen.
    document.getElementById("analysisOutput").innerHTML = "";

    //Whenever we switch views, make the binning toggle false. All the analysis pages default to this state.
    GLOBAL.Binning = false
    GLOBAL.ManualBinning = false
    GLOBAL.NumberOfBins = 4
    GLOBAL.AnalysisRun = false

    var selectedAnalysis = document.getElementById("analysis").value;
    selectedAnalysis = selectedAnalysis.charAt(0).toUpperCase()+selectedAnalysis.substring(1);
    eval("load"+selectedAnalysis+"View()");

}

function submitJob(formParams) {
    //Make sure at least one subset is filled in.
    if(isSubsetEmpty(1) && isSubsetEmpty(2))
    {
        Ext.Msg.alert('Missing input!','Please select a cohort from the \'Comparison\' tab.');
        return;
    }

    if((!isSubsetEmpty(1) && GLOBAL.CurrentSubsetIDs[1] == null) || (!isSubsetEmpty(2) && GLOBAL.CurrentSubsetIDs[2] == null))
    {
        setupSubsetIds(formParams);
        return;
    }
    createWorkflowStatus($j('#dataAssociationBody'), true);

    Ext.Ajax.request({
        url: pageInfo.basePath+"/asyncJob/createnewjob",
        method: 'POST',
        success: function(result, request){
            //Handle data export process
            runJob(result, formParams);
        },
        failure: function(result, request){
            Ext.Msg.alert('Status', 'Unable to create data export job.');
        },
        timeout: '1800000',
        params: formParams
    });

}

function runJob(result, formParams) {
    var jobNameInfo = Ext.util.JSON.decode(result.responseText);
    var jobName = jobNameInfo.jobName;
    setJobNameFromRun(jobName);

    formParams.result_instance_id1=GLOBAL.CurrentSubsetIDs[1];
    formParams.result_instance_id2=GLOBAL.CurrentSubsetIDs[2];
    formParams.analysis=document.getElementById("analysis").value;
    formParams.jobName=jobName;

    Ext.Ajax.request(
        {
            url: pageInfo.basePath+"/RModules/scheduleJob",
            method: 'POST',
            timeout: '1800000',
            params: Ext.urlEncode(formParams) // or a URL encoded string
        });

    //Start the js code to check the job status so we can display results when we are done.
    checkPluginJobStatus(jobName)
}

function loadCommonHighDimFormObjects(formParams, divName) {

    formParams[divName + "timepoints"]			= window[divName + 'timepoints1'];
    formParams[divName + "samples"]				= window[divName + 'samples1'];
    formParams[divName + "rbmPanels"]			= window[divName + 'rbmPanels1'];
    formParams[divName + "platforms"]			= window[divName + 'platforms1'];
    formParams[divName + "gpls"]				= window[divName + 'gpls1'];
    formParams[divName + "gplsValue"]			= window[divName + 'gplsValue1'];
    formParams[divName + "tissues"]				= window[divName + 'tissues1'];

    formParams[divName + "timepoints2"]			= window[divName + 'timepoints2'];
    formParams[divName + "samples2"]			= window[divName + 'samples2'];
    formParams[divName + "rbmPanels2"]			= window[divName + 'rbmPanels2'];
    formParams[divName + "platforms2"]			= window[divName + 'platforms2'];
    formParams[divName + "gpls2"]				= window[divName + 'gpls2'];
    formParams[divName + "gplsValue2"]			= window[divName + 'gplsValue2'];
    formParams[divName + "tissues2"]			= window[divName + 'tissues2'];

    formParams[divName + "probesAggregation"]	= window[divName + 'probesAggregation'];
    formParams[divName + "SNPType"]				= window[divName + 'SNPType'];
    formParams[divName + "PathwayName"]			= window[divName + 'pathwayName'];

    var mrnaData = false
    var snpData = false

    //Gene expression filters.
    var fullGEXSampleType 	= "";
    var fullGEXTissueType 	= "";
    var fullGEXTime 		= "";
    var fullGEXGeneList 	= "";
    var fullGEXGPL 			= "";

    //SNP Filters.
    var fullSNPSampleType 	= "";
    var fullSNPTissueType 	= "";
    var fullSNPTime 		= "";
    var fullSNPGeneList 	= "";
    var fullSNPGPL 			= "";

    var tempGeneList 		= window[divName + 'pathway'];
    var tempMarkerType		= window[divName + 'markerType'];
    var tempGPL				= window[divName + 'gplValues'];

    var tempPlatform 		= window[divName + 'platforms1'] + "," + window[divName + 'platforms2'];
    var tempSampleType		= window[divName + 'samplesValues'];
    var tempTissueType		= window[divName + 'tissuesValues'];
    var tempTime			= window[divName + 'timepointsValues'];

    //If we are using High Dimensional data we need to create variables that represent genes from both independent and dependent selections (In the event they are both of a single high dimensional type).
    //Check to see if the user selected GEX in the independent input.
    if(tempMarkerType == "Gene Expression")
    {
        //The genes entered into the search box were GEX genes.
        fullGEXGeneList 	= tempGeneList;
        fullGEXSampleType 	= String(tempSampleType);
        fullGEXTissueType 	= String(tempTissueType);
        fullGEXTime			= String(tempTime);
        fullGEXGPL			= String(tempGPL);

        if(fullGEXSampleType == ",") 	fullGEXSampleType = ""
        if(fullGEXTissueType == ",") 	fullGEXTissueType = ""
        if(fullGEXTime == ",") 			fullGEXTime = ""
        if(fullGEXGPL == ",") 			fullGEXGPL = ""

        //This flag will tell us to write the GEX text file.
        mrnaData = true;

        //Fix the platform to be something the R script expects.
        tempMarkerType = "MRNA";
    }

    //Check to see if the user selected SNP in the temp input.
    if(tempMarkerType == "SNP")
    {
        //The genes entered into the search box were SNP genes.
        fullSNPGeneList 	= tempGeneList;
        fullSNPSampleType 	= String(tempSampleType);
        fullSNPTissueType 	= String(tempTissueType);
        fullSNPTime 		= String(tempTime);
        fullSNPGPL			= String(tempGPL);

        if(fullSNPSampleType == ",") 	fullSNPSampleType = ""
        if(fullSNPTissueType == ",") 	fullSNPTissueType = ""
        if(fullSNPTime == ",") 			fullSNPTime = ""
        if(fullSNPGPL == ",") 			fullSNPGPL = ""

        //This flag will tell us to write the SNP text file.
        snpData = true;
    }

    //If we don't have a platform, fill in Clinical.
    if(tempPlatform == null || tempPlatform == "") tempMarkerType = "CLINICAL"

    formParams[divName + "Type"]							= tempMarkerType;
    formParams[divName + "Pathway"]							= tempGeneList;

    formParams["gexpathway"]								= fullGEXGeneList;
    formParams["gextime"]									= fullGEXTime;
    formParams["gextissue"]									= fullGEXTissueType;
    formParams["gexsample"]									= fullGEXSampleType;
    formParams["gexgpl"]									= fullGEXGPL;

    formParams["snppathway"]								= fullSNPGeneList;
    formParams["snptime"]									= fullSNPTime;
    formParams["snptissue"]									= fullSNPTissueType;
    formParams["snpsample"]									= fullSNPSampleType;
    formParams["snpgpl"]									= fullSNPGPL;

    formParams["mrnaData"]									= mrnaData;
    formParams["mrnaData"]									= mrnaData;
    formParams["snpData"]									= snpData;

}

function loadCommonHeatmapImageAttributes(formParams) {
    formParams["txtImageWidth"]		=	document.getElementById("txtImageWidth").value,
    formParams["txtImageHeight"]	=	document.getElementById("txtImageHeight").value,
    formParams["txtTextSize"]		=	document.getElementById("txtImagePointsize").value
}

function validateCommonHeatmapImageAttributes(formParams) {
    if(document.getElementById("txtImageWidth").value == '')
    {
        Ext.Msg.alert('Wrong input', 'Please enter the image width in the "Image Width" text box.');
        return false;
    }

    if(document.getElementById("txtImageHeight").value == '')
    {
        Ext.Msg.alert('Wrong input', 'Please enter the image height in the "Image Height" text box.');
        return false;
    }

    if(document.getElementById("txtImagePointsize").value == '')
    {
        Ext.Msg.alert('Wrong input', 'Please enter the desired size of text on the image file in the "Text Size" text box.');
        return false;
    }

    if(!isNumber(document.getElementById("txtImageWidth").value))
    {
        Ext.Msg.alert('Wrong input', 'Please enter a valid integer into the "Image Width" text box.');
        return false;
    }

    if(!isNumber(document.getElementById("txtImageHeight").value))
    {
        Ext.Msg.alert('Wrong input', 'Please enter a valid integer into the "Image Height" text box.');
        return false;
    }

    if(!isNumber(document.getElementById("txtImagePointsize").value))
    {
        Ext.Msg.alert('Wrong input', 'Please enter a valid integer into the "Text Size" text box.');
        return false;
    }

    if(document.getElementById("txtImageWidth").value < 1 || document.getElementById("txtImageWidth").value > 9000)
    {
        Ext.Msg.alert('Wrong input', 'Please enter a valid integer into the "Image Width" text box that is greater than 0 and less than 9000.');
        return false;
    }

    if(document.getElementById("txtImageHeight").value < 1 || document.getElementById("txtImageHeight").value > 9000)
    {
        Ext.Msg.alert('Wrong input', 'Please enter a valid integer into the "Image Height" text box that is greater than 0 and less than 9000.');
        return false;
    }

    if(document.getElementById("txtImagePointsize").value < 1 || document.getElementById("txtImagePointsize").value > 100)
    {
        Ext.Msg.alert('Wrong input', 'Please enter a valid integer into the "Text Size" text box that is greater than 0 and less than 100.');
        return false;
    }

    return true;
}

//This might be inefficient.
//Return new array with duplicate values removed
Array.prototype.unique =
    function() {
        var a = [];
        var l = this.length;
        for(var i=0; i<l; i++) {
            for(var j=i+1; j<l; j++) {
                // If this[i] is found later in the array
                if (this[i] === this[j])
                    j = ++i;
            }
            a.push(this[i]);
        }
        return a;
    };

//This function will create an array of all the node types from a box that i2b2 nodes were dragged into.
function createNodeTypeArrayFromDiv(divElement,attributeToPull)
{
    var nodeTypeList = [];

    //If the category variable element has children, we need to parse them and add their values to an array.
    if(divElement.dom.childNodes[0])
    {
        //Loop through the category variables and add them to a comma seperated list.
        for(nodeIndex = 0; nodeIndex < divElement.dom.childNodes.length; nodeIndex++)
        {
            var currentNode = divElement.dom.childNodes[nodeIndex]
            var currentNodeType = currentNode.attributes.getNamedItem(attributeToPull).value

            //If we find an item, add it to the array.
            if(currentNodeType) nodeTypeList.push(currentNodeType.toString());
        }
    }

    //Make the elements in the array unique.
    return nodeTypeList.unique();
}

function checkPluginJobStatus(jobName) {
    var secCount = 0;
    var pollInterval = 1000;   // 1 second

    var updateJobStatus = function(){
        secCount++;
        Ext.Ajax.request(
            {
                url : pageInfo.basePath+"/asyncJob/checkJobStatus",
                method : 'POST',
                success : function(result, request)
                {
                    var jobStatusInfo = Ext.util.JSON.decode(result.responseText);
                    var status = jobStatusInfo.jobStatus;
                    var errorType = jobStatusInfo.errorType;
                    var viewerURL = jobStatusInfo.jobViewerURL;
                    var altViewerURL = jobStatusInfo.jobAltViewerURL;
                    var exception = jobStatusInfo.jobException;
                    var resultType = jobStatusInfo.resultType;
                    var jobResults = jobStatusInfo.jobResults;

                    if(status =='Completed') {
                        //Ext.getCmp('dataAssociationPanel').body.unmask();
                        Ext.TaskMgr.stop(checkTask);

                        var fullViewerURL = pageInfo.basePath + viewerURL;

                        //Set the results DIV to use the URL from the job.
                        Ext.get('analysisOutput').load({url : fullViewerURL,callback: loadModuleOutput});

                        //Set the flag that says we run an analysis so we can warn the user if they navigate away.
                        GLOBAL.AnalysisRun = true;

                    } else if(status == 'Cancelled' || status == 'Error') {
                        Ext.TaskMgr.stop(checkTask);
                    }
                    updateWorkflowStatus(jobStatusInfo);
                },
                failure : function(result, request)
                {
                    Ext.TaskMgr.stop(checkTask);
                    showWorkflowStatusErrorDialog('Failed', 'Could not complete the job, please contact an administrator');
                },
                timeout : '300000',
                params: {jobName: jobName}
            }
        );
    }

    var checkTask =	{
        run: updateJobStatus,
        interval: pollInterval
    }
    Ext.TaskMgr.start(checkTask);
}

function loadModuleOutput() {
    var selectedAnalysis = document.getElementById("analysis").value;
    selectedAnalysis = selectedAnalysis.charAt(0).toUpperCase()+selectedAnalysis.substring(1);

    var funcName = "load"+selectedAnalysis+"Output";

    if (typeof funcName == 'string' && eval('typeof ' + funcName) == 'function')
    {
        eval(funcName+'()');
    }
}

function setupCategoricalItemsList(strDivSource,strDivTarget) {
    // copy from the category div at top of page first and add drag handlers
    var categoricalSourceDiv = Ext.get(strDivSource);
    var categoricalTargetDiv = Ext.get(strDivTarget);

    // clear it out first
    while (categoricalTargetDiv.dom.hasChildNodes())
        categoricalTargetDiv.dom
            .removeChild(categoricalTargetDiv.dom.firstChild);
    for ( var i = 0, n = categoricalSourceDiv.dom.childNodes.length; i < n; ++i) {
        // clone and append
        var newnode = categoricalSourceDiv.dom.childNodes[i].cloneNode(true);
        categoricalTargetDiv.dom.appendChild(newnode);
        // add drag handler
        Ext.dd.Registry.register(newnode, {
            el : newnode
        });
    }
    var dragZone = new Ext.dd.DragZone(categoricalTargetDiv.dom.parentNode, {
        ddGroup : 'makeBin',
        isTarget: true,
        ignoreSelf: false
    });

    var dropZone = new Ext.dd.DropTarget(categoricalTargetDiv, {
        ddGroup : 'makeBin',
        isTarget: true,
        ignoreSelf: false,
        onNodeEnter: function(target, dd, e, dragData) {
            delete this.dropOK;
            this.dropOK=true;
            return true;

        },
        onNodeOver: function(target, dd, e, dragData) {
            var ret= this.dropOK ? this.dropAllowed : this.dropNotAllowed;
            console.log(ret);
            return ret;
        }
    });
    dropZone.notifyDrop = dropOntoBin;
}

function setupSubsetIds(formParams){
    runAllQueries(function(){
        submitJob(formParams);
    });
}

function readConceptVariables(divIds){
    var variableConceptCode = ""
    var variableEle = Ext.get(divIds);

    //If the variable element has children, we need to parse them and concatenate their values.
    if(variableEle && variableEle.dom.childNodes[0])
    {
        //Loop through the variables and add them to a comma seperated list.
        for(nodeIndex = 0; nodeIndex < variableEle.dom.childNodes.length; nodeIndex++)
        {
            //If we already have a value, add the seperator.
            if(variableConceptCode != '') variableConceptCode += '|'

            //Add the concept path to the string.
            variableConceptCode += getQuerySummaryItem(variableEle.dom.childNodes[nodeIndex]).trim()
        }
    }
    return variableConceptCode;
}
