package com.neuralquest.server;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;
import java.util.Map.Entry;

import org.dom4j.DocumentHelper;
import org.dom4j.Element;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * @author cjong
  */
public class SchemaForAttrRefObj   implements Constants {
	private Date  maximumDate = null;
	private Date  minimumDate = null;
	private Date  defaultDate = new java.util.Date();
	private boolean defaultBool = false;
	private long defaultInt = 0;
	private long minimumInt = Integer.MIN_VALUE;
	private long maximumInt = Integer.MAX_VALUE;
	private float defaultNumber = 0;
	private float minimumNumber = Float.MIN_VALUE;
	private float maximumNumber = Float.MAX_VALUE;
	private int maxDecimal = Float.MAX_EXPONENT;
	private int format;
	private String defaultRtf = "<p>[emtpy]</p>";
	private String defaultString = "[new]";
	private String invalidMessage = "";
	private int minLength = 0;
	private int maxLength = 65535;
	private String pattern = "";
	private JSONObject constraints = new JSONObject();
	private String title = "";
	private String description = "<p>[add description]</p>";
	private JSONArray options;
	private boolean readonly = true;
	private boolean optional = true;
	private Cell attrRefObj = null;
	private Cell attrRefMTClass = null;
	private Cell assocTypeObj = null; 
	private long assocType = 0;
	private long defaultSelect=0;
	private LinkedList<Cell>  selectList= new LinkedList<Cell>();
	private DateFormat dateFormat = DateFormat.getDateInstance (DateFormat.SHORT); // YYYY-MM-DD
	//dateFormat.setLenient(false);   // this is important!
	//private DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss z");
	
	private String error = "";
	private int fieldWidth = 20;
	
