var obj ={
    "_id": "56f87ec55dde184ccfb9fc74",
    "docType": "class",
    "title": "Pages",
    "description": "Describes the Tab-Widget-View Reference structure",
    "type": "object",
    "properties": {
        "_id": {
            "title": "_id",
            "readOnly": true,
            "type": "string",
            "pattern": "[a-f0-9]+$"
        },
        "name": {
            "title": "Name",
            "type": "string",
            "readOnly": false,
            "maxLength": 100000,
            "default": "[unnamed]"
        },
        "docType": {
            "title": "Doument Type",
            "type": "string",
            "readOnly": true,
            "enum": [
                "object"
            ]
        },
        "divider": {
            "title": "Divider",
            "type": "string",
            "enum": [
                "None",
                "Vertical",
                "Horizontal"
            ],
            "default": "None"
        },
        "accordionOrTab": {
            "title": "Accordian or Tab",
            "type": "string",
            "enum": [
                "Accordions",
                "Tabs"
            ],
            "default": "Tabs"
        },
        "description": {
            "title": "Description",
            "type": "string",
            "readOnly": false,
            "maxLength": 100000,
            "media": {
                "mediaType": "text/html"
            },
            "default": "<p>no text</p>"
        },
        "tabs": {
            "title": "Tabs",
            "description": "",
            "type": "array",
            "items": {
                "type": "object",
                "oneOf": [
                    {
                        "title": "Widgets",
                        "properties": {
                            "widgets": {
                                "title": "Widgets",
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "title": "Name",
                                            "type": "string",
                                            "maxLength": 1000,
                                            "default": "[unnamed]"
                                        },
                                        "description": {
                                            "title": "Description",
                                            "type": "string",
                                            "maxLength": 10000,
                                            "media": {
                                                "mediaType": "text/html"
                                            },
                                            "default": "<p>[no text]</p>"
                                        },
                                        "displayType": {
                                            "title": "Display Types",
                                            "type": "string",
                                            "enum": [
                                                "Sub Tabs",
                                                "Tree",
                                                "Table",
                                                "3D Class Model",
                                                "Form",
                                                "TreeGrid"
                                            ],
                                            "default": "Form"
                                        },
                                        "viewRefs": {
                                            "title": "View References",
                                            "type": "array",
                                            "items": {
                                                "type": "string",
                                                "maxLength": 1000,
                                                "pattern": "[a-f0-9]+$"
                                            },
                                            "minItems": 0,
                                            "uniqueItems": true
                                        }
                                    },
                                    "additionalProperties": false
                                }
                            }
                        },
                        "additionalProperties": false
                    },
                    {
                        "title": "Subtabs",
                        "properties": {
                            "tabs": {
                                "title": "Tabs",
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "maxLength": 1000,
                                    "pattern": "[a-f0-9]+$"
                                },
                                "minItems": 0,
                                "uniqueItems": true
                            }
                        },
                        "additionalProperties": false
                    }
                ]
            }
        }
    },
    "additionalProperties": false,
    "children": [
        "56f89f625dde184ccfb9fc76",
        "56f8a22e5dde184ccfb9fc78"
    ]
}