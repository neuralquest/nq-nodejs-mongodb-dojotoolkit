package com.neuralquest.server;

import java.util.Iterator;
import java.util.LinkedList;

import com.neuralquest.server.base.BaseCell;



/**
 * @copyright Chris de Jong 2005
 * @name Cell.java
 *
 */
public class Cell extends BaseCell implements Constants {
	private static final long serialVersionUID = 1L;
	
	/*[CONSTRUCTOR MARKER BEGIN]*/
	public Cell () {
		super();
	}

	/**
	 * Constructor for primary key
	 */
	public Cell (long id) {
		super(id);
	}

	/**
	 * Constructor for required fields
	 */
	public Cell (
		long id,
		byte type) {

		super (
			id,
			type);
	}

	/*[CONSTRUCTOR MARKER END]*/
	/**
	 * getName
	 * @param maxLength 
	 */
	public String getName(int maxLength) {
		String cellName = "[null]";
		if(getType()==CLASS || isA(ATTRIBUTES_ID)) cellName = getName(); 
		else {
			Cell primaryNameCell = getAttributeObjByDestClass(PRIMARY_NAME_ID); // primary name
			cellName = primaryNameCell==null?"[no primary name]":primaryNameCell.getName();
		}
		if(maxLength>0 && cellName.length() > 0 && cellName.length() > maxLength) {
			if(cellName.lastIndexOf(' ', maxLength) > 0) cellName = cellName.substring(0,cellName.lastIndexOf(' ', maxLength)) + "...";
			else cellName = cellName.substring(0, maxLength) + "...";
		}
		return cellName;
	}
	public String getIdName(int maxLength) {
		return getId()+" - "+getName(maxLength);
	}
	public boolean isA(long id) {
		LinkedList<Cell> loopProtection = new LinkedList<Cell>();
		return isA(id, loopProtection);
	}
	private boolean isA(long id, LinkedList<Cell> loopProtection) {
		if(loopProtection.contains(this)) {
			System.out.println("ERROR:\tCircular reference in parent list");
			System.out.println("source:\t"+this.getIdName(50));
			System.out.println("list:\t"+listToString(loopProtection));
			throw new RuntimeException("Circular reference in parent list");
		}
		loopProtection.add(this);
		if(this.getId() == id) return true;
		for(Iterator<Assoc> itr1=getSourceAssocs().iterator();itr1.hasNext();){
			Assoc a = ((Assoc)itr1.next());
			if(a.getType() == PARENT_ASSOC){
				return (a.getDestFk().isA(id, loopProtection));
			}
		}
		return false;		
	}
	public boolean isA(Cell id) {
		LinkedList<Cell> loopProtection = new LinkedList<Cell>();
		return isA(id, loopProtection);
	}
	private boolean isA(Cell type, LinkedList<Cell> loopProtection) {
		if(loopProtection.contains(this)) {
			System.out.println("ERROR:\tCircular reference in parent list");
			System.out.println("source:\t"+this.getIdName(50));
			System.out.println("list:\t"+listToString(loopProtection));
			throw new RuntimeException("Circular reference in parent list");
		}
		loopProtection.add(this);
		if(this.equals(type)) return true;
		for(Iterator<Assoc> itr1=getSourceAssocs().iterator();itr1.hasNext();){
			Assoc a = ((Assoc)itr1.next());
			if(a.getType() == PARENT_ASSOC){
				return (a.getDestFk().isA(type, loopProtection));
			}
		}
		return false;		
	}
	public LinkedList<Cell> getListOfSuperClasses() {
		LinkedList<Cell> pList = new LinkedList<Cell>();
		getListOfSupperClasses(pList);
		return pList;
	}
	private void getListOfSupperClasses(LinkedList<Cell> pList) {
		//will also include the first one if it is a class
		//System.out.println(getIdName(0));
		if(pList.contains(this)) {
			System.out.println("ERROR:\tCircular reference in parent list");
			System.out.println("source:\t"+this.getIdName(50));
			System.out.println("list:\t"+listToString(pList));
			throw new RuntimeException("Circular reference in parent list");
		}
		if(getType()==CLASS) pList.add(this);//Do not add if this is a Object
		for(Iterator<Assoc> itr1=getSourceAssocs().iterator();itr1.hasNext();){
			Assoc assoc = itr1.next();
			if(assoc.getType() != PARENT_ASSOC) continue;// if not, go to the next
			Cell pCell = assoc.getDestFk();
			pCell.getListOfSupperClasses(pList);
		}
	}

