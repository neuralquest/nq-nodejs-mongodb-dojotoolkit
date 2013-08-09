package com.neuralquest.server;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.RenderedImage;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.util.Iterator;
import java.util.List;

import javax.imageio.ImageIO;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.hibernate.Session;

import com.neuralquest.server.util.HibernateUtil;

public class SpriteServlet extends HttpServlet implements Constants {
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		Session session = HibernateUtil.getSessionFactory().getCurrentSession();
		try {
			session.beginTransaction();
			if(req.getServletPath().endsWith(".png")){
				resp.setContentType("image/png");
				int width = 200, height = 1600;
				// TYPE_INT_ARGB specifies the image format: 8-bit RGBA packed
				// into integer pixels
				BufferedImage bufferedImage = new BufferedImage(width, height,
						BufferedImage.TYPE_INT_ARGB);

				Graphics2D g2d = bufferedImage.createGraphics();
				// g2d.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_IN,
				// 0.0f));

				//g2d.setColor(Color.white);
				// g2d.fillRect(0, 0, width, height);
				g2d.setColor(Color.BLUE);
				g2d.drawLine(16, 0, 16, height);

				Font font = new Font("SansSerif", Font.PLAIN, 12);
				g2d.setFont(font);
				/*
				 * FontMetrics fontMetrics = g2d.getFontMetrics(font); int
				 * stringWidth = fontMetrics.stringWidth(message); int
				 * stringHeight = fontMetrics.getAscent();
				 */

				for (int id = 1; id <= 100; id++) {
					g2d.setColor(Color.BLUE);
					g2d.drawLine(0, id * 16, width, id * 16);
					List<Cell> results = session.createQuery("from Cell c where c.id='" + (id - 1) + "'").list();
					if (results.isEmpty())
						continue;
					Cell cell = (Cell) results.get(0);
					String message = cell.getId() + " - " + cell.getName();
					g2d.setColor(Color.BLACK);
					g2d.drawString(message, 20, id * 16 - 2);
				}

				g2d.dispose();
				RenderedImage rendImage = bufferedImage;
				OutputStream out = resp.getOutputStream();
				ImageIO.write(rendImage, "png", out);
			}
			else{
				resp.setContentType("text/css");
				PrintWriter out = resp.getWriter();

				out.println("/* Gennerated by means of nqserver/nqSprites.css */");
				out.println("/* You can also gennerate a sprite template using nqserver/nqSprites.png */");
				out.println(".icondefault { background: transparent url('../img/nqSprites.png') no-repeat 0px -1264px; width: 16px; height: 16px;} /*  79 - page  */");
				out.println(".icon0 {background: transparent url('../img/nqSprites.png') no-repeat 0px 0px; width: 16px; height: 16px;} /*  0 - class  */");
				out.println(".icon1 {background: transparent url('../img/nqSprites.png') no-repeat 0px -16px; width: 16px; height: 16px;} /*  1 - object  */");
				for(int id=3;id<=100;id++){
					List<Cell> results = session.createQuery("from Cell c where c.id='"+(id-1)+"'").list();
					if(results.isEmpty()) continue;
					Cell cell = (Cell)results.get(0);
					int yPos = (int)cell.getId();
					yPos = yPos*16;
				    String message = ".icon"+cell.getId()+" {background: transparent url('../img/nqSprites.png') no-repeat 0px -"+yPos+"px; width: 16px; height: 16px;} /*  "+cell.getIdName(50)+"  */";
				    out.println(message);
				}				
			}
			
			session.getTransaction().commit();
		}
		catch (Exception e) {
			session.getTransaction().rollback();
			throw new ServletException(e); // or display error message
		}
	}
}

