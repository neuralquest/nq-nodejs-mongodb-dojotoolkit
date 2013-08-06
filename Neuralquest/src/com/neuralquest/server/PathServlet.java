package com.neuralquest.server;

import java.io.IOException;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;
import java.util.Set;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.hibernate.Session;
import org.json.JSONArray;
import org.json.JSONObject;

import com.neuralquest.server.util.HibernateUtil;

public class PathServlet extends HttpServlet implements Constants {
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		resp.setContentType("application/x-json");
		Session session = HibernateUtil.getSessionFactory().getCurrentSession();
		try {
			session.beginTransaction();

			String hash = req.getParameter("hash")==null?"":req.getParameter("hash");
			String[] ids = hash.split("\\.");
			Cell viewObj = ids.length<1?null:(Cell)session.load(Cell.class, new Long(Long.parseLong(ids[0])));;
			Cell selectedObj = ids.length<2?null:(Cell)session.load(Cell.class, new Long(Long.parseLong(ids[1])));
			
			JSONArray reverseStateArray = new JSONArray();
			if(viewObj!=null){
				//start by adding the ids we got from the client
				JSONObject stateObj0 = new JSONObject();
				stateObj0.put("reqView", viewObj.getId());
				if(selectedObj!=null) stateObj0.put("reqSelectedObj", viewObj.getId()+"/"+selectedObj.getId());
				if(ids.length>2) stateObj0.put("reqTab", Long.parseLong(ids[2]));
				//add to the state array
				reverseStateArray.put(stateObj0);
				// get the parent tab of this viewObj
				LinkedList<Cell> loopProtectionList = new LinkedList<Cell>();
				Cell tabObj = getPreviousAccTab(viewObj, loopProtectionList);
				while(tabObj!=null){
					//now that we have the previous tab find out if the view is part of a tree;
					if(selectedObj!=null){
						//if the tab Obj represtents a tree then create the tree path to expand.
						Cell valueCell = tabObj.getAttributeObjByDestClass(DISPLAY_TYPE_ID);
						long displyType = valueCell==null ? 0 : valueCell.getId();
						if(1==2 &&displyType == DISP_TYPE_TREES_ID) {
							JSONArray pathArray = new JSONArray();
							getTreePath(pathArray, viewObj, selectedObj);
							pathArray.put(selectedObj.getId());
							stateObj0.put("treePath", pathArray);
						}
					}
					JSONObject stateObj = new JSONObject();
					stateObj.put("reqTab", tabObj.getId());
					Cell viewClass = (Cell) session.load(Cell.class, new Long(VIEWS_ID));
					viewObj = tabObj.xxxfindFirstReverse(viewClass);
					if(viewObj!=null) stateObj.put("reqView", viewObj.getId());
					//add to the state array
					reverseStateArray.put(stateObj);
					//get the next previous tab
					LinkedList<Cell> loopProtectionList1 = new LinkedList<Cell>();
					tabObj = getPreviousAccTab(viewObj, loopProtectionList1);
				}
			}
			JSONArray stateArray = new JSONArray();
			for(int i=reverseStateArray.length()-1; i>=0; i--){
				stateArray.put(reverseStateArray.get(i));
			}
			resp.getWriter().print(stateArray.toString(4));
			
			session.getTransaction().commit();
		}
		catch (Exception e) {
			session.getTransaction().rollback();
			throw new ServletException(e); // or display error message
		}
	}
	private boolean getTreePath(JSONArray pathArray, Cell viewObj, Cell selectedObj){
		System.out.println("viewObj:\t"+viewObj.getId()+"-"+viewObj.getName(50));
		//find the parent views. usually one since its a many to one relationship, in case of recursive it may be the same as viewobj 
		for(Iterator<Assoc> itr2=viewObj.getDestAssocs().iterator();itr2.hasNext();){
			Assoc assoc1 = itr2.next();
			if(assoc1.getType()==MANYTOMANY_ASSOC){
				if(assoc1.getSourceFk().isA(VIEWS_ID)) {
					Cell parentViewObj = assoc1.getSourceFk();
					System.out.println("parentViewObj:\t"+parentViewObj.getId()+"-"+parentViewObj.getName(50));
					//find the parent object, usually one
					LinkedList<Cell> parentObjList  = getReverseListOfRelatedObjectsByView(selectedObj, parentViewObj, viewObj);
					for(Iterator<Cell> itr1=parentObjList.iterator();itr1.hasNext();){
						Cell parentObj = itr1.next();
						System.out.println("parentObj:\t"+parentObj.getId()+"-"+parentObj.getName(50));
						if(getTreePath(pathArray, parentViewObj, parentObj)){
							//found the previous level was a tab or a previous view
							pathArray.put(parentViewObj.getId()+"/"+parentObj.getId());
							return true;
						}
						else return false;
					}
				}
				else if(assoc1.getSourceFk().isA(ACCTABS_ID)) {
					return true;//found
				}
			}
		}
		return false;
	}
	private Cell getPreviousAccTab(Cell viewObj, LinkedList<Cell> loopProtectionList){
		for(Iterator<Assoc> itr2=viewObj.getDestAssocs().iterator();itr2.hasNext();){
			Assoc assoc1 = itr2.next();
			if(assoc1.getType()==MANYTOMANY_ASSOC){
				if(assoc1.getSourceFk().isA(ACCTABS_ID)) return assoc1.getSourceFk();
				if(assoc1.getSourceFk().isA(VIEWS_ID)&& !loopProtectionList.contains(assoc1.getSourceFk())){
					loopProtectionList.add(assoc1.getSourceFk());
					return getPreviousAccTab(assoc1.getSourceFk(), loopProtectionList);
				}
			}
		}
		return null;
	}

	// This is a copy of the one you find in Cell, except all the searches are reversed  
	//public LinkedList<Cell> getReverseListOfRelatedObjectsByView(Cell  prevViewObj, Cell viewObj,){
	public LinkedList<Cell> getReverseListOfRelatedObjectsByView(Cell selectedObj, Cell parentViewObj, Cell destClass){
		//Cell destClass = parentViewObj.getCellByAssocType(MAPSTO_ASSOC);;
		Cell assocTypeObj = parentViewObj.getAttributeObjByDestClass(TO_MANY_ASSOC_TYPES_ID);
		long assocType = assocTypeObj.getId();

		if(assocType>=PARENT_ASSOC && assocType<=OWNS_ASSOC){
			long reverseAssocType = assocType + 12;
			selectedObj.getListOfRelatedObjectsByAssocTypeAndDestClass(reverseAssocType, destClass);
		}
		else if(assocType>=CHILDREN_PASSOC && assocType<=OWNED_BY_PASSOC){
			long reverseAssocType = assocType - 12;
			selectedObj.getListOfRelatedObjectsByAssocTypeAndDestClass(reverseAssocType, destClass);
		}
		return new LinkedList<Cell>();
	}
}

