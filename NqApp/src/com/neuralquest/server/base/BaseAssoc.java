package com.neuralquest.server.base;

import java.io.Serializable;


/**
 * This is an object that contains data related to the assoc table.
 * Do not modify this class because it will be overwritten if the configuration file
 * related to this class is modified.
 *
 * @hibernate.class
 *  table="assoc"
 */

public abstract class BaseAssoc  implements Serializable {

	public static String REF = "Assoc";
	public static String PROP_TYPE = "type";
	public static String PROP_SOURCE_FK = "sourceFk";
	public static String PROP_DEST_FK = "destFk";
	public static String PROP_ID = "id";


	// constructors
	public BaseAssoc () {
		initialize();
	}

	/**
	 * Constructor for primary key
	 */
	public BaseAssoc (long id) {
		this.setId(id);
		initialize();
	}

	/**
	 * Constructor for required fields
	 */
	public BaseAssoc (
		long id,
		com.neuralquest.server.Cell destFk,
		com.neuralquest.server.Cell sourceFk,
		byte type) {

		this.setId(id);
		this.setDestFk(destFk);
		this.setSourceFk(sourceFk);
		this.setType(type);
		initialize();
	}

	protected void initialize () {}



	private int hashCode = Integer.MIN_VALUE;

	// primary key
	private long id;

	// fields
	private byte type;

	// many to one
	private com.neuralquest.server.Cell destFk;
	private com.neuralquest.server.Cell sourceFk;



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
	 * Return the value associated with the column: fk_dest
	 */
	public com.neuralquest.server.Cell getDestFk () {
		return destFk;
	}

	/**
	 * Set the value related to the column: fk_dest
	 * @param destFk the fk_dest value
	 */
	public void setDestFk (com.neuralquest.server.Cell destFk) {
		this.destFk = destFk;
	}



	/**
	 * Return the value associated with the column: fk_source
	 */
	public com.neuralquest.server.Cell getSourceFk () {
		return sourceFk;
	}

	/**
	 * Set the value related to the column: fk_source
	 * @param sourceFk the fk_source value
	 */
	public void setSourceFk (com.neuralquest.server.Cell sourceFk) {
		this.sourceFk = sourceFk;
	}




	public boolean equals (Object obj) {
		if (null == obj) return false;
		if (!(obj instanceof com.neuralquest.server.Assoc)) return false;
		else {
			com.neuralquest.server.Assoc assoc = (com.neuralquest.server.Assoc) obj;
			return (this.getId() == assoc.getId());
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