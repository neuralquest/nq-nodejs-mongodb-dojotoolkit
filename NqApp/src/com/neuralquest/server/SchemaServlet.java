package com.neuralquest.server;

import java.io.BufferedReader;
import java.io.IOException;
import java.net.URLDecoder;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang.StringEscapeUtils;
import org.hibernate.Hibernate;
import org.hibernate.Session;
import org.json.JSONArray;
import org.json.JSONObject;

import com.neuralquest.server.util.HibernateUtil;

public class SchemaServlet extends HttpServlet implements Constants {

	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		resp.setContentType("application/x-json");
		Session session = HibernateUtil.getSessionFactory().getCurrentSession();
		try {
			session.beginTransaction();

			String[] reqUri = req.getPathInfo().split("/");

			if(req.getQueryString()==null) {
				// No query has been sent, so this is a request for a single object  
				// Example: /schema/viewId				
				long viewId = Long.parseLong(reqUri[reqUri.length-1]);
				Cell viewObj = (Cell) session.load(Cell.class, new Long(viewId));
				//JSONObject viewSchema = getJsonSchemaForView(viewObj, session);
				//resp.getWriter().print(viewSchema.toString(4));
			}
			else{
				JSONArray resultJSONArray = new JSONArray();
				String[] queryStringArr = URLDecoder.decode(req.getQueryString(), "UTF-8").split("&");
				long selectedObjParentId = 0;
				long attrRefId = 0;
				long parentViewId = 0;
				long viewId = 0;
				for(int i=0; i<queryStringArr.length; i++){
					String[] queryStringParts = queryStringArr[i].split("=");
					if("selectedObjParentId".equals(queryStringParts[0])){						
						selectedObjParentId = Long.parseLong(queryStringParts[1]);
					}
					else if("attrRefId".equals(queryStringParts[0])){						
						attrRefId = Long.parseLong(queryStringParts[1]);
					}
					else if("parentViewId".equals(queryStringParts[0])){						
						parentViewId = Long.parseLong(queryStringParts[1]);
					}
					else if("viewId".equals(queryStringParts[0])){						
						viewId = Long.parseLong(queryStringParts[1]);
					}
				}
				if(parentViewId>0){
					Cell parentViewObj = (Cell) session.load(Cell.class, new Long(parentViewId));
					LinkedList<Cell> childViewList = parentViewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID );
					for(Iterator<Cell> itr1=childViewList.iterator();itr1.hasNext();){
						Cell childViewObj = itr1.next();
						//JSONObject viewSchema = getJsonSchemaForView(childViewObj, session);
						//viewSchema.put("parentViewId", String.valueOf(parentViewObj.getId()));
						//resultJSONArray.put(viewSchema);
					}
				}
				if(viewId>0){
					Cell viewObj = (Cell) session.load(Cell.class, new Long(viewId));
					getJsonSchemaForView(viewObj, null, null, resultJSONArray, new LinkedList<Cell>(), session);
				}
				else{
					LinkedList<Cell> attrsList = new LinkedList<Cell>();
					if(attrRefId==MAPSTOATTR_ATTRREF_ID){
						Cell parentViewObj = (Cell) session.load(Cell.class, new Long(selectedObjParentId));
						//Cell viewObj = attrRefObj.findFirstReverse(VIEWS_ID);
						if(parentViewObj!=null){
							Cell viewObjMTClass = parentViewObj.getCellByAssocType(MAPSTO_ASSOC);
							if(viewObjMTClass!=null){
								LinkedList<Cell> parentList = viewObjMTClass.getListOfSuperClasses();
								for(Iterator<Cell> itr0=parentList.iterator();itr0.hasNext();){
									Cell sourceParentClass = itr0.next();
									for(Iterator<Assoc> itr=sourceParentClass.getSourceAssocs().iterator();itr.hasNext();){
										Assoc assoc1 = (Assoc)itr.next();
										if(assoc1.getType()==ATTRIBUTE_ASSOC && assoc1.getDestFk().isA(ATTRIBUTES_ID)) {
											attrsList.add((Cell)assoc1.getDestFk());	
										}
									}
								}
							}
						}
						Collections.sort(attrsList,new Comparator<Cell>() {
				            public int compare(Cell o1, Cell o2) {
				                return o1.getName(0).compareToIgnoreCase(o2.getName(0));
				            }
						});
						//Collections.sort(attrsList);
						for(Iterator<Cell> itr0=attrsList.iterator();itr0.hasNext();){
							Cell attrClass = itr0.next();
							JSONObject resultJSONObject = new JSONObject();
							resultJSONObject.put("id", attrClass.getId());
							resultJSONObject.put("name", attrClass.getName());
							resultJSONObject.put("label", attrClass.getName());
							resultJSONObject.put("selectedObjParentId", selectedObjParentId);
							resultJSONObject.put("attrRefId", attrRefId);
							resultJSONArray.put(resultJSONObject);
						}
					}
					else if(attrRefId==MAPSTOVIEW_ATTRREF_ID){
						Cell parentViewObj = (Cell)session.load(Cell.class, new Long(selectedObjParentId));
						if(parentViewObj!=null){
							Cell viewObjMTClass = parentViewObj.getCellByAssocType(MAPSTO_ASSOC);
							if(viewObjMTClass!=null){
								LinkedList<Cell> parentList = viewObjMTClass.getListOfSuperClasses();
								for(Iterator<Cell> itr0=parentList.iterator();itr0.hasNext();){
									Cell sourceParentClass = itr0.next();
									for(Iterator<Assoc> itr=sourceParentClass.getSourceAssocs().iterator();itr.hasNext();){
										Assoc assoc1 = (Assoc)itr.next();
										int assocType = assoc1.getType();
										if(assocType==ATTRIBUTE_ASSOC || assocType==PARENT_ASSOC) continue;
										long destClassId = assoc1.getDestFk().getId();
										JSONObject resultJSONObject = new JSONObject();
										resultJSONObject.put("id", destClassId);
										resultJSONObject.put("label", "<i>"+assoc1.getName()+" </i><img class='icon"+assocType+"'/> "+assoc1.getDestFk().getName(100));
										resultJSONObject.put("name", assoc1.getName()+" - "+assoc1.getDestFk().getName(100));
										resultJSONObject.put("selectedObjParentId", selectedObjParentId);
										resultJSONObject.put("attrRefId", attrRefId);
										resultJSONArray.put(resultJSONObject);
									}
								}
								for(Iterator<Cell> itr0=parentList.iterator();itr0.hasNext();){
									Cell sourceParentClass = itr0.next();
									for(Iterator<Assoc> itr=sourceParentClass.getDestAssocs().iterator();itr.hasNext();){
										Assoc assoc1 = (Assoc)itr.next();
										int assocType = assoc1.getType()+12;
										if(assocType==SUBCLASSES_PASSOC || assocType==MAPPED_TO_BY_PASSOC) continue;
										Cell translatedAssocObj = (Cell)session.load(Cell.class, new Long(assocType));
										long sourceClassId = assoc1.getSourceFk().getId();
										JSONObject resultJSONObject = new JSONObject();
										resultJSONObject.put("id", sourceClassId);
										resultJSONObject.put("label", "<i>"+translatedAssocObj.getName()+" </i><img class='icon"+assocType+"'/> "+assoc1.getSourceFk().getName(100));
										resultJSONObject.put("name", translatedAssocObj.getName()+" - "+assoc1.getSourceFk().getName(100));
										resultJSONObject.put("selectedObjParentId", selectedObjParentId);
										resultJSONObject.put("attrRefId", attrRefId);
										resultJSONArray.put(resultJSONObject);
									}
								}
							}
						}
					}					
				}
				resp.getWriter().print(resultJSONArray.toString(4));
			}
			
