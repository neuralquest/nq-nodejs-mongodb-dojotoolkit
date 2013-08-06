package com.neuralquest.server.dao;

import javax.naming.InitialContext;
import javax.naming.NamingException;

import org.hibernate.Session;
import org.hibernate.SessionFactory;


public abstract class _RootDAO extends com.neuralquest.server.base._BaseRootDAO {

	public _RootDAO () {}
	
	public _RootDAO (Session session) {
		setSession(session);
	}

/*
	If you are using lazy loading, uncomment this
	Somewhere, you should call RootDAO.closeCurrentThreadSessions();
	public void closeSession (Session session) {
		// do nothing here because the session will be closed later
	}
*/

/*
	If you are pulling the SessionFactory from a JNDI tree, uncomment this
	http://www.mchange.com/projects/c3p0/index.html#hibernate-specific*/
	public SessionFactory getSessionFactory(String configFile) {
		// If you have a single session factory, ignore the configFile parameter
		// Otherwise, you can set a meta attribute under the class node called "config-file" which
		// will be passed in here so you can tell what session factory an individual mapping file
		// belongs to
		try {
			return (SessionFactory) new InitialContext().lookup("java:comp/env/jdbc/pooledDS");
		} catch (NamingException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return sessionFactory;
	}

}