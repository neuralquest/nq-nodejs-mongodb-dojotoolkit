package com.neuralquest.server.dao;

import org.hibernate.Session;

import com.neuralquest.server.base.BaseAssocDAO;


public class AssocDAO extends BaseAssocDAO implements com.neuralquest.server.dao.iface.AssocDAO {

	public AssocDAO () {}
	
	public AssocDAO (Session session) {
		super(session);
	}


}