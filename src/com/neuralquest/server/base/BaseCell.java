package com.neuralquest.server.base;

import java.io.Serializable;

import com.neuralquest.server.Assoc;


/**
 * This is an object that contains data related to the cell table.
 * Do not modify this class because it will be overwritten if the configuration file
 * related to this class is modified.
 *
 * @hibernate.class
 *  table="cell"
 */

public abstract class BaseCell  implements Serializable {

	public static String REF = "Cell";
	public static String PROP_TYPE = "type";
	public static String PROP_NAME = "name";
	public static String PROP_ID = "id";


	// constructors
	public BaseCell () {
		initialize();
	}

	/**
	 * Constructor for primary key
	 */
	public BaseCell (long id) {
		this.setId(id);
		initialize();
	}

	/**
	 * Constructor for required fields
	 */
	public BaseCell (
		long id,
		byte type) {

		this.setId(id);
		this.setType(type);
		initialize();
	}

	protected void initialize () {}



	private int hashCode = Integer.MIN_VALUE;

	// primary key
	private long id;

	// fields
	private java.lang.String name;
	private byte type;

	// collections
	private java.util.Set<Assoc> sourceAssocs;
	private java.util.Set<Assoc> destAssocs;



	/**
	 * Return the unique identifier of this class
     * @hibernate.id
     *  generator-class="native"
     *  column="id"
     */
	public long getId () {
		return id;
	}

	/**
	 * Set the unique identifier of this class
	 * @param id the new ID
	 */
	public void setId (long id) {
		this.id = id;
		this.hashCode = Integer.MIN_VALUE;
	}




	/**
	 * Return the value associated with the column: name
	 */
	public java.lang.String getName () {
		return name;
	}

	/**
	 * Set the value related to the column: name
	 * @param name the name value
	 */
	public void setName (java.lang.String name) {
		this.name = name;
	}



	/**
	 * Return the value associated with the column: type
	 */
	public byte getType () {
		return type;
	}

	/**
	 * Set the value related to the column: type
	 * @param type the type value
	 */
	public void setType (byte type) {
		this.type = type;
	}



	/**
	 * Return the value associated with the column: sourceAssocs
	 */
	public java.util.Set<Assoc> getSourceAssocs () {
		return sourceAssocs;
	}

	/**
	 * Set the value related to the column: sourceAssocs
	 * @param sourceAssocs the sourceAssocs value
	 */
	public void setSourceAssocs (java.util.Set<Assoc> sourceAssocs) {
		this.sourceAssocs = sourceAssocs;
	}

	public void addTosourceAssocs (com.neuralquest.server.Assoc assoc) {
		if (null == getSourceAssocs()) setSourceAssocs(new java.util.TreeSet<Assoc>());
		getSourceAssocs().add(assoc);
	}



	/**
	 * Return the value associated with the column: destAssocs
	 */
	public java.util.Set<Assoc> getDestAssocs () {
		return destAssocs;
	}

	/**
	 * Set the value related to the column: destAssocs
	 * @param destAssocs the destAssocs value
	 */
	public void setDestAssocs (java.util.Set<Assoc> destAssocs) {
		this.destAssocs = destAssocs;
	}

	public void addTodestAssocs (com.neuralquest.server.Assoc assoc) {
		if (null == getDestAssocs()) setDestAssocs(new java.util.TreeSet<Assoc>());
		getDestAssocs().add(assoc);
	}




	public boolean equals (Object obj) {
		if (null == obj) return false;
		if (!(obj instanceof com.neuralquest.server.Cell)) return false;
		else {
			com.neuralquest.server.Cell cell = (com.neuralquest.server.Cell) obj;
			return (this.getId() == cell.getId());
		}
	}

	public int hashCode () {
		if (Integer.MIN_VALUE == this.hashCode) {
			return (int) this.getId();
		}
		return this.hashCode;
	}


	public String toString () {
		return super.toString();
	}


}