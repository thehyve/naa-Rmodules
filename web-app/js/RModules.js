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
                iconCls : 'comparebutton',
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
           }
        }
    );

    new Ajax.Updater('variableSelection', pageInfo.basePath+'/dataAssociation/variableSelection',
        {
            asynchronous:true,evalScripts:true,
            onComplete: function(e) {
                loadPluginView(item.id);
            },parameters:{analysis:item.id}
        });
    Ext.fly('selectedAnalysis').update(item.text, false);
    Ext.get('analysis').dom.value = item.id;
    item.parentMenu.hide(true);
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

function submitJob(formParams)
{
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

function loadCommonHighDimFormObjects(formParams, divName)
{

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

function loadCommonHeatmapImageAttributes(formParams)
{
    formParams["txtImageWidth"]		=	document.getElementById("txtImageWidth").value,
        formParams["txtImageHeight"]	=	document.getElementById("txtImageHeight").value,
        formParams["txtTextSize"]		=	document.getElementById("txtImagePointsize").value
}

function validateCommonHeatmapImageAttributes(formParams)
{
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