			session.getTransaction().commit();
		}
		catch (Exception e) {
			session.getTransaction().rollback();
			throw new ServletException(e); // or display error message
		}
	}
	private void getJsonSchemaForView(Cell viewObj, Cell parenttViewObj, Cell parenttTabObj, JSONArray resultJSONArray, LinkedList<Cell> loopProtection, Session session) throws Exception {
		loopProtection.add(viewObj);
		//childrenAttrsArr.put(viewObj.getId());
		JSONObject schemaObj = new JSONObject();
		schemaObj.put("id",viewObj.getId());
		schemaObj.put("entity","view");
		schemaObj.put("design","sidebar");
		Cell accTabsCell = viewObj.getAttributeObjByDestClass(ACCORDION_TABS_ID);
		schemaObj.put("containerType", accTabsCell==null ? "" : accTabsCell.getName());
		Cell nameCell = viewObj.getAttributeObjByDestClass(PRIMARY_NAME_ID);
		if(nameCell!=null) schemaObj.put("title", viewObj.getName(100));
		Cell descCell = viewObj.getAttributeObjByDestClass(DESCRIPTION_ID);
		if(descCell!=null) schemaObj.put("description",descCell.getName());
		// tell if the retationship to previous is ordered
		Cell prevRelType = viewObj.getAttributeObjByDestClass(TO_MANY_ASSOC_TYPES_ID); 
		//schemaObj.put("ordered", (prevRelType!=null&&prevRelType.getId()==ORDERED_ASSOC)?true:false);				
		if(prevRelType!=null) {
			schemaObj.put("relationshipId", prevRelType.getId());				
			schemaObj.put("relationship", prevRelType.getName());				
		}
		Cell mapsToClass = viewObj.getCellByAssocType(MAPSTO_ASSOC);
		JSONArray mapsToViewsArr = new JSONArray(); 
		if(mapsToClass!=null){
			LinkedList<Cell> allowedClasses = mapsToClass.getLsitOfAllSubClasses();
			for(Iterator<Cell> itr1=allowedClasses.iterator();itr1.hasNext();){
				Cell allowedClassObj = itr1.next();
				JSONObject allowedClasseObj = new JSONObject(); 
				allowedClasseObj.put("id", allowedClassObj.getId());
				allowedClasseObj.put("className", allowedClassObj.getName());
				mapsToViewsArr.put(allowedClasseObj);
			}
		}
		schemaObj.put("mapsToClasses", mapsToViewsArr);

		schemaObj.put("classId", mapsToClass==null?0:mapsToClass.getId());				
		schemaObj.put("className", mapsToClass==null?"[view not mapped to a class]":mapsToClass.getName());				
		//if(parenttViewObj!=null) schemaObj.put("parentViewId", parenttViewObj.getId());
		if(parenttTabObj!=null) schemaObj.put("parentTabId", parenttTabObj.getId());
		JSONArray childViewsArr = new JSONArray(); 
		schemaObj.put("childViews", childViewsArr);
		
		JSONObject propertiesObj = new JSONObject();
		int sequence = 0;
		LinkedList<Cell> attrRefList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ATTRIBUTE_REFS_ID );
		for(Iterator<Cell> itr1=attrRefList.iterator();itr1.hasNext();){
			Cell attrRefObj = itr1.next();
			SchemaForAttrRefObj schemaPart = new SchemaForAttrRefObj(attrRefObj);
			JSONObject schemaPartObj = schemaPart.getSchemaObj();
			schemaPartObj.put("sequence", sequence);
			propertiesObj.put(Long.toString(attrRefObj.getId()), schemaPartObj);
			sequence++;
			//find the label
			Cell pointsToCell = attrRefObj.getCellByAssocType(MAPSTO_ASSOC);
			if(pointsToCell==null) continue;
			if(pointsToCell.isA(PRIMARY_NAME_ID)) {
				schemaObj.put("label", String.valueOf(attrRefObj.getId()));
			}
			else if(pointsToCell.isA(CELL_NAME_ID)) {
				schemaObj.put("label", String.valueOf(attrRefObj.getId()));
			}
		}
		schemaObj.put("properties",propertiesObj);
		resultJSONArray.put(schemaObj);
		
		LinkedList<Cell> childViewList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID );
		for(Iterator<Cell> itr1=childViewList.iterator();itr1.hasNext();){
			Cell childViewObj = itr1.next();
			childViewsArr.put(childViewObj.getId());
			if(!loopProtection.contains(childViewObj)) getJsonSchemaForView(childViewObj, viewObj, parenttTabObj, resultJSONArray, loopProtection, session);
		}
		
		LinkedList<Cell> tabList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ACCTABS_ID );
		for(Iterator<Cell> itr2=tabList.iterator();itr2.hasNext();){
			Cell tabObj = itr2.next();
			getJsonSchemaForTab(tabObj, viewObj, resultJSONArray, loopProtection, session);
		}
	}
	private void getJsonSchemaForTab(Cell tabObj, Cell parenttViewObj, JSONArray resultJSONArray, LinkedList<Cell> loopProtection, Session session) throws Exception {
		JSONObject schemaObj = new JSONObject();
		schemaObj.put("id",tabObj.getId());
		schemaObj.put("entity","tab");
		Cell displyTypeObj = tabObj.getAttributeObjByDestClass(DISPLAY_TYPE_ID);
		String displayType = displyTypeObj==null ? "" : displyTypeObj.getName();
		schemaObj.put("displayType",displayType);
		Cell nameCell = tabObj.getAttributeObjByDestClass(PRIMARY_NAME_ID);
		if(nameCell!=null) schemaObj.put("title", tabObj.getName(100));
		Cell descCell = tabObj.getAttributeObjByDestClass(DESCRIPTION_ID);
		if(descCell!=null) schemaObj.put("description",descCell.getName());
		else schemaObj.put("description", "<a href='#842.1787.1787.1802.1863'>update the description</a>");
		if(parenttViewObj!=null) schemaObj.put("parentViewId", String.valueOf(parenttViewObj.getId()));

		if(tabObj.getId()==1784) schemaObj.put("rootQuery",new JSONObject().put("id", "846/810"));
		if(tabObj.getId()==1785) schemaObj.put("rootQuery",new JSONObject().put("id", "1714/460"));
		if(tabObj.getId()==1786) schemaObj.put("rootQuery",new JSONObject().put("id", "850/702"));
		if(tabObj.getId()==1787) schemaObj.put("rootQuery",new JSONObject().put("id", "538/842"));
		if(tabObj.getId()==1788) schemaObj.put("rootQuery",new JSONObject().put("id", "844/1"));
		if(tabObj.getId()==1972) schemaObj.put("rootQuery",new JSONObject().put("id", "1975/50"));

		resultJSONArray.put(schemaObj);
		
		LinkedList<Cell> tabList = tabObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ACCTABS_ID );
		for(Iterator<Cell> itr2=tabList.iterator();itr2.hasNext();){
			Cell childTabObj = itr2.next();
			getJsonSchemaForTab(childTabObj, tabObj, resultJSONArray, loopProtection, session);
		}
		
		//JSONArray childrenAttrsArr = new JSONArray(); 
		LinkedList<Cell> childViewList = tabObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID );
		for(Iterator<Cell> itr1=childViewList.iterator();itr1.hasNext();){
			Cell childViewObj = itr1.next();
			//schemaObj.put("firstViewId",childViewObj.getId());//assumong there is only one here
			if(!loopProtection.contains(childViewObj)) getJsonSchemaForView(childViewObj, parenttViewObj, tabObj, resultJSONArray, loopProtection, session);//, childrenAttrsArr);
		}
		//schemaObj.put("childrenAttrs", childrenAttrsArr);
	}

}
