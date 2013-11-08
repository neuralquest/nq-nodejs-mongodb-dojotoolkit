package com.neuralquest.server;
// Static variables needed by Neuralquest
public interface Constants {
	static final byte CLASS = 0;
	static final byte OBJECT = 1;

	static final long ASSOCIATION_TYPES_ID = 94;
	static final long TO_ONE_ASSOC_TYPES_ID = 81;// used by select
	static final long TO_MANY_ASSOC_TYPES_ID = 87;// used by views
	// Primitive Assoc types (used by the Assoc table)
	static final byte PARENT_ASSOC = 3;			//TO ONE
	static final byte ATTRIBUTE_ASSOC = 4;		//TO ONE
	static final byte MAPSTO_ASSOC = 5;			//TO ONE
	static final byte DEFAULT_ASSOC = 6;		//TO ONE
	static final byte ONETOONE_ASSOC = 7;		//TO ONE
	static final byte ORDERED_ASSOC = 8;		//TO MANY
	static final byte NEXT_ASSOC = 9;			//TO ONE Only used internaly
	static final byte MANYTOMANY_ASSOC = 10;	//TO MANY
	static final byte ONETOMANY_ASSOC = 11;		//TO MANY
	static final byte OWNS_ASSOC = 12;			//TO MANY
	// Pseudo Assoc tppes (reverse of the real assocs)
	static final long CHILDREN_PASSOC = 15;		//TO MANY
	static final long ATTRIBUTE_OF_PASSOC = 16;	//TO MANY
	static final long MAPPED_TO_BY_PASSOC = 17;	//TO MANY
	static final long DEFAULT_OF_PASSOC = 18;	//TO MANY
	static final long ONETOONE_REVERSE_PASSOC = 19;	//TO ONE
	static final long ORDERED_PARENT_PASSOC = 20;//TO ONE
	//static final long PREVIOUS_PASSOC = 21;	//TO ONE Not implemented
	static final long MANYTOMANY_REVERSE_PASSOC = 22;	//TO MANY
	static final long MANYTOONE_PASSOC = 23;	//TO ONE
	static final long OWNED_BY_PASSOC = 24;		//TO ONE
	//Special
	//static final long INHERITED_RELATIONSHIPS_PASSOC = 27;	//TO MANY
	static final long THE_USER_PASSOC = 28;					//TO MANY
	//static final long PERMITTED_ONE_ASSOC_DEST_PASSOC = 29;	//TO ONE
	//static final long PERMITTED_MANY_ASSOC_DEST_PASSOC = 30;//TO ONE
	static final long OTHER_ASSOCS_PASSOC = 31; 			//TO MANY
	//static final long BY_ORG_UNIT_PASSOC = 32; 			//TO MANY

	static final long DISPLAY_TYPE_ID = 92; 
	static final long ACCORDION_TABS_ID = 91; 
	static final long DISP_TYPE_TREES_ID = 1779; 

	// attribute access
	static final long ATTRIBUTE_ACCESS_ID = 59;
	static final long MODIFY_ID = 289;
	static final long MANDATORY_ID = 290;
	
	//attribute classes
	static final long ATTRIBUTES_ID = 53;
	static final long PERMITTED_VALUES_ID = 58;
	static final long BOOLEAN_ID = 57;
	static final long DATE_ID = 52;
	static final long STRING_ID = 54;
	static final long INTEGER_ID = 55;
	static final long NUMBER_ID = 56;
	static final long RTF_ID = 65;
	static final long CELL_NAME_ID = 2057;
	static final long CELL_ASSOCIATION_ID = 2058;
	
	//attribute properties
	static final long DEFAULTBOOL_ID = 83;
	static final long MINDATE_ID = 1393;
	static final long DEFAULTDATE_ID = 1394;
	static final long MAXDATE_ID = 1395;
	static final long CURRENCY_ID = 64;
	static final long MAXNUMBER_ID = 1372;
	static final long MINNUMBER_ID = 1375;
	static final long DEFAULTNUMBER_ID = 1377;
	static final long MAXDECIMAL_ID = 1385;
	static final long MININTEGER_ID = 1388;
	static final long MAXINTEGER_ID = 1389;
	static final long MAXLENGTH_ID = 1390;
	static final long MINLENGTH_ID = 1391;
	static final long DEFAULTINTEGER_ID = 1392;
	static final long FIELDWIDTH_ID = 82;
	
	
	//page parts
	static final long ATTRIBUTE_REFS_ID = 63;
	static final long ACCTABS_ID = 90;
	static final long VIEWS_ID = 74;
	
	//used by site map
	static final long FIRSTPAGE_ID = 810;
	static final long CONTENTS_ID = 78;
	static final long PAGES_ID = 79;
	static final long DOCUMENT_VIEW_ID = 842;
	static final long DOCUMENT_TAB_ID = 1784;
	static final long CONTENTS_VIEW_ID = 846;
	static final long CONTENTS_TAB_ID = 1866;

	
	static final long DESCRIPTION_ID = 77;// rtf attributes
	static final long DEFAULTRTF_ID = 1399;// rtf attributes
	static final long PROCESS_CLASSES_ID = 67;// root
	static final long PRIMARY_NAME_ID = 69;// strings
	
	// used by consistany check
	static final long ORFANS_ID = 93;
	
	// used by data servlet for class model
	static final long CLASS_VIEW_ID = 844;
	static final long ASSOCS_VIEW_ID = 1934;
	static final long ASSOCS_CLASS_VIEW_ID = 733;

	//used to get authorized views/object
	static final long ORG_UNIT_ID = 70;
	static final long PERSONS_ID = 51;
	static final long STATES_ID = 66;
	static final long ALL_VIEW_ID = 1714;
	static final long USERID_ID = 68;
	
	//used by schema sevlet for exceptional attr ref
	static final long MAPSTOATTR_ATTRREF_ID = 571;
	static final long MAPSTOVIEW_ATTRREF_ID = 556;

	// exception for classsmodel
	static final long CELL_NAME_ATTRREF_ID = 852;
	
	
	//static final int SVGGRIDWIDTH=161;//Phi http://en.wikipedia.org/wiki/Golden_ratio
	static final int SVGGRIDWIDTH=210;
	static final int SVGGRIDHEIGHT=100;
}
