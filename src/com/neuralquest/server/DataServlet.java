package com.neuralquest.server;

import java.io.BufferedReader;
import java.io.IOException;
import java.net.URLDecoder;
import java.text.DateFormat;
import java.text.ParseException;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.dom4j.DocumentException;
import org.dom4j.DocumentHelper;
import org.hibernate.Session;
import org.json.JSONArray;
import org.json.JSONObject;

import com.neuralquest.server.util.HibernateUtil;

public class DataServlet extends HttpServlet implements Constants {

	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {		
		resp.setCharacterEncoding("UTF-8");
		resp.setContentType("application/json; charset=UTF-8");

		Session session = HibernateUtil.getSessionFactory().getCurrentSession();
		try {
			session.beginTransaction();

			Cell userObj = getUserObj(req, session);			
			
			if(req.getQueryString()==null) {
				// No query has been sent, so this is a request for a single object  
				// Example: /cell/846
				String[] reqUri = req.getPathInfo().split("/");
				String tableName = reqUri[reqUri.length-2];
				String prefetch = reqUri[reqUri.length-1];
				JSONObject rowObject = new JSONObject();
				/*if(prefetch.equals("prefetch")){
					long THEROOT = 1;
					long PAGES = 62;
					long DOCUMENTS = 78;
					JSONArray cellArray = new JSONArray();
					JSONArray assocArray = new JSONArray();
					JSONArray queryCacheForwardArray = new JSONArray();
					JSONArray queryCacheBackwardArray = new JSONArray();
					Cell rootCell = (Cell) session.get(Cell.class, THEROOT);
					LinkedList<Cell> cellList = rootCell.getLsitOfAllSubClasses();
					Cell pageModelCell = (Cell) session.get(Cell.class, PAGES);
					LinkedList<Cell> pagemodelList = pageModelCell.getListOfInstances();
					Cell documentCell = (Cell) session.get(Cell.class, DOCUMENTS);
					LinkedList<Cell> documentList = documentCell.getListOfInstances();
					cellList.addAll(pagemodelList);
					cellList.addAll(documentList);
					for(Iterator<Cell> itr0=cellList.iterator();itr0.hasNext();){
						Cell cellObj = itr0.next();
						JSONObject cellObject = new JSONObject();
						cellObject.put("id", cellObj.getId());
						cellObject.put("type", cellObj.getType());
						String cellName = cellObj.getName();
						cellObject.put("name", cellName!=null?cellName:null);
						cellArray.put(cellObject);
						for(Iterator<Assoc> itr=cellObj.getSourceAssocs().iterator();itr.hasNext();){
							Assoc assoc = (Assoc)itr.next();
							JSONObject assocObject = new JSONObject();
							assocObject.put("id", assoc.getId());
							assocObject.put("sourceFk", assoc.getSourceFk().getId());
							assocObject.put("type", assoc.getType());
							assocObject.put("destFk", assoc.getDestFk().getId());
							assocArray.put(assocObject);
							
							JSONObject sourceTypePairs = new JSONObject();
							sourceTypePairs.put("sourceFk", cellObj.getId());
							sourceTypePairs.put("type", assoc.getType());
							queryCacheForwardArray.put(sourceTypePairs);
						}
					}
					rowObject.put("cell", cellArray);
					rowObject.put("assoc", assocArray);
					rowObject.put("queryCacheForward", queryCacheForwardArray);
					rowObject.put("queryCacheBackward", queryCacheBackwardArray);
				}*/
				if(prefetch.equals("prefetch")){
					JSONArray cellArray = new JSONArray();
					JSONArray assocArray = new JSONArray();
					List<Cell> cells = session.createQuery("from Cell").list();
					for(Iterator<Cell> itr1=cells.iterator();itr1.hasNext();){
						Cell cellObj = itr1.next();
						cellArray.put(cellToJson(cellObj));
					}
					List<Assoc> assocs = session.createQuery("from Assoc").list();
					for(Iterator<Assoc> itr2=assocs.iterator();itr2.hasNext();){
						Assoc assoc = itr2.next();
						assocArray.put(assocToJson(assoc));
					}
					rowObject.put("cell", cellArray);
					rowObject.put("assoc", assocArray);
				}
				else if(tableName.equals("cell")){
					long cellId = Long.parseLong(reqUri[reqUri.length-1]);
					Cell cellObj = (Cell) session.get(Cell.class, new Long(cellId));
					rowObject = cellToJson(cellObj);
				}
				else if(tableName.equals("assoc")){
					long assocId = Long.parseLong(reqUri[reqUri.length-1]);
					Assoc assoc = (Assoc)session.get(Assoc.class, assocId);
					rowObject = assocToJson(assoc);
				}
				resp.getWriter().print(rowObject.toString(4));
			}
			else{
				// We've recieved a query so we must return an array	
				// Example: /?sourceFk=468&type=8
				JSONArray tableArray = new JSONArray();
				String[] queryStringArr = URLDecoder.decode(req.getQueryString(), "UTF-8").split("&");
				long sourceFk = 0;
				long type = 0;
				long destFk = 0;
				for(int i=0; i<queryStringArr.length; i++){
					String[] queryStringParts = queryStringArr[i].split("=");
					if("sourceFk".equals(queryStringParts[0])){						
						sourceFk = Long.parseLong(queryStringParts[1]);
					}
					else if("type".equals(queryStringParts[0])){						
						type = Long.parseLong(queryStringParts[1]);
					}
					else if("destFk".equals(queryStringParts[0])){						
						destFk = Long.parseLong(queryStringParts[1]);
					}
				}
				if(sourceFk != 0 && type != 0 && destFk != 0 ){
					Cell sourceCell = (Cell) session.get(Cell.class, sourceFk);
					for(Iterator<Assoc> itr=sourceCell.getSourceAssocs().iterator();itr.hasNext();){
						Assoc assoc = (Assoc)itr.next();
						byte assocType = assoc.getType();
						long assocDestId = assoc.getDestFk().getId();
						if(assocType == type && assocDestId == destFk){
							tableArray.put(assocToJson(assoc));
						}
					}			
				}
				else if(sourceFk != 0 && type != 0){
					Cell sourceCell = (Cell) session.get(Cell.class, sourceFk);
					for(Iterator<Assoc> itr=sourceCell.getSourceAssocs().iterator();itr.hasNext();){
						Assoc assoc = (Assoc)itr.next();
						byte assocType = assoc.getType();
						//System.out.println("type:\t"+type+" assocType:\t"+assocType);
						if(assocType == type){
							tableArray.put(assocToJson(assoc));
						}
					}			
				}
				else if(destFk != 0 && type != 0){
					Cell destCell = (Cell) session.get(Cell.class, destFk);
					for(Iterator<Assoc> itr=destCell.getDestAssocs().iterator();itr.hasNext();){
						Assoc assoc = (Assoc)itr.next();
						byte assocType = assoc.getType();
						//System.out.println("type:\t"+type+" assocType:\t"+assocType);
						if(assocType == type){
							tableArray.put(assocToJson(assoc));
						}
					}			
				}
				resp.getWriter().print(tableArray.toString(4));
			}
			// see http://www.sitepen.com/blog/2009/01/26/new-in-jsonreststore-13-dates-deleting-conflict-handling-and-more/
			// Last-Modified: Fri, 21 Nov 2008 09:52:12 MST
	        Date now = new Date();
			resp.addHeader("Last-Modified", now.toString());			

			session.getTransaction().commit();
		}
		catch (Exception e) {
			session.getTransaction().rollback();
			throw new ServletException(e); // or display error message
		}
	}
	protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		resp.setCharacterEncoding("UTF-8");
		resp.setContentType("application/json; charset=UTF-8");
		Session session = HibernateUtil.getSessionFactory().getCurrentSession();
		try {
			session.beginTransaction();
			
			if(!req.isUserInRole("user")) throw new RuntimeException("Authorization Needed");
			BufferedReader reader = req.getReader();
			String line = reader.readLine();
			JSONArray postArray = new JSONArray(line);
			Map<String, Cell> idCellMap = new HashMap<String, Cell>();
			Map<String, Assoc> idAssocMap = new HashMap<String, Assoc>();

			for(int i = 0; i < postArray.length(); i++){
				JSONObject actionObj = postArray.getJSONObject(i);
				String method = actionObj.getString("method");
				String table = actionObj.getString("table");
				if(table.equals("cell")){
					if(method.equals("add") || method.equals("put")){
						JSONObject data = actionObj.getJSONObject("target");
						String idString = data.getString("id");
						long attrRefId = data.optInt("attrRefId", 0);
						String name = data.optString("name", null);
						isValueAllowed(name, attrRefId, session);
						Cell theCell = getOrMakeCellBasedOnCid(idString, session, idCellMap);
						byte type = (byte)data.getInt("type");
						theCell.setType(type);
						theCell.setName(name);
						session.save(theCell);
					}
					else if(method.equals("remove")){
						String idString = actionObj.getString("target");
						Cell theCell = getOrMakeCellBasedOnCid(idString, session, idCellMap);
						//session.delete(theCell);
						deleteCell(theCell, session);
					}
				}
				if(table.equals("assoc")){
					if(method.equals("add") || method.equals("put")){
						JSONObject data = actionObj.getJSONObject("target");
						String idString = data.getString("id");
						Cell sourceFkCell = getOrMakeCellBasedOnCid(data.getString("sourceFk"), session, idCellMap);
						byte type = (byte)data.getInt("type");
						Cell destFkCell = getOrMakeCellBasedOnCid(data.getString("destFk"), session, idCellMap);
						if(idString.contains("cid")){
							Assoc assoc = idAssocMap.get(idString);//do we know this cell already, was it created in the same conversation?
							if(assoc==null){//apparently not, perhapse there will be a post lateron. Make the cell here.
								assoc = makeAssoc(sourceFkCell, type, destFkCell, session);
								idAssocMap.put(idString, assoc);
							}
							else updateAssoc(assoc, sourceFkCell, type, destFkCell, session);
						}
						else{
							long id = Long.parseLong(idString);
							Assoc assoc = (Assoc)session.load(Assoc.class, id);
							updateAssoc(assoc, sourceFkCell, type, destFkCell, session);
						}
					}
					else if(method.equals("remove")){
						String idString = actionObj.getString("target");
						Assoc theAssoc = null;
						if(idString.contains("cid")) theAssoc = idAssocMap.get(idString);//do we know this cell already, was it created in the same conversation?
						//else theAssoc = (Assoc) session.load(Assoc.class, Long.parseLong(idString));
						else theAssoc = (Assoc) session.get(Assoc.class, Long.parseLong(idString));
						if(theAssoc!=null) deleteAssoc(theAssoc, session);;
					}
				}
			}
			for(int i = 0; i < postArray.length(); i++){
				JSONObject actionObj = postArray.getJSONObject(i);
				String method = actionObj.getString("method");
				String table = actionObj.getString("table");
				if(table.equals("assoc") && (method.equals("add") || method.equals("put"))){
					JSONObject data = actionObj.getJSONObject("target");
					String idString = data.getString("id");
					Assoc assoc = null;
					if(idString.contains("cid")) assoc = idAssocMap.get(idString);//do we know this cell already, was it created in the same conversation?
					else assoc = (Assoc)session.load(Assoc.class, Long.parseLong(idString));
					isAssocAllowed(assoc);
				}
			}
			JSONArray newIdsArr = new JSONArray();
			Iterator<Entry<String, Cell>> keyValuePairs1 = idCellMap.entrySet().iterator();
			for (int i = 0; i < idCellMap.size(); i++)
			{
				Map.Entry<String, Cell> entry = keyValuePairs1.next();
				String cid = entry.getKey();
				Cell cell =  entry.getValue();

				JSONObject pairsObj = new JSONObject();
				pairsObj.put("cid", cid);
				pairsObj.put("table", "cell");
				pairsObj.put("data", cellToJson(cell));
				newIdsArr.put(pairsObj);
			}
			Iterator<Entry<String, Assoc>> keyValuePairs2 = idAssocMap.entrySet().iterator();
			for (int i = 0; i < idAssocMap.size(); i++)
			{
				Map.Entry<String, Assoc> entry = keyValuePairs2.next();
				String cid = entry.getKey();
				Assoc assoc = entry.getValue();

				JSONObject pairsObj = new JSONObject();
				pairsObj.put("cid", cid);
				pairsObj.put("table", "assoc");
				pairsObj.put("data", assocToJson(assoc));
				newIdsArr.put(pairsObj);
			}
			if(newIdsArr.length()>0) {
				resp.setStatus(201);//only send if we changed an id?
				resp.getWriter().print(newIdsArr.toString(4));
			}
			idCellMap.clear();

			//if(1==1) throw new RuntimeException("Silly wabbit");

			session.getTransaction().commit();
		}
		catch (Exception e) {
			session.getTransaction().rollback();
		}		
	}

	/**
	 * Simply returns if everything is well.
	 * Otherwise throws runtime exception
	 * @param assoc
	 */
	private void isAssocAllowed(Assoc assoc){
		Cell sourceCell =assoc.getSourceFk();
		byte type = assoc.getType();
		Cell destCell = assoc.getDestFk();
		
		if(type < PARENT_ASSOC || type >= SUBCLASSES_PASSOC) throw new RuntimeException("Association type is invalid");

		// the association must be unique
		for(Iterator<Assoc> itr2=sourceCell.getSourceAssocs().iterator();itr2.hasNext();){
			Assoc pAssoc = itr2.next();
			if(assoc == pAssoc) continue;
			Cell dest = pAssoc.getDestFk();
			System.out.println(assoc.getId()+" - "+pAssoc.getId());
			if(type==pAssoc.getType() && destCell.getId()==dest.getId()) throw new RuntimeException("Class associations must be unique");
		}

		if(sourceCell.getType()==CLASS || destCell.getType()==CLASS){
			if(type == NEXT_ASSOC) throw new RuntimeException("NEXT not allowed as Class to Class association");
			return;
		}
		else if(sourceCell.getType()==OBJECT || destCell.getType()==OBJECT){
			if(type==NEXT_ASSOC) return;
//			if(type==NEXT_ASSOC) throw new RuntimeException("Cannot test NEXT_ASSOC");
//			if(type==PARENT_ASSOC || type==NEXT_ASSOC || type==NEXT_ASSOC || type==NEXT_ASSOC || type==NEXT_ASSOC || type==NEXT_ASSOC || type==NEXT_ASSOC || type==NEXT_ASSOC || ){
				
//			}
			LinkedList<Cell> sourceCellParentsList = sourceCell.getListOfSuperClasses();
			LinkedList<Cell> destCellParentsList = destCell.getListOfSuperClasses();
			for(Iterator<Cell> itr1=sourceCellParentsList.iterator();itr1.hasNext();){
				Cell sourceCellParent = itr1.next();
				for(Iterator<Assoc> itr2=sourceCellParent.getSourceAssocs().iterator();itr2.hasNext();){
					Assoc pAssoc = itr2.next();
					Cell dest = pAssoc.getDestFk();
					if(type==pAssoc.getType() && destCellParentsList.contains(dest)) return; //association allowed
				}
			}
			System.out.println("ERROR:\tObject to Object association not allowed");
			System.out.println("source:\t"+sourceCell.getIdName(50));
			System.out.println("assoc type:\t"+type);
			System.out.println("dest:\t"+destCell.getIdName(50));
			System.out.println("dest parents:\t"+listToString(destCellParentsList));
			throw new RuntimeException("Object to Object association not allowed");
		}
		else if(sourceCell.getType()==CLASS || destCell.getType()==OBJECT){
			// the type must be DEFAULT_ASSOC
			if(type != DEFAULT_ASSOC) throw new RuntimeException("Only DEFAULT is allowed as Class to Object association");
			return;
		}
		else if(sourceCell.getType()==OBJECT || destCell.getType()==CLASS){
			// the type must be MAPSTO_ASSOC or parent
			if(type != PARENT_ASSOC && type != DEFAULT_ASSOC) throw new RuntimeException("Only PARENT and DEFAULT are allowed as Object to Class association");
			return;
		}
	}
	/**
	 * Simply returns if everything is well.
	 * Otherwise throws runtime exception
	 * @param valueStr
	 * @param attrRefId
	 * @param session
	 * @throws DocumentException
	 * @throws ParseException
	 */
	private void isValueAllowed(String valueStr, long attrRefId, Session session) throws DocumentException, ParseException{
		if(valueStr==null && attrRefId== 0) return;
		if(valueStr!=null && attrRefId== 0) throw new RuntimeException("Must have an attribute reference to update value");
		Cell attrRefObj = (Cell)session.load(Cell.class, attrRefId);

		//find the assoc type of the attrRef 
		Cell attrRefMTClass = attrRefObj.getCellByAssocType(MAPSTO_ASSOC);
		if(attrRefMTClass==null) throw new RuntimeException("Attribute reference does not have a 'maps to'");

		//updateable?
		Cell attrAccess = attrRefObj.getAttributeObjByDestClass(ATTRIBUTE_ACCESS_ID);
		boolean readonly = attrAccess!=null&&attrAccess.getId()==MODIFY_ID?false:true;
		boolean optional = attrAccess!=null&&attrAccess.getId()==MANDATORY_ID?false:true;
		if(readonly) throw new RuntimeException("Update not allowed:\t"+valueStr);
		if(!optional && valueStr==null||valueStr.length() == 0) throw new RuntimeException("Mandatory value missing");
		
		if(attrRefMTClass.isA(CELL_NAME_ID)){
			int minLength = 0;
			int maxLength = 65535;			
			if(valueStr.length()>maxLength) throw new RuntimeException("Value to long:\t"+valueStr);
			if(valueStr.length()<minLength) throw new RuntimeException("Value to short:\t"+valueStr);
		}
		else if(attrRefMTClass.isA(BOOLEAN_ID)){// boolean, Do this first, boolean is also a permitted value
			Boolean.parseBoolean(valueStr);
		}
		else if(attrRefMTClass.isA(PERMITTED_VALUES_ID)){
			 throw new RuntimeException("Not allowed to update permitted value:\t"+valueStr);
		}
		else if(attrRefMTClass.isA(DATE_ID)) {//date
		    // will throw ParseException or IllegalArgumentException
			DateFormat dateFormat = DateFormat.getDateInstance (DateFormat.SHORT); // YYYY-MM-DD
		    dateFormat.parse(valueStr);
		}
		else if(attrRefMTClass.isA(CURRENCY_ID)){
			// will throw NumberFormatException
			java.math.BigDecimal value = new java.math.BigDecimal(valueStr);
			//if(value.compareTo(maximumNumber)>0) throw new RuntimeException("Value to big:\t"+valueStr);
			//if(value<minimumNumber) throw new RuntimeException("Value to small:\t"+valueStr);
		}
		else if(attrRefMTClass.isA(NUMBER_ID)){// float
			// will throw NumberFormatException
			float minimumNumber = Float.MIN_VALUE;
			float maximumNumber = Float.MAX_VALUE;
			double value = Double.parseDouble(valueStr);
			if(value>maximumNumber) throw new RuntimeException("Value to big:\t"+valueStr);
			if(value<minimumNumber) throw new RuntimeException("Value to small:\t"+valueStr);
		}
		else if(attrRefMTClass.isA(INTEGER_ID)){// integer
			// will throw NumberFormatException
			long value = Long.parseLong(valueStr);
			long minimumInt = Integer.MIN_VALUE;
			long maximumInt = Integer.MAX_VALUE;
			if(value>maximumInt) throw new RuntimeException("Value to big:\t"+valueStr);
			if(value<minimumInt) throw new RuntimeException("Value to small:\t"+valueStr);
		}
		else if(attrRefMTClass.isA(RTF_ID)){// rtf
			// will throw DocumentException
			int minLength = 0;
			int maxLength = 65535;			
			if(valueStr.length()>0)DocumentHelper.parseText("<div>"+valueStr+"</div>");
			if(valueStr.length()>maxLength) throw new RuntimeException("Value to long:\t"+valueStr);
			if(valueStr.length()<minLength) throw new RuntimeException("Value to short:\t"+valueStr);
		}
		else if (attrRefMTClass.isA(STRING_ID)){//string
			int minLength = 0;
			int maxLength = 65535;			
			if(valueStr.length()>maxLength) throw new RuntimeException("Value to long:\t"+valueStr);
			if(valueStr.length()<minLength) throw new RuntimeException("Value to short:\t"+valueStr);
		}
		else throw new RuntimeException("Unknown attribute type");
	}	
	private Assoc makeAssoc(Cell sourceFk, byte type, Cell destFk, Session session){
		Assoc pAssoc = new Assoc();
		pAssoc.setSourceFk(sourceFk);
		pAssoc.setType(type);
		pAssoc.setDestFk(destFk);
		session.save(pAssoc);
		sourceFk.addTosourceAssocs(pAssoc);
		destFk.addTodestAssocs(pAssoc);
		session.save(sourceFk);
		session.save(destFk);
		return pAssoc;
	}
	private void updateAssoc(Assoc pAssoc, Cell sourceFk, byte type, Cell destFk, Session session){
		Cell currentSourceFk = pAssoc.getSourceFk();
		if(currentSourceFk != sourceFk){
			currentSourceFk.getSourceAssocs().remove(pAssoc);
			session.save(currentSourceFk);
			sourceFk.addTosourceAssocs(pAssoc);
			session.save(sourceFk);
		}
		Cell currentDestFk = pAssoc.getDestFk();
		if(currentDestFk != destFk){
			currentDestFk.getDestAssocs().remove(pAssoc);
			session.save(currentDestFk);
			destFk.addTodestAssocs(pAssoc);
			session.save(destFk);
		}
		pAssoc.setSourceFk(sourceFk);
		pAssoc.setType(type);
		pAssoc.setDestFk(destFk);
		session.save(pAssoc);
	}
	private void deleteAssoc(Assoc pAssoc, Session session){
		Cell currentSourceFk = pAssoc.getSourceFk();
		currentSourceFk.getSourceAssocs().remove(pAssoc);
		session.save(currentSourceFk);
		Cell currentDestFk = pAssoc.getDestFk();
		currentDestFk.getDestAssocs().remove(pAssoc);
		session.save(currentDestFk);
		session.delete(pAssoc);
	}
	private void destroySourceAssoc(Cell sourceCell, byte type, Cell destCell, Session session){
		//type and destCell may be 0/null
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
		//type and sourcetCell may be 0/null
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
	/**
	 * deleteCascade
	 * This is used to replace all-delete-orphan option in the hbm.
	 * We need this because we don't allways want to automaticly delete associations.
	 */
	private void deleteCell(Cell delCell, Session session) {
		destroySourceAssoc(delCell, (byte)0, null, session);
		destroyDestAssoc(delCell, (byte)0, null, session);
		session.delete(delCell);
	}
	private Cell getOrMakeCellBasedOnCid(String cid, Session session, Map<String, Cell> idCellMap){
		if(cid.contains("cid")){
			Cell newCell = idCellMap.get(cid);//do we know this cell already, was it created in the same conversation?
			if(newCell==null){//apparently not, perhapse there will be a post lateron. Make the cell here.
				newCell = new Cell();
				newCell.setName(null);
				newCell.setType((byte) 1);
				newCell.setSourceAssocs(new java.util.TreeSet<Assoc>());//assoce sets must not be null, else searcches lateron will fail
				newCell.setDestAssocs(new java.util.TreeSet<Assoc>());//assoce sets must not be null, else searcches lateron will fail
				session.save(newCell);//we must save otherwise we get null pointer exception
				idCellMap.put(cid, newCell);
			}
			return newCell;
		}
		long id = Long.parseLong(cid);
		return (Cell) session.load(Cell.class, id);
	}
	private JSONObject cellToJson(Cell cell){
		JSONObject cellObject = new JSONObject();
		cellObject.put("id", cell.getId());
		cellObject.put("type", cell.getType());
		String cellName = cell.getName();
		cellObject.put("name", cellName!=null?cellName:null);
		return cellObject;
	}
	private JSONObject assocToJson(Assoc assoc){
		JSONObject assocObject = new JSONObject();
		assocObject.put("id", assoc.getId());
		assocObject.put("sourceFk", assoc.getSourceFk().getId());
		assocObject.put("type", assoc.getType());
		assocObject.put("destFk", assoc.getDestFk().getId());
		return assocObject;
	}
	private Cell getUserObj(HttpServletRequest req, Session session){
		//String remoteUser = req.getUserPrincipal().getName();
		String remoteUser = "cjong";
		Cell personsClass = (Cell) session.load(Cell.class, new Long(PERSONS_ID));
		LinkedList<Cell> userList = personsClass.getListOfInstances();
		for(Iterator<Cell> itr0=userList.iterator();itr0.hasNext();){
			Cell user = itr0.next();
			Cell useIdObj = user.getAttributeObjByDestClass(USERID_ID);
			if(useIdObj==null) continue;
			if(useIdObj.getName().equalsIgnoreCase(remoteUser)) return user;
		}
		return null;
	}
	private String listToString(LinkedList<Cell> list){
		String retString = "";
		for(Iterator<Cell> itr1=list.iterator();itr1.hasNext();){
			Cell cell = itr1.next();
			retString += ", "+cell.getIdName(50);
		}
		return retString;
	}
	//experimental
	/*
	private void assocsViewChildren(JSONArray assocArray, Cell selectedObj, Cell viewObj, Session session) throws Exception {
		Cell permittedValuesParent = (Cell) session.load(Cell.class, new Long(ASSOCIATION_TYPES_ID));
		LinkedList<Cell> permittedValuesList = permittedValuesParent.getListOfInstances();				
		for(Iterator<Cell> itr1=permittedValuesList.iterator();itr1.hasNext();){
			Cell permittedValue = (itr1.next());
			long assocType = permittedValue.getId();
			//if(assocType==CHILDREN_PASSOC) continue;//we are doing other than children
			//if(assocType==PARENT_ASSOC) continue;//causes loop in the tree//doesn;t help
			//if(permittedValue.getId()!=ATTRIBUTE_ASSOC) continue;//we are doing other than children
			LinkedList<Cell> thisAssocsList = selectedObj.getListOfRelatedObjectsByAssocTypeAndDestClass(assocType, null);
			if(thisAssocsList.size()>0){
				assocArray.put(viewObj.getId()+"/"+selectedObj.getId()+"."+assocType);
			}
		}
	}
	private JSONObject cellAssociations(Cell selectedObj, Cell viewObj, Session session) throws Exception {
		JSONObject assocObj = new JSONObject();
		Cell permittedValuesParent = (Cell) session.load(Cell.class, new Long(ASSOCIATION_TYPES_ID));
		LinkedList<Cell> permittedValuesList = permittedValuesParent.getListOfInstances();				
		for(Iterator<Cell> itr1=permittedValuesList.iterator();itr1.hasNext();){
			Cell permittedValue = (itr1.next());
			long assocType = permittedValue.getId();
			//if(assocType==CHILDREN_PASSOC) continue;//we are doing other than children
			//if(assocType==PARENT_ASSOC) continue;//causes loop in the tree//doesn;t help
			LinkedList<Cell> thisAssocsList = selectedObj.getListOfRelatedObjectsByAssocTypeAndDestClass(assocType, null);
			if(thisAssocsList.isEmpty()) continue;
			JSONArray destArray = new JSONArray();
			for(Iterator<Cell> itr2=thisAssocsList.iterator();itr2.hasNext();){
				Cell destObj = itr2.next();
				destArray.put(viewObj.getId()+"/"+destObj.getId());
			}
			assocObj.put(String.valueOf(assocType), destArray);
		}
		return assocObj;
	}
	private JSONObject assocsViewAssoc(long viewIdString, String assocIdString, Session session) throws Exception {
		String[] asssocIds = assocIdString.split("\\.");
		long assocType = Long.parseLong(asssocIds[1]);
		long sourceObjId = Long.parseLong(asssocIds[0]);
		Cell assocObj = (Cell) session.load(Cell.class, new Long(assocType));
		Cell sourceObj = (Cell) session.load(Cell.class, new Long(sourceObjId));
		JSONObject rowObj = new JSONObject();
		rowObj.put("id", viewIdString+"/"+assocIdString);
		rowObj.put("1936", (assocType>9?assocType:"0"+assocType)+" "+assocObj.getName());
		//rowObj.put("1936", assocType+" "+assocObj.getName());
		rowObj.put("classId", assocType);
		rowObj.put("view name", "associations");
		rowObj.put("viewId", viewIdString);
		JSONArray childrenArray = new JSONArray();
		LinkedList<Cell> destObjList = sourceObj.getListOfRelatedObjectsByAssocTypeAndDestClass(assocType, null);
		for(Iterator<Cell> itr2=destObjList.iterator();itr2.hasNext();){
			Cell destObj = itr2.next();
			childrenArray.put(ASSOCS_CLASS_VIEW_ID+"/"+destObj.getId());
		}
		rowObj.put(String.valueOf(ASSOCS_CLASS_VIEW_ID), childrenArray);
		return rowObj;
	}*/
/*
	private void addLabel(JSONObject obj, Cell viewObj, Cell childselectedObj, Session session){
		//find the labels
		boolean found = false;
		LinkedList<Cell> attrRefList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ATTRIBUTE_REFS_ID);
		for(Iterator<Cell> itr1=attrRefList.iterator();itr1.hasNext();){
			Cell attrRefObj = (itr1.next());
			Cell pointsToCell = attrRefObj.getCellByAssocType(MAPSTO_ASSOC);
			if(pointsToCell!=null&&pointsToCell.isA(PRIMARY_NAME_ID)) {
				Cell nameCell = childselectedObj.getAttributeObjByDestClass(PRIMARY_NAME_ID);
				String cellName = nameCell==null?"":nameCell.getName(50);
				obj.put(String.valueOf(attrRefObj.getId()),cellName);
				//childrenArray.put(labelObj);
				//labelStr += "if(label=='nf') label = store"+childViewObjId+".getValue(item, '"+attrRefObj.getId()+"', 'nf');\n";
				//found = true;
				//break;
			}
		}
		if(!found){
			for(Iterator<Cell> itr1=attrRefList.iterator();itr1.hasNext();){
				Cell attrRefObj = (itr1.next());
				//Cell pointsToCell = attrRefObj.getCellByRelType(POINTS_TO_CLASS_ID);
				//if(attrRefObj.isA(CELL_NAME_ID));
					//..labelStr += "if(label=='nf') label = store"+childViewObjId+".getValue(item, '"+attrRefObj.getId()+"', 'nf');\n";
					//break;
			
			}
		}
	}
	
	public boolean isInteger( String input )  
	{  
	   try  
	   {  
	      Integer.parseInt( input );  
	      return true;  
	   }  
	   catch( Exception e)  
	   {  
	      return false;  
	   }  
	}



	// ********************************************************************************
	// Get Row Data
	// ********************************************************************************
	private JSONObject getRowData(Cell selectedObj, Cell viewObj, Session session, Cell userObj) throws Exception {
		// This returns an object that contains all the attribute values that belong to the view
		JSONObject rowObject = new JSONObject();
		//rowObject.put("id",selectedObj.getId());
		rowObject.put("viewId",viewObj.getId());
		rowObject.put("id",viewObj.getId()+"/"+selectedObj.getId());
		rowObject.put("viewName",viewObj.getIdName(50));// debugging purposes
		long selectedObjId = selectedObj.getId();
		if(viewObj.getId()==CLASS_VIEW_ID || viewObj.getId()==ASSOCS_CLASS_VIEW_ID) rowObject.put("classId",selectedObj.getType());//make an exception for the class model
		else rowObject.put("classId",1 == selectedObjId?0:selectedObj.getCellByAssocType(PARENT_ASSOC).getId());// this is used by icons and DnD
		//rowObject.put("class","css"+viewObj.getId());//used by tree menu to determin which menu to present
		
		//----------------------------------------------------------------------------------
		// Get the attrRefList that belongs to this view, and walk through it 
		//----------------------------------------------------------------------------------
		LinkedList<Cell> attrRefList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ATTRIBUTE_REFS_ID );
		for(Iterator<Cell> itr0=attrRefList.iterator();itr0.hasNext();){
			Cell attrRefObj = itr0.next();
			String fieldName = Long.toString(attrRefObj.getId());

			//add the value according to assoc type
			Cell assocTypeObj = attrRefObj.getAttributeObjByDestClass(TO_ONE_ASSOC_TYPES_ID);
			if(assocTypeObj==null) continue;
			long assocType = assocTypeObj.getId();
			if(assocType==ATTRIBUTE_ASSOC){
				Cell attrRefMTClass = attrRefObj.getCellByAssocType(MAPSTO_ASSOC);
				if(attrRefMTClass==null) continue;
				if(attrRefMTClass.getId()==CELL_NAME_ID) rowObject.putOpt(fieldName, selectedObj.getName(0));
				else if(attrRefMTClass.getId()==CELL_ASSOCIATION_ID) rowObject.putOpt(fieldName, cellAssociations(selectedObj, viewObj, session));
				else{
					Cell valueCell = selectedObj.getObjectByAssocTypeAndDestClass(assocType, attrRefMTClass);
					/*
					if(attrRefMTClass.isA(TO_ONE_ASSOC_TYPES_ID)){// Do this first, these are also a permitted value
						Cell assocCell = selectedObj.getAttributeObjByDestClass(TO_ONE_ASSOC_TYPES_ID);
						Cell attrRefMTAssocCell = selectedObj.getCellByAssocType(MAPSTO_ASSOC);
						long assocCellId = assocCell==null?0:assocCell.getId();
						long attrRefMTAssoc = attrRefMTAssocCell==null?0:attrRefMTAssocCell.getId();
						rowObject.put(fieldName, viewObj.getId()+"."+assocCellId+"."+attrRefMTAssoc);
					}* /
					if(attrRefMTClass.isA(TO_MANY_ASSOC_TYPES_ID)){// Do this first, these are also a permitted value
						Cell assocCell = selectedObj.getAttributeObjByDestClass(TO_MANY_ASSOC_TYPES_ID);
						Cell attrRefMTAssocCell = selectedObj.getCellByAssocType(MAPSTO_ASSOC);
						long assocCellId = assocCell==null?0:assocCell.getId();
						long attrRefMTAssoc = attrRefMTAssocCell==null?0:attrRefMTAssocCell.getId();
						rowObject.put(fieldName, viewObj.getId()+"."+assocCellId+"."+attrRefMTAssoc);
					}
					else if(attrRefMTClass.isA(BOOLEAN_ID)){// boolean, Do this first, boolean is also a permitted value
						rowObject.put(fieldName,  valueCell==null ? false : Boolean.parseBoolean(valueCell.getName()));
					}
					else if(attrRefMTClass.isA(PERMITTED_VALUES_ID)){
						rowObject.put(fieldName, valueCell==null ? 0 : valueCell.getId());
					}			
					else rowObject.putOpt(fieldName, valueCell==null ? "" : valueCell.getName(0));
				}
			}
			else if(assocTypeObj.isA(TO_ONE_ASSOC_TYPES_ID)){
			//else if(assocType==PARENT_ASSOC || assocType==MAPSTO_ASSOC || assocType==DEFAULT_ASSOC || assocType==ONETOONE_ASSOC || assocType==NEXT_ASSOC || assocType==ORDERED_PARENT_PASSOC || assocType==MANYTOONE_PASSOC){
				Cell assocObj = selectedObj.getObjectByAssocTypeAndDestClass(assocType, 0);
				if(assocObj==null) continue;
				rowObject.put(fieldName, assocObj.getId());
			}
		}
		//----------------------------------------------------------------------------------
		// add an array of children ids to the row object 
		//----------------------------------------------------------------------------------
		LinkedList<Cell> childViewList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID );
		if(viewObj.getId() == 2293) {
			int a = 1;
		}
		addTabsViewLists(viewObj, childViewList);
		for(Iterator<Cell> itr1=childViewList.iterator();itr1.hasNext();){
			Cell childViewObj = itr1.next();
			JSONArray childrenArray = new JSONArray();
			LinkedList<Cell> rowList = null;
			if(childViewObj.getId()==ASSOCS_VIEW_ID){//make an exception for the class view
				assocsViewChildren(childrenArray, selectedObj, childViewObj, session);
				rowObject.put(String.valueOf(childViewObj.getId()), childrenArray);
				continue;
			}
			else if(childViewObj.getId()==CLASS_VIEW_ID){//make an exception for the class view
				rowList = selectedObj.getLsitOfSubClasses();
			}
			else rowList = selectedObj.getListOfRelatedObjectsByView(childViewObj);
			for(Iterator<Cell> itr0=rowList.iterator();itr0.hasNext();){
				Cell childObj = itr0.next();
				childrenArray.put(childViewObj.getId()+"/"+childObj.getId());
			}
			rowObject.put(String.valueOf(childViewObj.getId()), childrenArray);
			/*
			LinkedList<Cell> childTabList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ACCTABS_ID );
			for(Iterator<Cell> itr2=childTabList.iterator();itr2.hasNext();){
				Cell childTabObj = itr2.next();
				LinkedList<Cell> tabChildViewList = childTabObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID );
				for(Iterator<Cell> itr3=tabChildViewList.iterator();itr3.hasNext();){
					Cell tabChildViewObj = itr3.next();
					JSONArray tabChildrenArray = new JSONArray();
					rowList = selectedObj.getListOfRelatedObjectsByView(tabChildViewObj);
					for(Iterator<Cell> itr0=rowList.iterator();itr0.hasNext();){
						Cell childObj = itr0.next();
						tabChildrenArray.put(tabChildViewObj.getId()+"/"+childObj.getId());
					}			
					rowObject.put(String.valueOf(tabChildViewObj.getId()), tabChildrenArray);
				}
			}* /
		}
		
		return rowObject;
	}
	private void addTabsViewLists(Cell viewOrTabObj, LinkedList<Cell> childViewList){
		LinkedList<Cell> childTabList = viewOrTabObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ACCTABS_ID );
		for(Iterator<Cell> itr2=childTabList.iterator();itr2.hasNext();){
			Cell childTabObj = itr2.next();
			// remove in future
			LinkedList<Cell> childViews = childTabObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID );
			childViewList.addAll(childViews);
			//
			addTabsViewLists(childTabObj, childViewList);//there may be sub tabs
			addWidgetViewLists(childTabObj, childViewList);//get the sub wib widgets
		}
	}
	private void addWidgetViewLists(Cell viewOrTabObj, LinkedList<Cell> childViewList){
		LinkedList<Cell> childWidgetList = viewOrTabObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, WIDGET_ID );
		for(Iterator<Cell> itr2=childWidgetList.iterator();itr2.hasNext();){
			Cell childWidgetObj = itr2.next();
			LinkedList<Cell> childViews = childWidgetObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID );
			childViewList.addAll(childViews);
			addTabsViewLists(childWidgetObj, childViewList);//there may be sub tabs
		}
	}
	// ********************************************************************************
	// Update Row (use by PUT and POST)
	// ********************************************************************************
	private void updateRowData(JSONObject dataJsonObj, Session session, Map<String, Cell> idCellMap) throws Exception {
		/*System.out.println("viewObj:\t"+viewObj.getIdName(50));
		System.out.println("selectedObj:\t"+selectedObj.getIdName(50));*/
		/*JSONObject temp = getRowData(selectedObj,  viewObj, 0, session);
		System.out.println("current row data:\t"+temp.toString(4));
		System.out.println("new row data:\t"+dataJsonObj.toString(4));* /
		
		//long objId = Long.parseLong(dataJsonObj.getString("id"));
		//Cell selectedObj = (Cell) session.load(Cell.class, new Long(objId));
		Cell selectedObj = getOrMakeCellBasedOnCid(dataJsonObj.getString("id"), session, idCellMap);
		long viewId = Long.parseLong(dataJsonObj.getString("viewId"));
		Cell viewObj = (Cell) session.load(Cell.class, new Long(viewId));
		
		//----------------------------------------------------------------------------------
		// Gat the attrRefList that belongs to this view, and walk through it 
		//----------------------------------------------------------------------------------
		LinkedList<Cell> attrRefList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ATTRIBUTE_REFS_ID );
		for(Iterator<Cell> itr0=attrRefList.iterator();itr0.hasNext();){
			Cell attrRefObj = itr0.next();
			String fieldName = Long.toString(attrRefObj.getId());
			if(!dataJsonObj.has(fieldName)) continue;

			String newValueStr = dataJsonObj.getString(fieldName);

			//updateable?
			Cell attrAccess = attrRefObj.getAttributeObjByDestClass(ATTRIBUTE_ACCESS_ID);
			if(attrAccess==null||(attrAccess.getId()!=MODIFY_ID&&attrAccess.getId()!=MANDATORY_ID)) continue;

			//find the assoc type of the attrRef 
			Cell attrRefMTClass = attrRefObj.getCellByAssocType(MAPSTO_ASSOC);
			if(attrRefMTClass==null)  throw new RuntimeException("attrRefMTClass is null");
			Cell assocTypeObj = attrRefObj.getAttributeObjByDestClass(TO_ONE_ASSOC_TYPES_ID);
			if(assocTypeObj==null) throw new RuntimeException("assocTypeObj is null");
			long assocType = assocTypeObj.getId();
			Cell currentValueCell = selectedObj.getObjectByAssocTypeAndDestClass(assocType, attrRefMTClass);

			if(assocType==ATTRIBUTE_ASSOC){
				if(attrRefMTClass.getId()==CELL_NAME_ID) {
					String currentValueStr = currentValueCell.getName();
					if(newValueStr.equals(currentValueStr)) continue;
					currentValueCell.setName(newValueStr); //update value								
				}
				else{
					/*
					if(attrRefMTClass.isA(TO_ONE_ASSOC_TYPES_ID)){// Do this first, these are also a permitted value
						Cell assocCell = selectedObj.getAttributeObjByDestClass(TO_ONE_ASSOC_TYPES_ID);
						Cell attrRefMTAssocCell = selectedObj.getCellByAssocType(MAPSTO_ASSOC);
						long assocCellId = assocCell==null?0:assocCell.getId();
						long attrRefMTAssoc = attrRefMTAssocCell==null?0:attrRefMTAssocCell.getId();
						String currentValue = assocCellId+"."+attrRefMTAssoc;
						if(currentValue.equals(newValueStr)) continue; // same, no update
					}* /
					if(attrRefMTClass.isA(TO_MANY_ASSOC_TYPES_ID)){// Do this first, these are also a permitted value
						Cell assocCell = selectedObj.getAttributeObjByDestClass(TO_MANY_ASSOC_TYPES_ID);
						Cell attrRefMTAssocCell = selectedObj.getCellByAssocType(MAPSTO_ASSOC);
						long assocCellId = assocCell==null?0:assocCell.getId();
						long attrRefMTAssoc = attrRefMTAssocCell==null?0:attrRefMTAssocCell.getId();
						String currentValue = assocCellId+"."+attrRefMTAssoc;
						if(currentValue.equals(newValueStr)) continue; // same, no update
					}
					else if(attrRefMTClass.isA(BOOLEAN_ID)){// boolean, Do this first, boolean is also a permitted value
						boolean currentValue = currentValueCell==null ? false : Boolean.parseBoolean(currentValueCell.getName());
						boolean newValue = Boolean.parseBoolean(newValueStr);
						if(currentValue == newValue) continue; // same, no update
						Cell trueObj = null;
						LinkedList<Cell> instList = attrRefMTClass.getListOfInstances();
						for(Iterator<Cell> itr1=instList.iterator();itr1.hasNext();){//find the true
							Cell obj = itr1.next();
							boolean value = Boolean.parseBoolean(obj.getName());
							if(value) trueObj = obj;
						}
						if(newValue){//TRUE
							if(trueObj==null){ // add a new permitted true value, don't bother adding false value since this is the defaule
								Cell newValueCell = makeCell("true", session);
								// add parent assoc
								makeAssoc(newValueCell, PARENT_ASSOC, attrRefMTClass, session);
								// add from to assoc
								makeAssoc(selectedObj, ATTRIBUTE_ASSOC, newValueCell, session);
							}
							else ensureAssoc(selectedObj, null, ATTRIBUTE_ASSOC, trueObj, attrRefMTClass, session);//Will also check permitted value
						}
						else {//FALSE
							if(trueObj!=null) destroyAssoc(selectedObj, ATTRIBUTE_ASSOC, trueObj, session);//destroy the assoc if there is one;
						}
					}
					else if(attrRefMTClass.isA(PERMITTED_VALUES_ID)){
						long newValueId = Long.parseLong(newValueStr);
						if(newValueId==0) continue;//FIXME if mandatory set to defeault
						Cell newValueCell = (Cell) session.load(Cell.class, new Long(newValueId));
						ensureAssoc(selectedObj, null, ATTRIBUTE_ASSOC, newValueCell, attrRefMTClass, session);//Will also check permitted value
					}			
					else { // Normal attribute update
						if(currentValueCell==null && newValueStr.isEmpty()) continue;
						//Check to see if the newValueStr is valid, by asking the schema					
						SchemaForAttrRefObj schemaPart = new SchemaForAttrRefObj(attrRefObj);
						schemaPart.isValidAttributeValue(newValueStr);// This will throw an exception if anything is not right
						if(currentValueCell==null){//make a new one
							Cell newValueCell = makeCell(newValueStr, session);
							// add parent assoc
							makeAssoc(newValueCell, PARENT_ASSOC, attrRefMTClass, session);
							// add from to assoc
							makeAssoc(selectedObj, ATTRIBUTE_ASSOC, newValueCell, session);
						}
						else {//update existing
							String currentValueStr = currentValueCell.getName();
							if(newValueStr.equals(currentValueStr)) continue;
							currentValueCell.setName(newValueStr); //update value								
						}
					}
				}
			}
			else if(assocTypeObj.isA(TO_ONE_ASSOC_TYPES_ID)){
				//else if(assocType==PARENT_ASSOC || assocType==MAPSTO_ASSOC || assocType==DEFAULT_ASSOC || assocType==ONETOONE_ASSOC || assocType==NEXT_ASSOC || assocType==ORDERED_PARENT_PASSOC || assocType==MANYTOONE_PASSOC){
				long newValueId = Long.parseLong(newValueStr);
				Cell newValueCell = (Cell) session.load(Cell.class, new Long(newValueId));
				ensureAssoc(selectedObj, null, assocType, newValueCell, attrRefMTClass, session);//Will also check permitted value
			}
			System.out.println("INFO:\tValue update");
			System.out.println("attribbute reference:\t"+attrRefObj.getIdName(0));
			System.out.println("current value:\t"+(currentValueCell==null?"null":currentValueCell.getIdName(0)));
			System.out.println("new value:\t"+newValueStr);
		
		}
	

		LinkedList<Cell> childViewList = viewObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(MANYTOMANY_ASSOC, VIEWS_ID );
		addTabsViewLists(viewObj, childViewList);
		for(Iterator<Cell> itr1=childViewList.iterator();itr1.hasNext();){
			Cell childViewObj = itr1.next();
			System.out.println(childViewObj.getId());
			
			//get the new children list for tihis view
			LinkedList<Cell> newChildrenList = new LinkedList<Cell>();
			JSONArray childrenArr = dataJsonObj.optJSONArray(String.valueOf(childViewObj.getId()));
			if(childrenArr!=null){
				for(int i = 0; i < childrenArr.length(); i++ ){
					String cid = childrenArr.getString(i);
					String[] ids;
					if(cid.startsWith("cid")) ids = cid.substring(3).split("/");
					else ids = cid.split("/");
					long childrenArrViewId = Long.parseLong(ids[0]);
					//long childrenArrObjectId = Long.parseLong(ids[1]);
					if(childViewObj.getId() == childrenArrViewId){
						newChildrenList.add((Cell) getOrMakeCellBasedOnCid(cid, session, idCellMap));//session.load(Cell.class, new Long(childrenArrObjectId)));
					}
				}
			}
			//get the current children list for this view
			LinkedList<Cell> curChildrenList = selectedObj.getListOfRelatedObjectsByView(childViewObj);

			if(newChildrenList.equals(curChildrenList)) continue;
			System.out.println("INFO:\tList update");
			System.out.println("curChildrenList:\t"+listToString(curChildrenList));
			System.out.println("newChildrenList:\t"+listToString(newChildrenList));

			Cell prevRelType = childViewObj.getAttributeObjByDestClass(TO_MANY_ASSOC_TYPES_ID);
			Cell childViewDestClass = childViewObj.getAttributeObjByDestClass(MAPSTO_ASSOC);
			if(prevRelType==null) continue;
			long relTypeId = prevRelType.getId();
			if(relTypeId==ORDERED_ASSOC) {
				Cell previousObj = null;
				Cell newChildObj = null;
				if(newChildrenList.isEmpty() && !curChildrenList.isEmpty()) destroyAssoc(selectedObj, ORDERED_ASSOC, curChildrenList.getFirst(), session);//destroy the assoc if there is one;
				for(Iterator<Cell> itr2=newChildrenList.iterator();itr2.hasNext();){
					newChildObj = itr2.next();
					if(previousObj==null){//First one
						//we must dissociate the ordered relationship ourselves (enssureAssoc wont do this for us since its a to many relationship)
						if(!curChildrenList.isEmpty() && !newChildObj.equals(curChildrenList.getFirst())){
							destroyAssoc(selectedObj, ORDERED_ASSOC, curChildrenList.getFirst(), session);//destroy the assoc if there is one
						}
						ensureAssoc(selectedObj, null, ORDERED_ASSOC, newChildObj, childViewDestClass, session);//will create the assoc if its not already there
					}
					else{
						ensureAssoc(previousObj, selectedObj, NEXT_ASSOC, newChildObj, null, session);//will create the assoc if its not already there, will reuse the existing if it is
					}
					previousObj = newChildObj;
				}
				if(newChildObj!=null) destroyAssoc(newChildObj, NEXT_ASSOC, null, session);//destroy the assoc if there is one
			}
			else{
				for(Iterator<Cell> itr2=newChildrenList.iterator();itr2.hasNext();){
					Cell newChildObj = itr2.next();
					ensureAssoc(selectedObj, null, relTypeId, newChildObj, childViewDestClass, session);//will create the assoc if its not already there
				}
				for(Iterator<Cell> itr2=curChildrenList.iterator();itr2.hasNext();){
					Cell curChildObj = itr2.next();
					if(!newChildrenList.contains(curChildObj)){
						destroyAssoc(selectedObj, relTypeId, curChildObj, session);//destroy the assoc if there is one
					}
				}
			}
		}	
			
		
	
	}

	private void deleteObj(String idString, Session session) throws ServletException, IOException {

		String[] idStringArr = idString.split("/");
		long objId = Long.parseLong(idStringArr[1]);
		Cell selectedObj = (Cell) session.load(Cell.class, new Long(objId));

		if(selectedObj.getType()==OBJECT){
			byte type = 0;
			Cell sourceCell = null;
			for(Iterator<Assoc> itr1=selectedObj.getDestAssocs().iterator();itr1.hasNext();){
				Assoc assoc = itr1.next();
				byte assocTypeId = assoc.getType();
				if(assocTypeId == NEXT_ASSOC || assocTypeId == ORDERED_ASSOC) {
					type = assocTypeId;
					sourceCell = assoc.getSourceFk();
					break;
				}
			}
			Cell destCell = selectedObj.getCellByAssocType(NEXT_ASSOC);
			if(destCell != null && type!=0 && sourceCell != null) makeAssoc(sourceCell, type, destCell, session);
			
			
			// attributes are deleted automaticly here
			LinkedList<Cell> attrList = selectedObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ATTRIBUTE_ASSOC, ATTRIBUTES_ID);
			for(Iterator<Cell> itr2=attrList.iterator();itr2.hasNext();){
				Cell attrCell = itr2.next();
				if(!attrCell.isA(PERMITTED_VALUES_ID)) deleteCell(attrCell, session);			
			}
			if(selectedObj.isA(VIEWS_ID)){
				LinkedList<Cell> attrRefList = selectedObj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, ATTRIBUTE_REFS_ID);
				for(Iterator<Cell> itr2=attrRefList.iterator();itr2.hasNext();){
					Cell attrCell = itr2.next();
					deleteCell(attrCell, session);			
				}
				
			}
		}
		deleteCell(selectedObj, session);
	}

	private void ensureAssoc(Cell sourceObj, Cell orderedSourceObj, long assocType, Cell destObj, Cell destClass , Session session){
		// Make sure the two cells are associated by the assoc assocType
		// The destClass is needed to get the current associated objects
		// If it's a 'to many' assocType
		// 		we get the current list and check if the association is already present
		//		if not:
		//  	we translate the assoc type to it's inverse type, as needed
		//  	then we check to make sure the the (inverse) assocType is allowed according to the class model
		//  	then we simply add the assoc
		// If it's a 'to one' assocType
		//  	we do the same as above except that if the association is aready present, we reuse it (diassassociating the previous object)
		// if assocType NEXT_ASSOC then orderedSourceObj must not be null. We need orderedSourceObj for isAssocAllowed. Otherwise it should be null
		if(assocType==NEXT_ASSOC && orderedSourceObj==null) throw new RuntimeException("if assocType NEXT_ASSOC then orderedSourceObj must not be null. We need orderedSourceObj for isAssocAllowed. Otherwise it should be null");
		Cell assocObj = (Cell) session.load(Cell.class, new Long(assocType));
		if(assocObj.isA(TO_MANY_ASSOC_TYPES_ID)){ // treat ORDERED_ASSOC as a 'to one' assocType
			LinkedList<Cell> ObjList = sourceObj.getListOfRelatedObjectsByAssocTypeAndDestClass(assocType, destClass);
			if(ObjList.contains(destObj)) return;
			else if(assocType>=PARENT_ASSOC && assocType<=OWNS_ASSOC){
				// Check to make sure the association is allowed
				isAssocAllowed(sourceObj, (byte)assocType, destObj);
				makeAssoc(sourceObj, (byte)assocType, destObj, session);// no existing assoc to this dest, make a new one
			}
			else if(assocType>=SUBCLASSES_PASSOC && assocType<=OWNED_BY_PASSOC){
				byte primitiveAssocType = (byte)(assocType - 12);// Big NoNo: here we do math with identifires
				// Check to make sure the association is allowed
				isAssocAllowed(destObj, primitiveAssocType, sourceObj);
				makeAssoc(destObj, primitiveAssocType, sourceObj, session);// no existing assoc to this dest, make a new one
			}
		}
		else{ //TO_ONE_ASSOC_TYPES_ID
			Cell currentDestObj = sourceObj.getObjectByAssocTypeAndDestClass(assocType, destClass);
			if(currentDestObj==null) { // simply add a new one
				if(assocType>=PARENT_ASSOC && assocType<=OWNS_ASSOC){
					// Check to make sure the association is allowed
					//NEXT_ASSOC must be trenslated to ORDERED, using orderedSourceObj instead of sourceObj
					if(assocType==NEXT_ASSOC) isAssocAllowed(orderedSourceObj, (byte)ORDERED_ASSOC, destObj);
					else isAssocAllowed(sourceObj, (byte)assocType, destObj);
					makeAssoc(sourceObj, (byte)assocType, destObj, session);// no existing assoc to this dest, make a new one
				}
				else if(assocType==ORDERED_PARENT_PASSOC) throw new RuntimeException("Cannot update ordered parent");
				else if(assocType>=SUBCLASSES_PASSOC && assocType<=OWNED_BY_PASSOC){
					byte primitiveAssocType = (byte)(assocType - 12);// Big NoNo: here we do math with identifires
					// Check to make sure the association is allowed
					isAssocAllowed(destObj, primitiveAssocType, sourceObj);
					makeAssoc(destObj, primitiveAssocType, sourceObj, session);// no existing assoc to this dest, make a new one
				}
			}
			else if(currentDestObj.equals(destObj)) return; // already associated
			else {//need to replace the existing assoc dest
				if(assocType>=PARENT_ASSOC && assocType<=OWNS_ASSOC){
					// Check to make sure the association is allowed
					//NEXT_ASSOC must be trenslated to ORDERED, using orderedSourceObj instead of sourceObj
					if(assocType==NEXT_ASSOC) isAssocAllowed(orderedSourceObj, (byte)ORDERED_ASSOC, destObj);
					else isAssocAllowed(sourceObj, (byte)assocType, destObj);
					for(Iterator<Assoc> itr=sourceObj.getSourceAssocs().iterator();itr.hasNext();){
						Assoc assoc = itr.next();
						Cell thisDest = assoc.getDestFk();
						if(assoc.getType()==assocType && thisDest.equals(currentDestObj)){
							//update the assoc
							currentDestObj.getDestAssocs().remove(assoc);
							destObj.addTodestAssocs(assoc);
							assoc.setDestFk(destObj);
							session.save(currentDestObj);
							session.save(destObj);
							session.save(assoc);
							break;
						}
					}
				}
				else if(assocType==ORDERED_PARENT_PASSOC) throw new RuntimeException("Cannot update ordered parent");
				else if(assocType>=SUBCLASSES_PASSOC && assocType<=OWNED_BY_PASSOC){
					byte primitiveAssocType = (byte)(assocType - 12);// Big NoNo: hier we do math with identifires
					// Check to make sure the association is allowed
					isAssocAllowed(destObj, primitiveAssocType, sourceObj);
					for(Iterator<Assoc> itr=destObj.getDestAssocs().iterator();itr.hasNext();){
						Assoc assoc = itr.next();
						Cell thisSource = assoc.getSourceFk();
						if(assoc.getType()==primitiveAssocType && thisSource.equals(currentDestObj)){
							//update the assoc
							currentDestObj.getSourceAssocs().remove(assoc);
							sourceObj.addTosourceAssocs(assoc);
							assoc.setSourceFk(sourceObj);
							session.save(currentDestObj);
							session.save(sourceObj);
							session.save(assoc);
							break;
						}
					}
				}
			}
		}
	}
	*/
}
