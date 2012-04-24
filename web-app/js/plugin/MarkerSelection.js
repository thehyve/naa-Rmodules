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

function submitMarkerSelectionJob(form){
	
	var independentVariableConceptCode = "";	
	
	independentVariableConceptCode = readConceptVariables("divIndependentVariable");

	var variablesConceptCode = independentVariableConceptCode;
	
	//----------------------------------
	//Validation
	//----------------------------------
	//This is the independent variable.
	var independentVariableEle = Ext.get("divIndependentVariable");	

	//Get the types of nodes from the input box.
	var independentNodeList = createNodeTypeArrayFromDiv(independentVariableEle,"setnodetype")
	
	//Validate to make sure a concept was dragged in.
	if(independentVariableConceptCode == '')
	{
		Ext.Msg.alert('Missing input', 'Please drag at least one concept into the Marker Variable box.');
		return;
	}	
	
	if((independentNodeList[0] == 'valueicon' || independentNodeList[0] == 'hleaficon') && (independentVariableConceptCode.indexOf("|") != -1))
	{
		Ext.Msg.alert('Wrong input', 'For continuous and high dimensional data, you may only drag one node into the input boxes. The Marker variable input box has multiple nodes.');
		return;		
	}				

	if(document.getElementById("txtNumberOfMarkers").value == '')
	{
		Ext.Msg.alert('Wrong input', 'Please enter the number of markers to display into the "Number of markers" text box.');
		return;			
	}	
	
	if(!isNumber(document.getElementById("txtNumberOfMarkers").value))
	{
		Ext.Msg.alert('Wrong input', 'Please enter a valid integer into the "Number of markers" text box.');
		return;			
	}
	
	if(document.getElementById("txtNumberOfMarkers").value < 1)
	{
		Ext.Msg.alert('Wrong input', 'Please enter a valid integer greater than 1 into the "Number of markers" text box.');
		return;			
	}	
	//----------------------------------	
	
	var formParams = {
			independentVariable:					independentVariableConceptCode,
			variablesConceptPaths:					variablesConceptCode,
			jobType:								'MarkerSelection',
			txtNumberOfMarkers:						document.getElementById("txtNumberOfMarkers").value
	};
	
	//Use a common function to load the High Dimensional Data params.
	loadCommonHighDimFormObjects(formParams,"divIndependentVariable")	
	
	//------------------------------------
	//More Validation
	//------------------------------------		
	if(independentNodeList[0] == 'hleaficon' && formParams["divIndependentVariableType"] == "CLINICAL")
	{
		Ext.Msg.alert('Wrong input', 'You dragged a High Dimensional Data node into the Marker variable box but did not select any filters. Please click the "High Dimensional Data" button and select filters. Apply the filters by clicking "Apply Selections".');
		return;			
	}
	
	//For the time being if the user is trying to run anything but GEX, stop them.
	if(formParams["divIndependentVariableType"] != "MRNA")
	{
		Ext.Msg.alert("Invalid selection", "The Marker Selection only supports GEX data at this time. Please drag a Gene Expression node into the Marker variable and click the 'High Dimensional Data' button.")
		return false;
	}	
	//------------------------------------
	
	submitJob(formParams);
}

/**
 * Register drag and drop.
 * Clear out all gobal variables and reset them to blank.
 */
function loadMarkerSelectionView(){
	registerMarkerSelectionDragAndDrop();
	clearHighDimDataSelections('divIndependentVariable');
}

function loadMarkerSelectionOutput()
{
	$j("#markerSelectionTable").tablesorter(); 
}

/**
 * Clear the variable selection box
 * Clear all selection stored in global variables
 * Clear the selection display
 * @param divName
 */
function clearGroupMarkerSelection(divName)
{
	//Clear the drag and drop div.
	var qc = Ext.get(divName);
	
	for(var i=qc.dom.childNodes.length-1;i>=0;i--)
	{
		var child=qc.dom.childNodes[i];
		qc.dom.removeChild(child);
	}	
	clearHighDimDataSelections(divName);
	clearSummaryDisplay(divName);
}

function registerMarkerSelectionDragAndDrop()
{
	//Set up drag and drop for Dependent and Independent variables on the data association tab.
	//Get the Independent DIV
	var independentDiv = Ext.get("divIndependentVariable");
	
	dtgI = new Ext.dd.DropTarget(independentDiv,{ddGroup : 'makeQuery'});
	dtgI.notifyDrop =  dropOntoCategorySelection;
	
}