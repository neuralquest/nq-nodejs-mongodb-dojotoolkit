package com.neuralquest.server;

import java.util.Comparator;

import com.neuralquest.server.base.BaseAssoc;

/**
 * This is the object class that relates to the assoc table.
 * Any customizations belong here.
 */
public class Assoc extends BaseAssoc implements Comparable, Constants  {

/*[CONSTRUCTOR MARKER BEGIN]*/
	public Assoc () {
		super();
	}

	/**
	 * Constructor for primary key
	 */
	public Assoc (long id) {
		super(id);
	}

	/**
	 * Constructor for required fields
	 */
	public Assoc (
		long id,
		com.neuralquest.server.Cell destFk,
		com.neuralquest.server.Cell sourceFk,
		byte type) {

		super (
			id,
			destFk,
			sourceFk,
			type);
	}

/*[CONSTRUCTOR MARKER END]*/
	public int compareTo(Object arg0) {
		Assoc sm = (Assoc) arg0;
		return (int)(getId() - sm.getId());
	}
	public String getName(){
		if(getType() == PARENT_ASSOC) return "parent";
		if(getType() == ORDERED_ASSOC) return "ordered";
		if(getType() == NEXT_ASSOC) return "next";
		if(getType() == ATTRIBUTE_ASSOC) return "attribute";
		if(getType() == MANYTOMANY_ASSOC) return "one to many";
		if(getType() == ONETOMANY_ASSOC) return "many to many";
		if(getType() == MAPSTO_ASSOC) return "maps to";
		if(getType() == DEFAULT_ASSOC) return "default";
		if(getType() == ONETOONE_ASSOC) return "one to one";
	
		return String.valueOf(getType());	
	}

}