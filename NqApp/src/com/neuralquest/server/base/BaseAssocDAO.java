package com.neuralquest.server.base;

import org.hibernate.Hibernate;
import org.hibernate.Session;
import com.neuralquest.server.dao.iface.AssocDAO;
import org.hibernate.criterion.Order;

/**
 * This is an automatically generated DAO class which should not be edited.
 */
public abstract class BaseAssocDAO extends com.neuralquest.server.dao._RootDAO {

	public BaseAssocDAO () {}
	
	public BaseAssocDAO (Session session) {
		super(session);
	}

	// query name references


	public static AssocDAO instance;

	/**
	 * Return a singleton of the DAO
	 */
	public static AssocDAO getInstance () {
		if (null == instance) instance = new com.neuralquest.server.dao.AssocDAO();
		return instance;
	}

	public Class getReferenceClass () {
		return com.neuralquest.server.Assoc.class;
	}

    public Order getDefaultOrder () {
		return null;
    }

	/**
	 * Cast the object as a com.neuralquest.server.Assoc
	 */
	public com.neuralquest.server.Assoc cast (Object object) {
		return (com.neuralquest.server.Assoc) object;
	}

	public com.neuralquest.server.Assoc get(long key)
	{
		return (com.neuralquest.server.Assoc) get(getReferenceClass(), new java.lang.Long(key));
	}

	public com.neuralquest.server.Assoc get(long key, Session s)
	{
		return (com.neuralquest.server.Assoc) get(getReferenceClass(), new java.lang.Long(key), s);
	}

	public com.neuralquest.server.Assoc load(long key)
	{
		return (com.neuralquest.server.Assoc) load(getReferenceClass(), new java.lang.Long(key));
	}

	public com.neuralquest.server.Assoc load(long key, Session s)
	{
		return (com.neuralquest.server.Assoc) load(getReferenceClass(), new java.lang.Long(key), s);
	}

	public com.neuralquest.server.Assoc loadInitialize(long key, Session s) 
	{ 
		com.neuralquest.server.Assoc obj = load(key, s); 
		if (!Hibernate.isInitialized(obj)) {
			Hibernate.initialize(obj);
		} 
		return obj; 
	}

/* Generic methods */

	/**
	 * Return all objects related to the implementation of this DAO with no filter.
	 */
	public java.util.List findAll () {
		return super.findAll();
	}

	/**
	 * Return all objects related to the implementation of this DAO with no filter.
	 */
	public java.util.List findAll (Order defaultOrder) {
		return super.findAll(defaultOrder);
	}

	/**
	 * Return all objects related to the implementation of this DAO with no filter.
	 * Use the session given.
	 * @param s the Session
	 */
	public java.util.List findAll (Session s, Order defaultOrder) {
		return super.findAll(s, defaultOrder);
	}

	/**
	 * Persist the given transient instance, first assigning a generated identifier. (Or using the current value
	 * of the identifier property if the assigned generator is used.) 
	 * @param assoc a transient instance of a persistent class 
	 * @return the class identifier
	 */
	public java.lang.Long save(com.neuralquest.server.Assoc assoc)
	{
		return (java.lang.Long) super.save(assoc);
	}

	/**
	 * Persist the given transient instance, first assigning a generated identifier. (Or using the current value
	 * of the identifier property if the assigned generator is used.) 
	 * Use the Session given.
	 * @param assoc a transient instance of a persistent class
	 * @param s the Session
	 * @return the class identifier
	 */
	public java.lang.Long save(com.neuralquest.server.Assoc assoc, Session s)
	{
		return (java.lang.Long) save((Object) assoc, s);
	}

	/**
	 * Either save() or update() the given instance, depending upon the value of its identifier property. By default
	 * the instance is always saved. This behaviour may be adjusted by specifying an unsaved-value attribute of the
	 * identifier property mapping. 
	 * @param assoc a transient instance containing new or updated state 
	 */
	public void saveOrUpdate(com.neuralquest.server.Assoc assoc)
	{
		saveOrUpdate((Object) assoc);
	}

	/**
	 * Either save() or update() the given instance, depending upon the value of its identifier property. By default the
	 * instance is always saved. This behaviour may be adjusted by specifying an unsaved-value attribute of the identifier
	 * property mapping. 
	 * Use the Session given.
	 * @param assoc a transient instance containing new or updated state.
	 * @param s the Session.
	 */
	public void saveOrUpdate(com.neuralquest.server.Assoc assoc, Session s)
	{
		saveOrUpdate((Object) assoc, s);
	}

	/**
	 * Update the persistent state associated with the given identifier. An exception is thrown if there is a persistent
	 * instance with the same identifier in the current session.
	 * @param assoc a transient instance containing updated state
	 */
	public void update(com.neuralquest.server.Assoc assoc) 
	{
		update((Object) assoc);
	}

	/**
	 * Update the persistent state associated with the given identifier. An exception is thrown if there is a persistent
	 * instance with the same identifier in the current session.
	 * Use the Session given.
	 * @param assoc a transient instance containing updated state
	 * @param the Session
	 */
	public void update(com.neuralquest.server.Assoc assoc, Session s)
	{
		update((Object) assoc, s);
	}

	/**
	 * Remove a persistent instance from the datastore. The argument may be an instance associated with the receiving
	 * Session or a transient instance with an identifier associated with existing persistent state. 
	 * @param id the instance ID to be removed
	 */
	public void delete(long id)
	{
		delete((Object) load(id));
	}

	/**
	 * Remove a persistent instance from the datastore. The argument may be an instance associated with the receiving
	 * Session or a transient instance with an identifier associated with existing persistent state. 
	 * Use the Session given.
	 * @param id the instance ID to be removed
	 * @param s the Session
	 */
	public void delete(long id, Session s)
	{
		delete((Object) load(id, s), s);
	}

	/**
	 * Remove a persistent instance from the datastore. The argument may be an instance associated with the receiving
	 * Session or a transient instance with an identifier associated with existing persistent state. 
	 * @param assoc the instance to be removed
	 */
	public void delete(com.neuralquest.server.Assoc assoc)
	{
		delete((Object) assoc);
	}

	/**
	 * Remove a persistent instance from the datastore. The argument may be an instance associated with the receiving
	 * Session or a transient instance with an identifier associated with existing persistent state. 
	 * Use the Session given.
	 * @param assoc the instance to be removed
	 * @param s the Session
	 */
	public void delete(com.neuralquest.server.Assoc assoc, Session s)
	{
		delete((Object) assoc, s);
	}
	
	/**
	 * Re-read the state of the given instance from the underlying database. It is inadvisable to use this to implement
	 * long-running sessions that span many business tasks. This method is, however, useful in certain special circumstances.
	 * For example 
	 * <ul> 
	 * <li>where a database trigger alters the object state upon insert or update</li>
	 * <li>after executing direct SQL (eg. a mass update) in the same session</li>
	 * <li>after inserting a Blob or Clob</li>
	 * </ul>
	 */
	public void refresh (com.neuralquest.server.Assoc assoc, Session s)
	{
		refresh((Object) assoc, s);
	}


}