define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "dijit/_WidgetBase", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry"],
	function(declare, when, all, arrayUtil, _WidgetBase, domConstruct, lang, domGeom){

	var camera, scene, renderer, controls, requestID, projector, stats;
	var selectableObjects = [];

	var nqWebGlChartWidget = declare("NqWebGlChartWidget", [_WidgetBase], {
		state: {},
		cellPositionsObj: {},
		bodyViewYId: null,
		bodyViewZId: null,
		headerViewYId: null,
		headerViewXId: null,
		skyboxArray: [],	

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
		},
		postCreate: function(){
			this.inherited(arguments);
			//camera
			camera = new THREE.PerspectiveCamera( 60, 3 / 2, 1, 100000 );
			camera.position.z = 2000;
			//controls
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
			var light1 = new THREE.DirectionalLight( 0xffffff );
			light1.position.set( 1, 1, 1 ).normalize();
			scene.add( light1 );
			var light2 = new THREE.AmbientLight( 0x404040 );
			scene.add( light2 );
			// axes
			scene.add( new THREE.AxisHelper(100) );
			// projector
			projector = new THREE.Projector();
			// renderer
			if ( Detector.webgl ) renderer = new THREE.WebGLRenderer( {antialias: false} );
			else renderer = new THREE.CanvasRenderer(); 
			this.domNode.appendChild( renderer.domElement );
			// skybox
			if(this.skyboxArray.length == 6){
				// for canvas see http://stackoverflow.com/questions/16310880/comparing-methods-of-creating-skybox-material-in-three-js
				var textureCube = THREE.ImageUtils.loadTextureCube(this.skyboxArray, {}, render);
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
			if(location.href.indexOf('debug')){
				stats = new Stats();
				stats.domElement.style.position = 'absolute';
				stats.domElement.style.top = '0px';
				this.domNode.appendChild( stats.domElement );
			}
			this.connect(this.domNode, "onclick", "gotoObject");
		},
		gotoObject: function(event){
			event.preventDefault();
			domGeom.normalizeEvent(event);
			var positionInfo = dojo.position(this.domNode.parentNode, true);
			var clientWidth = positionInfo.w;
			var clientHeight = positionInfo.h;
			var x = ( event.offsetX / clientWidth ) * 2 - 1;
			var y = - ( event.offsetY / clientHeight ) * 2 + 1;
			var vector = new THREE.Vector3( x, y, 0.5 );
			projector.unprojectVector( vector, camera );
			var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
			var intersects = raycaster.intersectObjects( selectableObjects );
			if ( intersects.length > 0 ) {
				console.log(intersects);
				var selectedMesh = intersects[0].object;
				var highlightMaterial = new THREE.MeshLambertMaterial({color: 0xFFFFFF});

				selectedMesh.material = highlightMaterial;
				render();
				var curPosition =  new THREE.Vector3( camera.postion );
				var slectedPosition = selectedMesh.parent.position;
				var newPosition =  new THREE.Vector3( slectedPosition.x, slectedPosition.y, slectedPosition.z );
				
//				var curPosition = { x : camera.position.x, y : camera.position.y, z : camera.position.z };
				var curPosition = { x : 0, y : 0, z : 0 };
				var newPosition = { x : slectedPosition.x, y : slectedPosition.y, z : slectedPosition.z };
				//controls.target.set( controls.target.set( 0, 0, 0 ) )
//				camera.lookAt(slectedPosition);
//				render();
//			return;	
				var tween = new TWEEN.Tween(curPosition).to(newPosition, 2000);
				tween.easing(TWEEN.Easing.Quadratic.Out);				
				tween.onUpdate(function(){
//					camera.position = curPosition;
//					controls.target.set( controls.target.set( 0, 0, 0 ) )
//					controls.target.set( this );
					camera.lookAt(this);
					render();
					console.log(this.x);
				});
				tween.start();
//				camera.lookAt(newPosition);
//				camera.position = newPosition;
			}
		},		
		startup: function(){
			this.resize();
			animate();
		},
		resize: function(changeSize){
			var positionInfo = dojo.position(this.domNode.parentNode, true);
			var clientWidth = positionInfo.w;
			var clientHeight = positionInfo.h;
			camera.aspect = clientWidth / clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize( clientWidth, clientHeight );
			controls.handleResize();
			render();
			this.inherited(arguments);
		},
		/*
		onShow: function(){
			this.animate();
			this.inherited(arguments);
		},		
		onHide: function(){
			cancelAnimation();
			this.inherited(arguments);
		},		
		*/
		destroy: function(){
			cancelAnimation();
			this.inherited(arguments);
		},
		setSelectedObjectId: function(objectId, chartType){
			clearScene();
			switch(chartType){
			case '2D Process Model': 
				fillSceneClassModel(objectId, this.bodyViewId);			
			break;
			case '3D Class Model': 
				fillSceneClassModel(objectId, this.bodyViewId);			
			break;
			}
		},
		buildHierarchy: function(objectId, ourPos){
			if(objectId in this.cellPositionsObj) return;//loop protection
			return when(_nqDataStore.get(objectId), function(classItem){
				if(classItem.classId != 0) return;// class as opposed to object
				greatestXUntilNow.value = ourPos.x;
				//store the cells position in cell position object 
				var positionData = {name: classItem[852], vector: ourPos, minChildrenX: ourPos.x, maxChildrenX: ourPos.x, rotate: false};
				var promisses = [];
				var x = ourPos.x;
				var y = ourPos.y - 400;
				var z = ourPos.z;
				arrayUtil.forEach(classItem[bodyViewId], function(subobjectId){
					var newPos = new THREE.Vector3( x, y, z );
					var result = positionCellsInHierarchy(subobjectId, newPos, cellPositionsObj, greatestXUntilNow, bodyViewId);
					if(result){
						promisses.push(result);
						positionData.maxChildrenX = x;
						if(greatestXUntilNow.value > x) x = greatestXUntilNow.value;// a lower level may have bumped our x
						x = x + 800;
					}
				});
				//positionData.vector.x = (positionData.maxChildrenX - positionData.minChildrenX) /2 + positionData.minChildrenX;//place at the centre of our children
				console.log(positionData);
				console.log((positionData.maxChildrenX - positionData.minChildrenX) /2 );//+ positionData.minChildrenX;//place at the centre of our children
				cellPositionsObj[objectId] = positionData; 
				return all(promisses);
			});
		}
	});
	function animate() {
		requestID = requestAnimationFrame( animate.bind(this) );
		controls.update();
		if(stats) stats.update();
		TWEEN.update();
	}
	function cancelAnimation() {
		if(requestID) cancelAnimationFrame(requestID);
		requestID = undefined;
	}
	function render() {
		renderer.render( scene, camera );
	}
	function clearScene(){
		// clear the scene
		selectableObjects = [];
		var obj, i;
		for ( i = scene.children.length - 1; i >= 5 ; i -- ) {
		    obj = scene.children[ i ];
		    //if ( obj !== plane && obj !== tabPane.threejs.camera) {
		    scene.remove(obj);
		    //}
		}
		render();
	}

	function positionCellsInHierarchy(classItemId, ourPos, cellPositionsObj, greatestXUntilNow, bodyViewId){	
		if(classItemId in cellPositionsObj) return;

		return when(_nqDataStore.get(classItemId), function(classItem){
			if(classItem.classId != 0) return;// class as opposed to object
			greatestXUntilNow.value = ourPos.x;
			//store the cells position in cell position object 
			var positionData = {name: classItem[852], vector: ourPos, minChildrenX: ourPos.x, maxChildrenX: ourPos.x, rotate: false};
			var promisses = [];
			var x = ourPos.x;
			var y = ourPos.y - 400;
			var z = ourPos.z;
			arrayUtil.forEach(classItem[bodyViewId], function(subClassItemId){
				var newPos = new THREE.Vector3( x, y, z );
				var result = positionCellsInHierarchy(subClassItemId, newPos, cellPositionsObj, greatestXUntilNow, bodyViewId);
				if(result){
					promisses.push(result);
					positionData.maxChildrenX = x;
					if(greatestXUntilNow.value > x) x = greatestXUntilNow.value;// a lower level may have bumped our x
					x = x + 800;
				}
			});
			//positionData.vector.x = (positionData.maxChildrenX - positionData.minChildrenX) /2 + positionData.minChildrenX;//place at the centre of our children
			console.log(positionData);
			console.log((positionData.maxChildrenX - positionData.minChildrenX) /2 );//+ positionData.minChildrenX;//place at the centre of our children
			cellPositionsObj[classItemId] = positionData; 
			return all(promisses);
		});
	}

	function fillSceneClassModel(selectedObjectIdPreviousLevel, bodyViewId){
		var classMaterial = new THREE.MeshLambertMaterial( {color: 0x8904B1});
		var connectorMaterial =  new THREE.MeshPhongMaterial({specular: 0xffffff, color: 0x9F9F9F, emissive: 0x4F4F4F,shininess: 100 });
		var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
        //'Loading...'
		var text3d = new THREE.TextGeometry('Loading...', {size: 50, font: 'helvetiker'});
		text3d.computeBoundingBox();
		var xOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
		var yOffset = -0.5 * ( text3d.boundingBox.max.y - text3d.boundingBox.min.y );
		var textMesh = new THREE.Mesh(text3d, connectorMaterial);
		textMesh.position.x = xOffset;
		textMesh.position.y = 400;
		textMesh.position.z = 0;
		textMesh.rotation.x = 0;
		textMesh.rotation.y = Math.PI * 2;
		scene.add(textMesh);
		render();
		// make the scene
		var loader = new THREE.JSONLoader(true);
		loader.load("img/Neuralquest/mesh/classMesh.js", function(geometry, materials) {
			var cellPositionsObj = {};
			//var greatestXUntilNow = {value: 0};

			when(positionCellsInHierarchy(selectedObjectIdPreviousLevel, new THREE.Vector3( 0, 0, 0 ), cellPositionsObj, {value: 0}, bodyViewId), function(classItem){
				clearScene();
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
			        mesh.name = key;
			        classObject.add(mesh);
			        classObject.name = positionInfo.name;
			        
			        selectableObjects.push(mesh);
			        
			        //The Name
					var text3d = new THREE.TextGeometry(positionInfo.name, {size: 30, height: 5, font: 'helvetiker'});
					//var text3d = new THREE.TextGeometry( 'Organizations', {size: 70, height: 20, curveSegments: 4, font: 'helvetiker', weight: 'normal', style: 'normal',  });
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
				var ourVec = new THREE.Vector3( positionInfo.vector.x, 0, 0 );
				sceneObject3D.position = ourVec;
				scene.add(sceneObject3D);

				render();

			});
		});

	}
	return nqWebGlChartWidget;
});