	public LinkedList<Cell> getListOfInstances(){
		LinkedList<Cell> list = new LinkedList<Cell>();
		getListOfInstances(list);
		return list;
	}
	private void getListOfInstances(LinkedList<Cell> list){
		if(getType()==OBJECT) {
			if(list.contains(this)) {
				System.out.println("ERROR:\tMultiple reference in instance list");
				//System.out.println("source:\t"+this.getIdName(50));
				System.out.println("source:\t"+this.getId()+" - "+this.getName());
				System.out.println("list:\t"+listToString(list));
				throw new RuntimeException("Multiple reference in instance list");
			}
			list.add(this);
			return; 
		}
		for(Iterator<Assoc> itr1=getDestAssocs().iterator();itr1.hasNext();){
			Assoc assoc = itr1.next();
			if(assoc.getType() != PARENT_ASSOC) continue;// if not, go to the next
			Cell subclass = assoc.getSourceFk();
			subclass.getListOfInstances(list);
		}
	}
	public LinkedList<Cell> getLsitOfAllSubClasses(){
		LinkedList<Cell> list = new LinkedList<Cell>();
		getLsitOfAllSubClasses(list);
		return list;
	}
	private void getLsitOfAllSubClasses(LinkedList<Cell> list){
		if(getType()==OBJECT) return; 
		if(list.contains(this)) {
			System.out.println("ERROR:\tCircular reference in child list");
			System.out.println("source:\t"+this.getIdName(50));
			System.out.println("list:\t"+listToString(list));
			throw new RuntimeException("Circular reference in child list");
		}
		list.add(this);
		for(Iterator<Assoc> itr1=getDestAssocs().iterator();itr1.hasNext();){
			Assoc assoc = itr1.next();
			if(assoc.getType() != PARENT_ASSOC) continue;// if not, go to the next
			Cell subclass = assoc.getSourceFk();
			subclass.getLsitOfAllSubClasses(list);
		}
	}
	public LinkedList<Cell> getLsitOfSubClasses(){
		LinkedList<Cell> list = new LinkedList<Cell>();
		for(Iterator<Assoc> itr1=getDestAssocs().iterator();itr1.hasNext();){
			Assoc assoc = itr1.next();
			if(assoc.getType() != PARENT_ASSOC) continue;// if not, go to the next
			Cell subclass = assoc.getSourceFk();
			if(subclass.getType()==OBJECT) continue;
			list.add(assoc.getSourceFk());
		}
		return list;
	}
	//TODO we should try to get rid of this. replace it with getObjectByAssocTypeAndDestClass
	public Cell getCellByAssocType(long relTypeId){
		//System.out.println(getIdName(50));
		for(Iterator<Assoc> itr1=getSourceAssocs().iterator();itr1.hasNext();){
			Assoc a1 = (Assoc)itr1.next();
			//System.out.println("\t"+a1.getDestFk().getIdName(50));
			if(a1.getType() == relTypeId){
				return a1.getDestFk();
			}
		}
		return null;
	}
	public LinkedList<Cell> getListOfRelatedObjectsByView(Cell viewObj){
		Cell destClass = viewObj.getCellByAssocType(MAPSTO_ASSOC);;
		Cell prevRelType = viewObj.getAttributeObjByDestClass(ASSOCIATION_TYPES_ID);
		if(prevRelType==null) return new LinkedList<Cell>();		
		return getListOfRelatedObjectsByAssocTypeAndDestClassId(prevRelType.getId(), destClass==null?0:destClass.getId());
	}
	public LinkedList<Cell> getListOfRelatedObjectsByAssocTypeAndDestClassId(long assocType, long destClassId){
		// This the primary retieval algorithime. TODO All gets should gravitate towards this.
		if(assocType==ORDERED_ASSOC){
			LinkedList<Cell> list = new LinkedList<Cell>();
			LinkedList<Cell> orderedList = lookForward(assocType, destClassId);//should return only one
			if(getType()==OBJECT){
				for(Iterator<Cell> itr1=orderedList.iterator();itr1.hasNext();){
					Cell ordered = (itr1.next());
					list.add(ordered);
					ordered.addNextToListByDestClass(list, destClassId);
				}
			}
			return list;
		}
		else if(assocType>=PARENT_ASSOC && assocType<=OWNS_ASSOC){
			return lookForward(assocType, destClassId);
		}
		else if(assocType==ORDERED_PARENT_PASSOC){
			LinkedList<Cell> list = new LinkedList<Cell>();
			Cell orderedParent = findFirstReverse(destClassId); 
			if(orderedParent!=null) list.add(orderedParent);
			return list;
		}
		else if(assocType>=CHILDREN_PASSOC && assocType<=OWNED_BY_PASSOC){
			byte primitiveAssocType = (byte)(assocType - 12);// Big NoNo: here we do math with identifires
			return lookBackward(primitiveAssocType, destClassId);
		}
		return new LinkedList<Cell>();
	}