	public SchemaForAttrRefObj(Cell sentAttrRefObj) throws Exception{
		attrRefObj = sentAttrRefObj;
		attrRefMTClass = attrRefObj.getCellByAssocType(MAPSTO_ASSOC);
		assocTypeObj = attrRefObj.getAttributeObjByDestClass(TO_ONE_ASSOC_TYPES_ID);
		if(assocTypeObj!=null) assocType = assocTypeObj.getId();
		
		Cell attrAccess = attrRefObj.getAttributeObjByDestClass(ATTRIBUTE_ACCESS_ID);
		readonly = attrAccess!=null&&attrAccess.getId()==MODIFY_ID?false:true;
		optional = attrAccess!=null&&attrAccess.getId()==MANDATORY_ID?false:true;
		//title = attrRefObj.getAttributeObjByType(PRIMARY_NAME_ID)==null ? "null" : attrRefObj.getName(50);
		title = attrRefObj.getAttributeObjByDestClass(PRIMARY_NAME_ID)==null?"unnamed":attrRefObj.getAttributeObjByDestClass(PRIMARY_NAME_ID).getName(100);//label
		initDescription();
		initFieldWidth();
		if(assocType==ATTRIBUTE_ASSOC){
			Cell attrRefMTClass = attrRefObj.getCellByAssocType(MAPSTO_ASSOC);
			//find the assoc type of the attrRef 
			/*
			if(attrRefMTClass.isA(TO_ONE_ASSOC_TYPES_ID)){// Do this first, these are also a permitted value
				//dynamic
			}*/
			if(attrRefMTClass.isA(TO_MANY_ASSOC_TYPES_ID)){// Do this first, these are also a permitted value
				//dynamic
			}
			else if(attrRefMTClass.isA(BOOLEAN_ID)){// boolean, Do this first, boolean is also a permitted value
				initDefaultBool();
			}
			else if(attrRefMTClass.isA(PERMITTED_VALUES_ID)){
				initSelectList();
			}			
			else if(attrRefMTClass.isA(DATE_ID)) {
				initMaximumDate();
				initMinimumDate();
				initDefaultDate();
				invalidMessage="Constraints: "+constraints.toString();
			}
			else if(attrRefMTClass.isA(CURRENCY_ID)){
				initMinimumNumber();
				initMaximumNumber();
				initMaxDecimal();
				initDefaultNumber();
				invalidMessage="Constraints: "+constraints.toString();
			}
			else if(attrRefMTClass.isA(NUMBER_ID)){
				initMinimumNumber();
				initMaximumNumber();
				initMaxDecimal();
				initDefaultNumber();
				invalidMessage="Constraints: "+constraints.toString();
			}
			else if(attrRefMTClass.isA(INTEGER_ID)){
				initMinimumInt();
				initMaximumInt();
				initDefaultInt();
				invalidMessage="Constraints: "+constraints.toString();
			}
			else if(attrRefMTClass.isA(RTF_ID)){
				initMinLength();
				initMaxLength();
				initDefaultRtf();
			}
			else if(attrRefMTClass.isA(STRING_ID)){
				initMinLength();
				initMaxLength();
				initDefaultString();
			}
		}
		else if(assocTypeObj!=null && assocTypeObj.isA(TO_ONE_ASSOC_TYPES_ID)){
			initSelectList();
		}
	}
	//private String initDefaultDate() {
	//	 DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
     //    return dateFormat.format(defaultDate);
	//}
	private void initMaximumDate() throws Exception  {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break; 
			Cell cAttr = pCell.getClassAttributeOfType(MAXDATE_ID);
			if(cAttr!=null){ 
				Date value = dateFormat.parse(cAttr.getName());
				if(value.before(maximumDate)) maximumDate = value;
			}
		}
		constraints.put("max",maximumDate);
	}
	private void initMinimumDate()  throws Exception {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break; 
			Cell cAttr = pCell.getClassAttributeOfType(MINDATE_ID);
			if(cAttr!=null){ 
				Date value = dateFormat.parse(cAttr.getName());
				if(value.after(minimumDate)) minimumDate = value;
			}
		}
		constraints.put("min",minimumDate);
	}
	private void initDefaultDate() throws Exception {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(DEFAULTDATE_ID);
			if(cAttr!=null){ 
				if("current".equals(cAttr.getName())) defaultDate = new java.util.Date();
				else defaultDate = dateFormat.parse(cAttr.getName());
				break;
			}
		}
	}
	private void initFieldWidth() {
		if(attrRefMTClass!=null&&attrRefMTClass.isA(RTF_ID)) fieldWidth = 0;// is interpreted as 100%
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(FIELDWIDTH_ID);
			if(cAttr!=null){ 
				fieldWidth = Integer.parseInt(cAttr.getName());
				return;
			}
		}
	}
	private void initDefaultBool() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(DEFAULTBOOL_ID);
			if(cAttr!=null){ 
				defaultBool = Boolean.parseBoolean(cAttr.getName());
				break;
			}
		}
	}
	private void initMaximumInt() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(MAXINTEGER_ID);
			if(cAttr!=null){ 
				long value = Integer.parseInt(cAttr.getName());
				maximumInt = Math.min(maximumInt, value);
			}
		}
		constraints.put("max",maximumInt);
	}
	private void initMinimumInt() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(MININTEGER_ID);
			if(cAttr!=null){ 
				long value = Integer.parseInt(cAttr.getName());
				minimumInt = Math.max(minimumInt, value);
			}
		}
		constraints.put("min",minimumInt);
	}
	private void initDefaultInt() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(DEFAULTINTEGER_ID);
			if(cAttr!=null){ 
				defaultInt = Integer.parseInt(cAttr.getName());
				break;
			}
		}
	}
	private void initMaximumNumber() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(MAXNUMBER_ID);
			if(cAttr!=null){ 
				float value = Float.parseFloat(cAttr.getName());
				maximumNumber = Math.min(maximumNumber, value);
			}
		}
		constraints.put("max",maximumNumber);
	}
	private void initMinimumNumber() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(MINNUMBER_ID);
			if(cAttr!=null){ 
				float value = Float.parseFloat(cAttr.getName());
				minimumNumber = Math.max(minimumNumber, value);
			}
		}
		constraints.put("min",minimumNumber);
	}
	private void initDefaultNumber() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(DEFAULTNUMBER_ID);
			if(cAttr!=null){ 
				defaultNumber = Float.parseFloat(cAttr.getName());
				break;
			}
		}
	}
	private void initDescription() {
		Cell descCell = attrRefObj.getAttributeObjByDestClass(DESCRIPTION_ID);
		if(descCell!=null){
			description = descCell.getName();
		}
		else{
			if(attrRefMTClass==null) return; 
			LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
			for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
				Cell pCell = (itr0.next());
				if(pCell.getId()==ATTRIBUTES_ID) break;
				Cell cAttr = pCell.getClassAttributeOfType(DESCRIPTION_ID);
				if(cAttr!=null){ 
					description = cAttr.getName();
					break;
				}
			}
		}
	}
	private void initMaxDecimal() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(MAXDECIMAL_ID);
			if(cAttr!=null){ 
				int value = Integer.parseInt(cAttr.getName());
				maxDecimal = Math.min(maxDecimal, value);
			}
		}
		constraints.put("places",maxDecimal);
	}
	private void initDefaultRtf() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(DEFAULTRTF_ID);
			if(cAttr!=null){ 
				defaultRtf = cAttr.getName();
				break;
			}
		}
	}
	private void initDefaultString() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(DEFAULTDATE_ID);
			if(cAttr!=null){ 
				defaultString = cAttr.getName();
				break;
			}
		}
	}
	private void initMaxLength() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(MAXLENGTH_ID);
			if(cAttr!=null){ 
				int value = Integer.parseInt(cAttr.getName());
				maxLength = Math.min(maxLength, value);
			}
		}
	}
	private void initMinLength() {
		if(attrRefMTClass==null) return; 
		LinkedList<Cell> pList = attrRefMTClass.getListOfSuperClasses();
		for(Iterator<Cell> itr0=pList.iterator();itr0.hasNext();){
			Cell pCell = (itr0.next());
			if(pCell.getId()==ATTRIBUTES_ID) break;
			Cell cAttr = pCell.getClassAttributeOfType(MINLENGTH_ID);
			if(cAttr!=null){ 
				int value = Integer.parseInt(cAttr.getName());
				minLength = Math.max(minLength, value);
			}
		}
	}
	private void initSelectList() {
		if(assocType>24) return;
		if(attrRefMTClass!=null){
			//make an exception for one atrRrefObj that allows selection of calsses
			if(attrRefObj.getId()==MAPSTOVIEW_ATTRREF_ID) selectList.addAll(attrRefMTClass.getLsitOfAllSubClasses());
			if(attrRefObj.getId()==MAPSTOATTR_ATTRREF_ID) selectList.addAll(attrRefMTClass.getLsitOfAllSubClasses());
			else if(assocType==ATTRIBUTE_ASSOC){
				if(attrRefMTClass.isA(PERMITTED_VALUES_ID)){
					//TODO boolean?
					selectList.addAll(attrRefMTClass.getListOfInstances());
				}
				else error = ("attrRefObj is a ATTRIBUTE_ASSOC but not a PERMITTED_VALUES_ID");			
			}
			else selectList.addAll(attrRefMTClass.getListOfInstances());
		}
		else error = ("attrRefObj does not have a maps to");

		//TODO find the real default
		Iterator<Cell> keys = selectList.iterator();
		if(keys.hasNext())defaultSelect = (keys.next()).getId();
		else defaultSelect = 0;

	}
	public JSONObject getSchemaObj() {
		JSONObject schemaObj = new JSONObject();
		schemaObj.put("readonly",readonly);
		schemaObj.put("optional",optional);		
		schemaObj.put("title",title);
		schemaObj.put("description",description);
		schemaObj.put("width",fieldWidth);		
		schemaObj.put("placeHolder","placeHolder");		
		schemaObj.put("promptMessage","promptMessage");		
		schemaObj.put("invalidMessage","invalidMessage");
		if(assocType==ATTRIBUTE_ASSOC){
			Cell attrRefMTClass = attrRefObj.getCellByAssocType(MAPSTO_ASSOC);
			if(attrRefMTClass.isA(TO_ONE_ASSOC_TYPES_ID)){// Do this first, these are also a permitted value
				//dynamic
				schemaObj.put("type","integer");
				schemaObj.put("enum",getKeyvaluePairs());
			}
			else if(attrRefMTClass.isA(TO_MANY_ASSOC_TYPES_ID)){// Do this first, these are also a permitted value
				//dynamic
				schemaObj.put("type","integer");
				schemaObj.put("enum",getKeyvaluePairs());
			}
			else if(attrRefMTClass.isA(BOOLEAN_ID)){// boolean, Do this first, boolean is also a permitted value
				schemaObj.put("type","boolean");
				schemaObj.put("default",defaultBool);
			}
			else if(attrRefMTClass.isA(PERMITTED_VALUES_ID)){
				schemaObj.put("type","integer");
				schemaObj.put("enum",getKeyvaluePairs());
			}			
			else if(attrRefMTClass.isA(DATE_ID)) {
				//see http://groups.google.com/group/json-schema/web/json-schema-possible-formats
				schemaObj.put("type","string");
				schemaObj.put("format","date-time");
				schemaObj.put("default",defaultDate.toString());
				//schemaObj.put("minimum",minimumDate.toString());
				//schemaObj.put("maximum",maximumDate.toString());
			}
			else if(attrRefMTClass.isA(CURRENCY_ID)){
				schemaObj.put("type","curency");
				schemaObj.put("minimum",minimumNumber);
				schemaObj.put("maximum",maximumNumber);
				schemaObj.put("maxDecimal",maxDecimal);
				schemaObj.put("default",defaultNumber);
				schemaObj.put("curency","EUR");
			}
			else if(attrRefMTClass.isA(NUMBER_ID)){
				schemaObj.put("type","number");
				schemaObj.put("minimum",minimumNumber);
				schemaObj.put("maximum",maximumNumber);
				schemaObj.put("maxDecimal",maxDecimal);
				schemaObj.put("default",defaultNumber);
			}
			else if(attrRefMTClass.isA(INTEGER_ID)){
				schemaObj.put("type","integer");
				schemaObj.put("minimum",minimumInt);
				schemaObj.put("maximum",maximumInt);
				schemaObj.put("default",defaultInt);
			}
			else if(attrRefMTClass.isA(RTF_ID)){
				schemaObj.put("type","string");
				schemaObj.put("format","rtf");
				schemaObj.put("minLength",minLength);
				schemaObj.put("maxLength",maxLength);
				schemaObj.put("default",defaultRtf);
			}
			else if(attrRefMTClass.isA(STRING_ID) || attrRefMTClass.isA(CELL_NAME_ID)){
				schemaObj.put("type","string");
				schemaObj.put("minLength",minLength);
				schemaObj.put("maxLength",maxLength);
				schemaObj.put("default",defaultString);
				if(pattern.length()>0)schemaObj.put("pattern","regex");
			}
		}
		else if(assocTypeObj!=null && assocTypeObj.isA(TO_ONE_ASSOC_TYPES_ID)){
			schemaObj.put("type","integer");
			schemaObj.put("enum",getKeyvaluePairs());
		}
	
		return schemaObj;
	}
	public void isValidAttributeValue(String valueStr) throws Exception  {
		// simply returns if everything is well.
		// otherwise throws runtime exception
		if(readonly) {
			System.out.println("ERROR:\tUpdate not allowed");
			System.out.println("value:\t"+valueStr);
			System.out.println("schema:\t"+getSchemaObj().toString());
			throw new RuntimeException("Update not allowed");
		}
		if(!optional && valueStr.length() == 0) {
			System.out.println("ERROR:\tMandatory value missing");
			System.out.println("value:\t"+valueStr);
			System.out.println("schema:\t"+getSchemaObj().toString());
			throw new RuntimeException("Mandatory value missing");
		}
		if(attrRefMTClass==null) {
			System.out.println("ERROR:\tAttribute reference does not have a 'maps to'");
			System.out.println("value:\t"+valueStr);
			System.out.println("schema:\t"+getSchemaObj().toString());
			throw new RuntimeException("Attribute reference does not have a 'maps to'");
		}
		
		if(attrRefMTClass.isA(DATE_ID)) {//date
		     // will throw ParseException or IllegalArgumentException 
		     dateFormat.parse(valueStr);
		}
		else if(attrRefMTClass.isA(CURRENCY_ID)){
			// will throw NumberFormatException
			java.math.BigDecimal value = new java.math.BigDecimal(valueStr);
			//TODO
			/*if(value.compareTo(maximumNumber)>0){
				System.out.println("ERROR:\tValue to big");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to big");
			}
			if(value<minimumNumber){
				System.out.println("ERROR:\tValue to small");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to small");
			}*/
		}
		else if(attrRefMTClass.isA(NUMBER_ID)){// float
			// will throw NumberFormatException
			double value = Double.parseDouble(valueStr);
			if(value>maximumNumber){
				System.out.println("ERROR:\tValue to big");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to big");
			}
			if(value<minimumNumber){
				System.out.println("ERROR:\tValue to small");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to small");
			}
		}
		else if(attrRefMTClass.isA(INTEGER_ID)){// integer
			// will throw NumberFormatException
			long value = Long.parseLong(valueStr);
			if(value>maximumNumber){
				System.out.println("ERROR:\tValue to big");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to big");
			}
			if(value<minimumNumber){
				System.out.println("ERROR:\tValue to small");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to small");
			}
		}
		else if(attrRefMTClass.isA(RTF_ID)){// rtf
			// will throw DocumentException
			if(valueStr.length()>0)DocumentHelper.parseText("<div>"+valueStr+"</div>");
			if(valueStr.length()>maxLength){
				System.out.println("ERROR:\tValue to long");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to long");
			}
			if(valueStr.length()<minLength){
				System.out.println("ERROR:\tValue to short");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to short");
			}
		}
		else if (attrRefMTClass.isA(STRING_ID)){//string
			if(valueStr.length()>maxLength){
				System.out.println("ERROR:\tValue to long");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to long");
			}
			if(valueStr.length()<minLength){
				System.out.println("ERROR:\tValue to short");
				System.out.println("value:\t"+valueStr);
				System.out.println("schema:\t"+getSchemaObj().toString());
				throw new RuntimeException("Value to short");
			}
		}
		else throw new RuntimeException("Unknown attribute type: \n"+getSchemaObj().toString());
	}
	public JSONArray getKeyvaluePairs(){
		JSONArray valuesArray = new JSONArray();
		for(Iterator<Cell> itr1=selectList.iterator();itr1.hasNext();){
			Cell optionObj = (itr1.next());
			JSONObject valueOptionObj = new JSONObject();
			valueOptionObj.put("id", optionObj.getId());
			valueOptionObj.put("name",optionObj.getName(100));
			valuesArray.put(valueOptionObj);
		}
		return valuesArray;
	}
	public JSONObject getSelectValuesOptionsData(){
		JSONArray valuesArray = new JSONArray();
		for(Iterator<Cell> itr1=selectList.iterator();itr1.hasNext();){
			Cell optionObj = (itr1.next());
			JSONObject valueOptionObj = new JSONObject();
			valueOptionObj.put("id", optionObj.getId());
			valueOptionObj.put("name",optionObj.getName(100));
			valuesArray.put(valueOptionObj);
		}
		JSONObject storeObj = new JSONObject();
		storeObj.put("identifier","id");
		storeObj.put("label","name");
		storeObj.put("items", valuesArray);

		return storeObj;
	}
	public JSONObject getConstraints() {
		return constraints;
	}
	public String getDescription() {
		return description;
	}
	public int getFieldWidth() {
		return fieldWidth;
	}
	public String getInvalidMessage() {
		return invalidMessage;
	}
	public int getMaxLength() {
		return maxLength;
	}
	public boolean isOptional() {
		return optional;
	}
	public boolean isReadonly() {
		return readonly;
	}
	public String getTitle() {
		return title;
	}
	public void toSysout() {
		System.out.println("SCHEMA:\tattrRefObj: \t"+attrRefObj.getIdName(50)+" is a '"+attrRefObj.getCellByAssocType(PARENT_ASSOC).getIdName(50)+"'"); 
		System.out.println(attrRefMTClass==null ? "\tPoints To(attrClass): null" : "\tPoints To(attrClass): "+attrRefMTClass.getIdName(50)); 
		if(error.length()>0)System.out.println("\tERROR: "+error);
		System.out.println(getSchemaObj().toString(4));
	}

}
