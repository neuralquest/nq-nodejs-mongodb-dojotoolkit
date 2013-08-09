package com.neuralquest.server;

import java.io.IOException;
import java.util.Iterator;
import java.util.LinkedList;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.dom4j.Document;
import org.dom4j.DocumentFactory;
import org.dom4j.Element;
import org.hibernate.classic.Session;

import com.neuralquest.server.util.HibernateUtil;

public class SitemapServlet extends HttpServlet implements Constants {
	public SitemapServlet() {super();}
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {		
		resp.setContentType("text/xml");//("text/html");
		Session session = HibernateUtil.getSessionFactory().getCurrentSession();
		try {
			session.beginTransaction();

			Document doc = DocumentFactory.getInstance().createDocument();
			Element urlsetElement = doc.addElement("urlset");
			urlsetElement.addAttribute("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9");
			Cell essObj = (Cell) session.load(Cell.class, new Long(ESSAYS_ID));
			isAUsefulUrl(essObj, urlsetElement, session);
			resp.getWriter().print(doc.asXML());

			session.getTransaction().commit();
		}
		catch (Exception e) {
			session.getTransaction().rollback();
			throw new ServletException(e); // or display error message
		}
	}
	private void isAUsefulUrl(Cell obj, Element urlsetElement, Session session) throws Exception{
		LinkedList list = obj.getListOfRelatedObjectsByAssocTypeAndDestClassId(ORDERED_ASSOC, CONTENTS_ID);
		for(Iterator itr1=list.iterator();itr1.hasNext();){
			Cell contentsObj = (Cell)itr1.next();
			if(contentsObj.isA(PAGES_ID)){
				Element urlEl = urlsetElement.addElement("url");
				urlEl.addComment(contentsObj.getName(100));
				urlEl.addElement("loc").addText("http://neuralquest.com/#"+PAGE_MODEL_ID+"."+ESSAYS_ID+"."+contentsObj.getId());
				urlEl.addElement("changefreq").addText("weekly");
				urlEl.addElement("priority").addText("0.8");
			}
			else isAUsefulUrl(contentsObj, urlsetElement, session);
		}
		
	}
}