	public LinkedList<Cell> getListOfRelatedObjectsByAssocTypeAndDestClass(long assocType, Cell destClass){
		return getListOfRelatedObjectsByAssocTypeAndDestClassId(assocType, destClass==null?0:destClass.getId());
	}
	private LinkedList<Cell> lookBackward(long assocType, long destClassId){
		LinkedList<Cell> list = new LinkedList<Cell>();
		for(Iterator<Assoc> itr=getDestAssocs().iterator();itr.hasNext();){
			Assoc assoc1 = (Assoc)itr.next();
			if(assoc1.getType()==assocType && (destClassId == 0 || assoc1.getSourceFk().isA(destClassId))) {
				list.add((Cell)assoc1.getSourceFk());
			}
		}
		return list;
	}
	private LinkedList<Cell> lookForward(long assocType, long destClassId){
		LinkedList<Cell> list = new LinkedList<Cell>();
		for(Iterator<Assoc> itr=getSourceAssocs().iterator();itr.hasNext();){
			Assoc assoc1 = (Assoc)itr.next();
			if(assoc1.getType()==assocType && (destClassId == 0 || assoc1.getDestFk().isA(destClassId))) {
				list.add((Cell)assoc1.getDestFk());
			}
		}
		return list;
	}
	public Cell getAttributeObjByDestClass(long destClassId){
		return getObjectByAssocTypeAndDestClass(ATTRIBUTE_ASSOC, destClassId);
	}
	public Cell getObjectByAssocTypeAndDestClass(long assocType, Cell destClass){
		return getObjectByAssocTypeAndDestClass(assocType, destClass==null?0:destClass.getId());
	}
	public Cell getObjectByAssocTypeAndDestClass(long assocType, long destClassId){
		LinkedList<Cell> list = getListOfRelatedObjectsByAssocTypeAndDestClassId(assocType, destClassId);
		if(destClassId!=0 && list.size()>1) {
			System.out.println("ERROR:\tA 'to one' association has more than one destination");
			//System.out.println("source:\t"+this.getIdName(50));
			System.out.println("source:\t"+this.getId()+" - "+this.getName());
			System.out.println("assocType:\t"+assocType);
			System.out.println("list:\t"+listToString(list));
			throw new RuntimeException("A 'to one' association has more than one destination");
		}
		if(list.isEmpty()) return null;
		return list.getFirst();
	}
	private void addNextToListByDestClass(LinkedList<Cell> list, long destClassId){
		Cell nextObj = getObjectByAssocTypeAndDestClass(NEXT_ASSOC, destClassId);
		if(nextObj==null) return; 
		if(list.contains(nextObj)){
			System.out.println("ERROR:\tCircular reference in next list");
			System.out.println("source:\t"+this.getIdName(50));
			System.out.println("list:\t"+listToString(list));
			throw new RuntimeException("Circular reference in next list");
		} 
		list.add(nextObj);
		nextObj.addNextToListByDestClass(list, destClassId);
	}

	public Cell xxxfindFirstReverse(Cell destClass){
		// see if this one has a parent
		for(Iterator<Assoc> itr=getDestAssocs().iterator();itr.hasNext();){
			Assoc a = ((Assoc)itr.next());
			if(a.getType() == ORDERED_ASSOC && (destClass==null || a.getDestFk().isA(destClass))){//found it
				return a.getSourceFk();
			}
		}
		for(Iterator<Assoc> itr=getDestAssocs().iterator();itr.hasNext();){
			Assoc a = ((Assoc)itr.next());
			if(a.getType() == NEXT_ASSOC){
				Cell prev = a.getSourceFk();
				return prev.xxxfindFirstReverse(destClass);//assume only one TODO posibly not right
			}
		}
		//could not find it
		return null;
	}
	public Cell findFirstReverse(long destClassId){
		// see if this one has a parent
		for(Iterator<Assoc> itr=getDestAssocs().iterator();itr.hasNext();){
			Assoc a = ((Assoc)itr.next());
			if(a.getType() == ORDERED_ASSOC && (destClassId==0 || a.getDestFk().isA(destClassId))){//found it
				return a.getSourceFk();
			}
		}
		for(Iterator<Assoc> itr=getDestAssocs().iterator();itr.hasNext();){
			Assoc a = ((Assoc)itr.next());
			if(a.getType() == NEXT_ASSOC){
				Cell prev = a.getSourceFk();
				return prev.findFirstReverse(destClassId);//assume only one TODO posibly not right
			}
		}
		//could not find it
		return null;
	}

	public Cell getClassAttributeOfType(long soughtType){
		for(Iterator<Assoc> itr3=getSourceAssocs().iterator();itr3.hasNext();){
			Assoc a = ((Assoc)itr3.next());
			if(a.getType() == 439){//Class Attribute
				if(a.getDestFk().isA(soughtType)) return a.getDestFk();
			}
		}
		return null;
	}

	private String listToString(LinkedList<Cell> list){
		String retString = "";
		for(Iterator<Cell> itr1=list.iterator();itr1.hasNext();){
			Cell cell = itr1.next();
			retString += "; "+cell.getIdName(50);
		}
		return retString;
	}


}