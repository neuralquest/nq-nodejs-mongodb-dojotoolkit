package com.neuralquest.server;

import java.io.IOException;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.logging.ConsoleHandler;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.dom4j.Document;
import org.dom4j.DocumentFactory;
import org.dom4j.Element;
import org.hibernate.Session;

import com.neuralquest.server.util.HibernateUtil;

public class ConsistancyServlet extends HttpServlet  implements Constants {
	public ConsistancyServlet() {super();}
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {		
		resp.setContentType("text/html");//("text/html");
		Session session = HibernateUtil.getSessionFactory().getCurrentSession();
		try {
			session.beginTransaction();

			
			Document doc = DocumentFactory.getInstance().createDocument();
			Element htmlEl = doc.addElement("html");
			Element headEl = htmlEl.addElement("head");
			Element styleEl = headEl.addElement("style").addAttribute("type", "text/css");
			styleEl.addText("body {font-family: sans-serif; background: #FFFFFF url(../img/testsBodyBg.gif) repeat-x scroll left top; }");
			Element bodyEl = htmlEl.addElement("body");
			
			
			
			bodyEl.addElement("h2").addText("Adopt Orfans");
			bodyEl.addElement("p").addText("Any Cells that do not have a parent will be adopted by Orfan");
			Element listEl = bodyEl.addElement("ul").addText("");			
			//Find orfans
			List<Cell> results = session.createQuery(
				"from Cell as c1 " +
				"where c1.id not in ( " +
					"select a1.sourceFk " +
						"from Assoc as a1 " +
						"where a1.type = 3 " +
					")").list();
			Cell orfanClass = (Cell) session.load(Cell.class, new Long(ORFANS_ID));
			for(Iterator<Cell> itr2=results.iterator();itr2.hasNext();){
				Cell obj = itr2.next();
				if(obj.getId()==1) continue;
				listEl.addElement("li").addText(obj.getIdName(0));
				makeAssoc(obj, PARENT_ASSOC, orfanClass, session);
			}
			
			
			
		
			
			bodyEl.addElement("h2").addText("Attributes");
			bodyEl.addElement("p").addText("All attributes must be owned by one object, unless it's a 'permitted value'.");
			Element tableEl1 = bodyEl.addElement("table").addAttribute("border","0");			
			Element rowEl1 = tableEl1.addElement("tr");
			rowEl1.addElement("th").addText("id");
			rowEl1.addElement("th").addText("name");
			rowEl1.addElement("th").addText("type");
			rowEl1.addElement("th").addText("owner id");
			rowEl1.addElement("th").addText("owner name");
			rowEl1.addElement("th").addText("omwer type");
			Cell pagesClass1 = (Cell) session.load(Cell.class, new Long(ATTRIBUTES_ID));//contents
			LinkedList<Cell> objList1 = pagesClass1.getListOfInstances();
			for(Iterator<Cell> itr2=objList1.iterator();itr2.hasNext();){
				Cell obj = itr2.next();
				if(obj.isA(PERMITTED_VALUES_ID)) continue;
				LinkedList<Cell> parentAttrList = obj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ATTRIBUTE_OF_PASSOC, 0);
				if(parentAttrList.isEmpty()){
					Element rowEl2 = tableEl1.addElement("tr");
					rowEl2.addElement("td").addText(String.valueOf(obj.getId()));
					rowEl2.addElement("td").addText(obj.getName());
					rowEl2.addElement("td").addText(obj.getCellByAssocType(PARENT_ASSOC).getName());
					//destroyCell(obj, session);

				}
				if(parentAttrList.size()>1){
					for(Iterator<Cell> itr1=parentAttrList.iterator();itr2.hasNext();){
						Cell attrParent = itr1.next();
						Element rowEl2 = tableEl1.addElement("tr");
						rowEl2.addElement("td").addText(String.valueOf(obj.getId()));
						rowEl2.addElement("td").addText(obj.getName());
						rowEl2.addElement("td").addText(obj.getCellByAssocType(PARENT_ASSOC).getName());
						rowEl2.addElement("td").addText(String.valueOf(attrParent.getId()));
						rowEl2.addElement("td").addText(attrParent.getName());
						rowEl2.addElement("td").addText(attrParent.getCellByAssocType(PARENT_ASSOC).getName());
					}
				}
			}

			
		
			
			bodyEl.addElement("h2").addText("Invalid Object Associations");
			bodyEl.addElement("p").addText("All object associations must be of a type and destination that is allowed by the class model.");
			Element tableEl2 = bodyEl.addElement("table").addAttribute("border","0");			
			Element rowEl2 = tableEl2.addElement("tr");
			rowEl2.addElement("th").addText("id");
			rowEl2.addElement("th").addText("object name");
			rowEl2.addElement("th").addText("id");
			rowEl2.addElement("th").addText("object type");
			rowEl2.addElement("th").addText("id");
			rowEl2.addElement("th").addText("relationship type");
			rowEl2.addElement("th").addText("id");
			rowEl2.addElement("th").addText("destination name");
			rowEl2.addElement("th").addText("id");
			rowEl2.addElement("th").addText("destination type");
			Cell pagesClass2 = (Cell) session.load(Cell.class, new Long(1));//root
			LinkedList<Assoc> usedAssocList = new LinkedList<Assoc>();
			LinkedList<Cell> objList2 = pagesClass2.getListOfInstances();
			for(Iterator<Cell> itr2=objList2.iterator();itr2.hasNext();){
				Cell sourceObj = itr2.next();
				for(Iterator itr1=sourceObj.getSourceAssocs().iterator();itr1.hasNext();){ //walk the relationships of the obj
					Assoc relatedObjAssoc = ((Assoc)itr1.next());
					Cell destObj = relatedObjAssoc.getDestFk();
					byte type = relatedObjAssoc.getType();
					if(type==NEXT_ASSOC) continue;
					boolean allowed = isAssocAllowed(sourceObj, type, destObj, usedAssocList);
					if(!allowed){	
						Element rowEl3 = tableEl2.addElement("tr");
						rowEl3.addElement("td").addText(String.valueOf(sourceObj.getId()));
						rowEl3.addElement("td").addText(sourceObj.getName(50));
						rowEl3.addElement("td").addText(String.valueOf(sourceObj.getCellByAssocType(PARENT_ASSOC).getId()));						
						rowEl3.addElement("td").addText(sourceObj.getCellByAssocType(PARENT_ASSOC).getName(50));						
						rowEl3.addElement("td").addElement("b").addText(String.valueOf(type));
						rowEl3.addElement("td").addElement("b").addText(((Cell)session.load(Cell.class, new Long(type))).getName());
						rowEl3.addElement("td").addText(String.valueOf(destObj.getId()));
						rowEl3.addElement("td").addText(destObj.getName(50));
						Cell destParent = destObj.getCellByAssocType(PARENT_ASSOC);
						if(destParent==null) {
							rowEl3.addElement("td").addAttribute("style", "color:red;").addText("null");
							rowEl3.addElement("td").addAttribute("style", "color:red;").addText("null");	
						}
						else {
							rowEl3.addElement("td").addText(String.valueOf(destParent.getId()));
							rowEl3.addElement("td").addText(destParent.getName(50));
						}
					}
				}
			}			
			bodyEl.addElement("h2").addText("Unused Class Associations");
			bodyEl.addElement("p").addText("Class associations that are never used.");
			Element tableEl3 = bodyEl.addElement("table").addAttribute("border","0");			
			Element rowEl3 = tableEl3.addElement("tr");
			rowEl3.addElement("th").addText("id");
			rowEl3.addElement("th").addText("class name");
			rowEl3.addElement("th").addText("id");
			rowEl3.addElement("th").addText("relationship type");
			rowEl3.addElement("th").addText("id");
			rowEl3.addElement("th").addText("class name");
			LinkedList<Cell> classList = pagesClass2.getLsitOfAllSubClasses();
			for(Iterator<Cell> itr2=classList.iterator();itr2.hasNext();){
				Cell sourceClass = itr2.next();
				for(Iterator itr1=sourceClass.getSourceAssocs().iterator();itr1.hasNext();){ //walk the relationships of the obj
					Assoc relatedClassAssoc = ((Assoc)itr1.next());
					if(relatedClassAssoc.getType()==PARENT_ASSOC) continue;
					byte type = relatedClassAssoc.getType();
					Cell destClass = relatedClassAssoc.getDestFk();
					if(!usedAssocList.contains(relatedClassAssoc)){
						Element rowEl4 = tableEl3.addElement("tr");
						rowEl4.addElement("td").addText(String.valueOf(sourceClass.getId()));
						rowEl4.addElement("td").addText(sourceClass.getName());
						rowEl4.addElement("td").addElement("b").addText(String.valueOf(type));
						rowEl4.addElement("td").addElement("b").addText(((Cell)session.load(Cell.class, new Long(type))).getName());
						rowEl4.addElement("td").addText(String.valueOf(destClass.getId()));
						rowEl4.addElement("td").addText(destClass.getName(50));
					}
				}
			}			
		

			
			
			
			
			
		
			bodyEl.addElement("h2").addText("Page Parts");
			bodyEl.addElement("p").addText("Any Views, AccTabs or AttrRefs that are not used. As seen from PAGE_MODEL_ID");
			Element tableEl = bodyEl.addElement("table").addAttribute("border","0");			
			Element rowEl = tableEl.addElement("tr");
			rowEl.addElement("th").addText("id");
			rowEl.addElement("th").addText("name");
			rowEl.addElement("th").addText("type");

			Cell firstView = (Cell)session.load(Cell.class, new Long(842)); //navigation view
			LinkedList<Cell> validObjList = new LinkedList<Cell>();
			walkTheViews(firstView, validObjList, session);
			
			Cell pagesClass = (Cell) session.load(Cell.class, new Long(62));//Page parts
			LinkedList<Cell> checkObjList = pagesClass.getListOfInstances();
			
			for(Iterator<Cell> itr2=checkObjList.iterator();itr2.hasNext();){
				Cell obj = itr2.next();
				if(validObjList.contains(obj)) continue;
				Element rowEl0 = tableEl.addElement("tr");
				rowEl0.addElement("td").addText(String.valueOf(obj.getId()));
				rowEl0.addElement("td").addText(obj.getName(50));
				rowEl0.addElement("td").addText(obj.getCellByAssocType(PARENT_ASSOC).getName(50));
				//destroyCell(obj, session);
			}

			bodyEl.addElement("h2").addText("View Report");
			reportViews(bodyEl, firstView, new LinkedList<Cell>());
			
			
			
			/*Cell pagesClassx = (Cell) session.load(Cell.class, new Long(438));//Process Classes
			LinkedList<Cell> checkObjList2 = new LinkedList<Cell>();
			pagesClassx.getListOfInstances(checkObjList2);
			for(Iterator<Cell> itr2=checkObjList2.iterator();itr2.hasNext();){
				Cell obj = (Cell)itr2.next();
				obj.setName(null);
				session.save(obj);
			}*/

			

			
			
			/*bodyEl.addElement("h2").addText("Contents");
			bodyEl.addElement("p").addText("All contents must be part of an ordered list, unless it's 'essays'.");
			Element tableEl0 = bodyEl.addElement("table").addAttribute("border","0");			
			Element rowEl0 = tableEl0.addElement("tr");
			rowEl0.addElement("th").addText("id");
			rowEl0.addElement("th").addText("name");
			rowEl0.addElement("th").addText("type");
			Cell pagesClass0 = (Cell) session.load(Cell.class, new Long(783));//contents
			LinkedList<Cell> objList0 = pagesClass0.getListOfInstances();
			for(Iterator<Cell> itr2=objList0.iterator();itr2.hasNext();){
				Cell obj = itr2.next();
				if(obj.getId() == 810) continue;//essays
				boolean found = false;
				for(Iterator itr1=obj.getDestAssocs().iterator();itr1.hasNext();){
					Assoc a1 = (Assoc)itr1.next();
					if(a1.getType() == ORDERED_ASSOC || a1.getType() == NEXT_ASSOC){
						found = true;
						continue;
					}
				}
				if(!found){
					Element rowEl2 = tableEl0.addElement("tr");
					rowEl2.addElement("td").addText(String.valueOf(obj.getId()));
					rowEl2.addElement("td").addText(obj.getName(50));
					rowEl2.addElement("td").addText(obj.getCellByAssocType(PARENT_ASSOC).getName(50));
				}
			}*/

			
			

			resp.getWriter().print(doc.asXML());


			session.getTransaction().commit();
		}
		catch (Exception e) {
			session.getTransaction().rollback();
			throw new ServletException(e); // or display error message
		}		
	}
	private void walkTheViews(Cell view, LinkedList<Cell> objList, Session session){
		if(objList.contains(view)) return;
		objList.add(view);
		LinkedList<Cell> refsList = view.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ATTRIBUTE_REFS_ID);
		for(Iterator<Cell> itr0=refsList.iterator();itr0.hasNext();){
			objList.add(itr0.next());
		}
		LinkedList<Cell> widgetsList = view.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, WIDGET_ID);
		for(Iterator<Cell> itr0=widgetsList.iterator();itr0.hasNext();){
			Cell widget = itr0.next();
			walkTheViews(widget, objList, session);
		}
		LinkedList<Cell> tabsList = view.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ACCTABS_ID);
		for(Iterator<Cell> itr0=tabsList.iterator();itr0.hasNext();){
			Cell childAccTabs = itr0.next();
			walkTheViews(childAccTabs, objList, session);
		}
		LinkedList<Cell> viewsList = view.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID);
		for(Iterator<Cell> itr0=viewsList.iterator();itr0.hasNext();){
			Cell childView = itr0.next();
			walkTheViews(childView, objList, session);
		}
	}
	private void reportViews(Element bodyEl, Cell view, LinkedList<Cell> objList){
		if(objList.contains(view)) return;
		objList.add(view);
		//bodyEl.addElement("h3").addText("View: "+view.getIdName(50));
		bodyEl.addElement("h3").addAttribute("style", "color:BlueViolet;").addText("View: "+view.getIdName(50));
		Cell viewMTClass = view.getCellByAssocType(MAPSTO_ASSOC);
		Cell assocTypeObj = view.getAttributeObjByDestClass(ASSOCIATION_TYPES_ID);
		Element listEl = bodyEl.addElement("ul").addText("");
		listEl.addElement("li").addText("assoc from previous: "+(assocTypeObj==null?"null":assocTypeObj.getIdName(50)));
		listEl.addElement("li").addText("maps to: "+ (viewMTClass==null?"null":viewMTClass.getIdName(50)));
		Element listEl1 = listEl.addElement("ol").addText("");
		LinkedList<Cell> refsList = view.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ATTRIBUTE_REFS_ID);
		for(Iterator<Cell> itr1=refsList.iterator();itr1.hasNext();){
			Cell attrRef = itr1.next();
			//listEl1.addElement("li").addText("attribute reference: "+attrRef.getIdName(50));
			listEl1.addElement("li").addAttribute("style", "color:green;").addText("attribute reference: "+attrRef.getIdName(50));
			Cell attrRefMTClass = attrRef.getCellByAssocType(MAPSTO_ASSOC);
			Cell attrRefAssocTypeObj = attrRef.getAttributeObjByDestClass(TO_ONE_ASSOC_TYPES_ID);
			Element listEl2 = listEl1.addElement("ul").addText("");
			listEl2.addElement("li").addText("assoc type: "+(attrRefAssocTypeObj==null?"null":attrRefAssocTypeObj.getIdName(50)));
			listEl2.addElement("li").addText("maps to: "+(attrRefMTClass==null?"null":attrRefMTClass.getIdName(50)));
		}
		
		reportTabs(listEl, view, objList);

		LinkedList<Cell> viewsList = view.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID);
		for(Iterator<Cell> itr0=viewsList.iterator();itr0.hasNext();){
			Cell childView = itr0.next();
			reportViews(listEl, childView, objList);
		}
	}
	private void reportTabs(Element listEl, Cell viewTab, LinkedList<Cell> objList){
		
		LinkedList<Cell> tabsList = viewTab.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ACCTABS_ID);
		for(Iterator<Cell> itr1=tabsList.iterator();itr1.hasNext();){
			Cell childAccTabs = itr1.next();
			//listEl.addElement("h3").addText("AccTab: "+childAccTabs.getIdName(50));
			listEl.addElement("h4").addAttribute("style", "color:blue;").addText("AccTab: "+childAccTabs.getIdName(50));
			Cell dispTypeObj = childAccTabs.getAttributeObjByDestClass(DISPLAY_TYPE_ID);
			Cell tabMTObj = childAccTabs.getCellByAssocType(MAPSTO_ASSOC);
			Element listEl3 = listEl.addElement("ul").addText("");
			listEl3.addElement("li").addText("display type: "+(dispTypeObj==null?"null":dispTypeObj.getIdName(50)));
			listEl3.addElement("li").addText("fk: "+(tabMTObj==null?"null":tabMTObj.getIdName(50)));
			
			reportWidgets(listEl3, childAccTabs, objList);
			reportTabs(listEl3, childAccTabs, objList);
			
			LinkedList<Cell> viewsList = childAccTabs.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID);
			for(Iterator<Cell> itr0=viewsList.iterator();itr0.hasNext();){
				Cell childView = itr0.next();
				reportViews(listEl3, childView, objList);
			}
		}
	}
	private void reportWidgets(Element listEl, Cell viewTab, LinkedList<Cell> objList){
		
		LinkedList<Cell> widgetsList = viewTab.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, WIDGET_ID);
		for(Iterator<Cell> itr1=widgetsList.iterator();itr1.hasNext();){
			Cell childWidget = itr1.next();
			//listEl.addElement("h3").addText("AccTab: "+childWidget.getIdName(50));
			listEl.addElement("h4").addAttribute("style", "color:orange;").addText("Widget: "+childWidget.getIdName(50));
			Cell dispTypeObj = childWidget.getAttributeObjByDestClass(DISPLAY_TYPE_ID);
			Cell tabMTObj = childWidget.getCellByAssocType(MAPSTO_ASSOC);
			Element listEl3 = listEl.addElement("ul").addText("");
			listEl3.addElement("li").addText("display type: "+(dispTypeObj==null?"null":dispTypeObj.getIdName(50)));
			listEl3.addElement("li").addText("parentId: "+(tabMTObj==null?"null":tabMTObj.getIdName(50)));
			
			reportTabs(listEl3, childWidget, objList);
			
			LinkedList<Cell> viewsList = childWidget.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID);
			for(Iterator<Cell> itr0=viewsList.iterator();itr0.hasNext();){
				Cell childView = itr0.next();
				reportViews(listEl3, childView, objList);
			}
		}
	}
	private String listToString(LinkedList list){
		String retString = "";
		for(Iterator itr1=list.iterator();itr1.hasNext();){
			Cell cell = (Cell)itr1.next();
			retString += " "+cell.getId()+"-"+cell.getName(50);
		}
		return retString;
	}

	private  void destroyCell(Cell cell, Session session){
		// attributes are deleted automaticly here
		LinkedList<Cell> attrList = cell.getListOfRelatedObjectsByAssocTypeAndDestClassId(ATTRIBUTE_ASSOC, ATTRIBUTES_ID);
		for(Iterator<Cell> itr2=attrList.iterator();itr2.hasNext();){
			Cell attrCell = itr2.next();
			if(!attrCell.isA(PERMITTED_VALUES_ID)) deleteCell(attrCell, session);			
		}
		deleteCell(cell, session);

	}
	private void deleteCell(Cell delCell, Session session) {
		destroySourceAssoc(delCell, (byte)0, null, session);
		destroyDestAssoc(delCell, (byte)0, null, session);
		session.delete(delCell);
	}
	private void destroySourceAssoc(Cell sourceCell, byte type, Cell destCell, Session session){
		//type and destCell may be null
		for(Iterator<Assoc> itr1=sourceCell.getSourceAssocs().iterator();itr1.hasNext();){
			Assoc pAssoc = itr1.next();
			Cell dest = pAssoc.getDestFk();
			if((type==0||type==pAssoc.getType()) && (destCell==null||dest.equals(destCell))){
				itr1.remove();
				sourceCell.getSourceAssocs().remove(pAssoc);
				dest.getDestAssocs().remove(pAssoc);
				session.save(dest);
				session.delete(pAssoc);
			}				
		}
		session.save(sourceCell);
	}
	private void destroyDestAssoc(Cell destCell, byte type, Cell sourceCell, Session session){
		//type and sourcetCell may be null
		for(Iterator<Assoc> itr1=destCell.getDestAssocs().iterator();itr1.hasNext();){
			Assoc pAssoc = itr1.next();
			Cell source = pAssoc.getSourceFk();
			if((type==0||type==pAssoc.getType()) && (sourceCell==null||source.equals(sourceCell))){
				itr1.remove();
				destCell.getDestAssocs().remove(pAssoc);
				source.getSourceAssocs().remove(pAssoc);
				session.save(source);
				session.delete(pAssoc);
			}				
		}
		session.save(destCell);
	}
	private void makeAssoc(Cell sourceFk, byte type, Cell destFk, Session session){
		Assoc pAssoc = new Assoc();
		pAssoc.setSourceFk(sourceFk);
		pAssoc.setType(type);
		pAssoc.setDestFk(destFk);
		session.save(pAssoc);
		sourceFk.addTosourceAssocs(pAssoc);
		destFk.addTodestAssocs(pAssoc);
		session.save(sourceFk);
		session.save(destFk);
	}
	private boolean isAssocAllowed(Cell sourceCell, byte type, Cell destCell, LinkedList<Assoc> usedAssocList){
		if(type==NEXT_ASSOC) throw new RuntimeException("Cennot test NEXT_ASSOC");
		LinkedList<Cell> sourceCellParentsList = sourceCell.getListOfSuperClasses();
		LinkedList<Cell> destCellParentsList = destCell.getListOfSuperClasses();
		for(Iterator<Cell> itr1=sourceCellParentsList.iterator();itr1.hasNext();){
			Cell sourceCellParent = itr1.next();
			for(Iterator<Assoc> itr2=sourceCellParent.getSourceAssocs().iterator();itr2.hasNext();){
				Assoc pAssoc = itr2.next();
				Cell dest = pAssoc.getDestFk();
				if(type==pAssoc.getType() && destCellParentsList.contains(dest)) {
					usedAssocList.add(pAssoc);
					return true; //association allowed
				}
			}
		}
		return false;
	}

}
