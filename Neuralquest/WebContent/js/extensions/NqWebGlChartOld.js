define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array"],
	function(declare, when, all, arrayUtil){

	var camera, controls, scene, renderer;
	var bodyViewId, xAxisViewId, yAxisViewId;    

	var NqWebGlChart = declare(null, {
		constructor: function(/* DOMNode */node, /* __ChartCtorArgs? */kwArgs){
			// initialize parameters
			if(!kwArgs){ kwArgs = {}; }
			bodyViewId      = kwArgs.bodyViewId;
			xAxisViewId   = kwArgs.xAxisViewId;
			yAxisViewId    = kwArgs.yAxisViewId;
			var skyboxArray = kwArgs.skyboxArray;

			var positionInfo = dojo.position(node.parentNode, true);
			var clientWidth = positionInfo.w;
			var clientHeight = positionInfo.h;

			// create a surface
			camera = new THREE.PerspectiveCamera( 60, clientWidth / clientHeight, 1, 100000 );
			camera.position.z = 2000;

			controls = new THREE.TrackballControls( camera );
			controls.rotateSpeed = 1.0;
			controls.zoomSpeed = 1.5;
			controls.panSpeed = 0.8;
			controls.noZoom = false;
			controls.noPan = false;
			controls.staticMoving = true;
			controls.dynamicDampingFactor = 0.3;
			controls.keys = [ 65, 83, 68 ];
			controls.addEventListener( 'change', render );

			// world
			scene = new THREE.Scene();

			// lights
			light = new THREE.DirectionalLight( 0xffffff );
			light.position.set( 1, 1, 1 ).normalize();
			scene.add( light );

			light = new THREE.AmbientLight( 0x404040 );
			scene.add( light );
			
			// axes
			scene.add( new THREE.AxisHelper(100) );
			
			// skybox
			if(skyboxArray.length == 6){
				// for canvas see http://stackoverflow.com/questions/16310880/comparing-methods-of-creating-skybox-material-in-three-js
				var textureCube = THREE.ImageUtils.loadTextureCube(skyboxArray, {}, function() { render();});
				textureCube.format = THREE.RGBFormat;
				var shader = THREE.ShaderLib[ "cube" ];
				shader.uniforms["tCube"].value = textureCube;					 
				var material = new THREE.ShaderMaterial({
					fragmentShader: shader.fragmentShader,
					vertexShader: shader.vertexShader,
					uniforms: shader.uniforms,
					depthWrite: false,
					side: THREE.BackSide
				});					 
				var mesh = new THREE.Mesh( new THREE.CubeGeometry(100000, 100000, 100000, 1, 1, 1, null, true), material );
				scene.add(mesh);	
			}
			
			// renderer
			if ( Detector.webgl ) renderer = new THREE.WebGLRenderer( {antialias: false} );
			else renderer = new THREE.CanvasRenderer(); 
			renderer.setSize( clientWidth, clientHeight );

			//tabPane['threejs'] = {scene: scene, controls: controls, camera: camera, renderer: renderer,selectedObjectIdPreviousLevel: 0};
			node.appendChild( renderer.domElement );
			animate();
		},
		destroy: function(){
			// summary:
			//		Cleanup when a chart is to be destroyed.
			// returns: void
		},
		getCoords: function(){
			// summary:
			//		Get the coordinates and dimensions of the containing DOMNode, as
			//		returned by dojo.coords.
			// returns: Object
			//		The resulting coordinates of the chart.  See dojo.coords for details.
			var node = this.node;
			var s = domStyle.getComputedStyle(node), coords = domGeom.getMarginBox(node, s);
			var abs = domGeom.position(node, true);
			coords.x = abs.x;
			coords.y = abs.y;
			return coords;	//	Object
		},
		resize: function(width, height){
			// summary:
			//		Resize the chart to the dimensions of width and height.
			// description:
			//		Resize the chart and its surface to the width and height dimensions.
			//		If a single argument of the form {w: value1, h: value2} is provided take that argument as the dimensions to use.
			//		Finally if no argument is provided, resize the surface to the marginBox of the chart.
			// width: Number|Object?
			//		The new width of the chart or the box definition.
			// height: Number?
			//		The new height of the chart.
			// returns: dojox/charting/Chart
			//		A reference to the current chart for functional chaining.
			return this;
		},
		fillSceneClassModel: function(selectedObjectIdPreviousLevel){
			clearScene();
			// make the scene
			var loader = new THREE.JSONLoader(true);
			loader.load("img/mesh/classMesh.js", function(geometry, materials) {
				var classMaterial = new THREE.MeshLambertMaterial( {color: 0x8904B1});
				var connectorMaterial =  new THREE.MeshPhongMaterial({ambient: 0x030303,specular: 0xffffff,shininess: 50,color: 0xffffff});
				var cellPositionsObj = {};
				//var greatestXUntilNow = {value: 0};

				when(positionCellsInHierarchy(selectedObjectIdPreviousLevel, new THREE.Vector3( 0, 0, 0 ), cellPositionsObj, {value: 0}), function(classItem){
					//console.dir(cellPositionsObj);
					var sceneObject3D = new THREE.Object3D();
					for(var key in cellPositionsObj){
						var positionInfo = cellPositionsObj[key];

						var classObject = new THREE.Object3D();
						classObject.position = positionInfo.vector;
						if(positionInfo.rotate == true) classObject.rotation.y = + 90 * ( Math.PI / 180 );
						
						//The mesh
				    	mesh = new THREE.Mesh(geometry, classMaterial);
				        mesh.scale.set(100,100,100);
				        classObject.add(mesh);
				        
				        //The Name
						var text3d = new THREE.TextGeometry(positionInfo.name, {size: 30, height: 5, font: 'helvetiker'});
						//var text3d = new THREE.TextGeometry( 'Organizations', {size: 70, height: 20, curveSegments: 4, font: 'helvetiker', weight: 'normal', style: 'normal',  });
						var textMaterial = new THREE.MeshLambertMaterial({color: 0xD8D8D8});
						text3d.computeBoundingBox();
						var xOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
						var yOffset = -0.5 * ( text3d.boundingBox.max.y - text3d.boundingBox.min.y );
						var textMesh = new THREE.Mesh(text3d, textMaterial);
						textMesh.position.x = xOffset;
						textMesh.position.y = yOffset;
						textMesh.position.z = 55;
						textMesh.rotation.x = 0;
						textMesh.rotation.y = Math.PI * 2;
						classObject.add(textMesh);
						
						sceneObject3D.add(classObject);
					}
					//now add connectors
					for(var key in cellPositionsObj){
						var positionInfo = cellPositionsObj[key];
						//z axis for the attributes
						if(positionInfo.lastAttrId < 0) {					
							var connectorLength = positionInfo.lastAttrId;
							var connectorGeometry = new THREE.CylinderGeometry( 10, 10, connectorLength, 15, 15, true );
							var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
							var ourVec = new THREE.Vector3( positionInfo.vector.x, positionInfo.vector.y, positionInfo.vector.z + (connectorLength/2) );
							connectorMesh.position = ourVec;
							connectorMesh.rotation.x = + 90 * ( Math.PI / 180 );
							sceneObject3D.add(connectorMesh);
						}
						//for the subclasses
						if(positionInfo.subClassIds){
							//get the length of the connector
							var firstId = positionInfo.subClassIds[0];
							var firstX = cellPositionsObj[firstId].vector.x;
							var lastId = positionInfo.subClassIds[positionInfo.subClassIds.length -1];
							var lastX = cellPositionsObj[lastId].vector.x;
							var connectorLength = lastX - firstX;

							//horizontal connector
							var connectorGeometry = new THREE.CylinderGeometry( 10, 10, connectorLength, 15, 15, true );
							var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
							var ourVec = new THREE.Vector3( positionInfo.vector.x, positionInfo.vector.y - 200, positionInfo.vector.z);
							connectorMesh.position = ourVec;
							connectorMesh.rotation.z = + 90 * ( Math.PI / 180 );
							sceneObject3D.add(connectorMesh);

							//sphere at the left end
							var connectorGeometry = new THREE.SphereGeometry( 10 );
							var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
							var ourVec = new THREE.Vector3(firstX, positionInfo.vector.y - 200, positionInfo.vector.z);
							connectorMesh.position = ourVec;
							sceneObject3D.add(connectorMesh);
							
							//sphere at the right end
							var connectorGeometry = new THREE.SphereGeometry( 10 );
							var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
							var ourVec = new THREE.Vector3(lastX, positionInfo.vector.y - 200, positionInfo.vector.z);
							connectorMesh.position = ourVec;
							sceneObject3D.add(connectorMesh);
							
							//vertical connector to super class
							var connectorGeometry = new THREE.CylinderGeometry( 10, 10, 200, 15, 15, true );
							var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
							var ourVec = new THREE.Vector3( positionInfo.vector.x, positionInfo.vector.y - 100, positionInfo.vector.z);
							connectorMesh.position = ourVec;
							sceneObject3D.add(connectorMesh);
							
							//vertical connectors to sub class
							arrayUtil.forEach(positionInfo.subClassIds, function(chlidClassItemId){
								var positionInfo = cellPositionsObj[chlidClassItemId];
								var connectorGeometry = new THREE.CylinderGeometry( 10, 10, 200, 15, 15, true );
								var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
								var ourVec = new THREE.Vector3( positionInfo.vector.x, positionInfo.vector.y + 100, positionInfo.vector.z);
								connectorMesh.position = ourVec;
								sceneObject3D.add(connectorMesh);
								
							});
						}
					}
					var positionInfo = cellPositionsObj[selectedObjectIdPreviousLevel];							
					var ourVec = new THREE.Vector3( -positionInfo.vector.x, 0, 0 );
					sceneObject3D.position = ourVec;
					scene.add(sceneObject3D);

					render();

				});
			});
		}


	});

	function positionCellsInHierarchy(classItemId, ourPos, cellPositionsObj, greatestXUntilNow){	
		if(classItemId in cellPositionsObj) return;
		return when(_nqDataStore.get(classItemId), function(classItem){
			//store the cells position in cell position object 
			cellPositionsObj[classItemId] = {name: classItem[2081], vector: ourPos, rotate: false}; 
			var promisses = [];
			var x = ourPos.x;
			var y = ourPos.y - 400;
			var z = ourPos.z;
			arrayUtil.forEach(classItem[bodyViewId], function(subClassItemId){
				var newPos = new THREE.Vector3( x, y, z );
				promisses.push(positionCellsInHierarchy(subClassItemId, newPos, cellPositionsObj, greatestXUntilNow));
				x = x + 800;
			});
			return all(promisses);
		});
	}

	function xpositionCellsHierarchy(classItemId, ourPos, cellPositionsObj, greatestXUntilNow){	
		var classItem = _nqDataStore.get(classItemId);
		//If this pos is used, store it als greatest X until now
		if(ourPos.x > greatestXUntilNow.value) greatestXUntilNow.value = ourPos.x;
		//store the cells position in cell position object 
		cellPositionsObj[classItem.id] = {name: classItem[852], vector: ourPos, rotate: false}; 
		arrayUtil.forEach(classItem[1934], function(assocItemId){
			var assocItem = _nqDataStore.get(assocItemId);
			var newX = ourPos.x;
			if(assocItem.classId == 15){//CHILDREN_PASSOC
				var x = ourPos.x;
				var y = ourPos.y - 400;
				var z = ourPos.z;
				var subClassIds = [];
				arrayUtil.forEach(assocItem[844], function(chlidClassItemId){
					var childClassItem = _nqDataStore.get(chlidClassItemId);
					if(childClassItem.classId == 0){// class as opposed to object
						pos = new THREE.Vector3( x, y, z );
						positionCellsHierarchy(chlidClassItemId, pos, cellPositionsObj, greatestXUntilNow);

						subClassIds.push(chlidClassItemId);
						
						if(greatestXUntilNow.value > x) x = greatestXUntilNow.value;// a lower level may have bumped our x
						x = x + 800;
					}
				});
				if(subClassIds.length  > 0){
					cellPositionsObj[classItemId].subClassIds = subClassIds;
					//place our cell at the centre of the the underlaying cells
					var firstId = subClassIds[0];
					var firstX = cellPositionsObj[firstId].vector.x;
					var lastId = subClassIds[subClassIds.length -1];
					var lastX = cellPositionsObj[lastId].vector.x;
					newX = firstX + (lastX - firstX)/2;
					cellPositionsObj[classItemId].vector.x = newX;				
				}
			}
			if(assocItem.classId == 4){//ATTRIBUTE_ASSOC
				var x = newX;
				var y = ourPos.y;
				var z = ourPos.z - 800;
				arrayUtil.forEach(assocItem.children, function(chlidClassItemId){
					var childClassItem = _nqDataStore.get(chlidClassItemId);
					if(childClassItem.classId == 0){// class as opposed to object
						pos = new THREE.Vector3( x, y, z );
						cellPositionsObj[chlidClassItemId] = {name: childClassItem[852], vector: pos, rotate: true};

						//determine the last child for use lateron.
						cellPositionsObj[classItemId].lastAttrId = z;
						
						z = z - 800;
					}
				});
			}
		});
	}
	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
		controls.handleResize();
		render();
	}
	function animate() {
		requestAnimationFrame( animate );
		controls.update();
	}
	function render() {
		renderer.render( scene, camera );
	}
	function clearScene(){
		// clear the scene
		var obj, i;
		for ( i = scene.children.length - 1; i >= 5 ; i -- ) {
		    obj = scene.children[ i ];
		    //if ( obj !== plane && obj !== tabPane.threejs.camera) {
		    	scene.remove(obj);
		    //}
		}
		render();
	}

	
	return NqWebGlChart;
});
