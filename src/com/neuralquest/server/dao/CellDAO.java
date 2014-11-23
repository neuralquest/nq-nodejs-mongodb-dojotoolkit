package com.neuralquest.server.dao;

import org.hibernate.Session;

import com.neuralquest.server.base.BaseCellDAO;


public class CellDAO extends BaseCellDAO implements com.neuralquest.server.dao.iface.CellDAO {

	public CellDAO () {}
	
	public CellDAO (Session session) {
		super(session);
	}


}