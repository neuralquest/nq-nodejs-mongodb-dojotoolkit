define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "dijit/_WidgetBase", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry", "dojo/Deferred", 'dijit/registry', 
        'threejs/build/three.js', 'threejs/examples/js/controls/TrackballControls.js', 'threejs/examples/js/Detector.js', 'threejs/examples/js/libs/stats.min.js', 'threejs/examples/js/libs/tween.min.js', 'threejs/examples/fonts/helvetiker_regular.typeface.js'],
	function(declare, when, all, arrayUtil, _WidgetBase, domConstruct, lang, domGeom, Deferred, registry){
	var renderer, camera, scene, controls, projector, stats, requestId;
	
	return declare("nqWebGlChart", [_WidgetBase], {
		skyboxArray: [],
		selectableObjects: [],
		displayFPS: false,

		selectedObjIdPreviousLevel: null,
		selectedObjIdThisLevel: null,
		
		createDeferred: null,
		setSelectedObjIdPreviousLevel: new Deferred(),
		setSelectedObjIdThisLevel: new Deferred(),
		
		setSelectedObjIdPreviousLevel: function(objectId){
			if(objectId == this.selectedObjIdPreviousLevel) return this;
			this.selectedObjIdPreviousLevel = objectId;
			
			//goto selected object
			var mesh = this.getMeshByName(objectId);
			if(mesh) this.moveCameraToMesh(mesh);
			return this;
		},
		_getSelectedObjIdPreviousLevelAttr: function(){ 
			return this.selectedObjIdPreviousLevel;
		},
		setSelectedObjIdThisLevel: function(value){
			this.selectedObjIdThisLevel = value;
			return this;
		},
		_getSelectedObjIdIdAttr: function(){ 
			return this.selectedObjIdThisLevel;
		},
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
		},
		postCreate: function(){
			this.inherited(arguments);
			
			var sceneObject3D = new THREE.Object3D();
			//camera
			camera = new THREE.PerspectiveCamera( 60, 3 / 2, 1, 100000 );
			camera.position.z = 2000;
			//by changing the eulerOrder we can force the camera to keep its head level
			//see: http://stackoverflow.com/questions/17517937/three-js-camera-tilt-up-or-down-and-keep-horizon-level
			camera.eulerOrder = "YXZ";
			//controls
			controls = new THREE.TrackballControls(camera, this.domNode);
			controls.rotateSpeed = 1.0;
			controls.zoomSpeed = 1.5;
			controls.panSpeed = 0.8;
			controls.noRotate = false;
			controls.noZoom = false;
			controls.noPan = false;
			controls.staticMoving = false;
			controls.dynamicDampingFactor = 0.3;
			controls.keys = [ 65, 83, 68 ];
			controls.addEventListener( 'change', render );
			// world
			scene = new THREE.Scene();
			// lights
			var light1 = new THREE.DirectionalLight( 0xffffff );
			light1.position.set( 1, 1, 1 ).normalize();
			sceneObject3D.add( light1 );
			var light2 = new THREE.AmbientLight( 0x404040 );
			sceneObject3D.add( light2 );
			// axes
			sceneObject3D.add( new THREE.AxisHelper(100) );
			// projector
			projector = new THREE.Projector();
			// renderer
			//renderer = new THREE.WebGLRenderer( {antialias: true} );
			if ( Detector.webgl ) renderer = new THREE.WebGLRenderer( {antialias: true} );
			else if(Detector.canvas) renderer = new THREE.CanvasRenderer();
			//else;
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
				sceneObject3D.add(mesh);	
			}
			//else see http://threejs.org/examples/webgl_multiple_views.html
			// for canvas gradient
			if(this.displayFPS){
				stats = new Stats();
				stats.domElement.style.position = 'absolute';
				stats.domElement.style.top = '0px';
				this.domNode.appendChild( stats.domElement );
			}
			this.connect(this.domNode, "onclick", "gotoObject");
			sceneObject3D.name = 'Boilerplate';
			scene.add(sceneObject3D);
			
//			this.startup();
		},
		gotoObject: function(event){
			//see http://stackoverflow.com/questions/11161674/dragging-and-clicking-objects-with-controls
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
			var intersects = raycaster.intersectObjects( this.selectableObjects );
			if ( intersects.length > 0 ) {
				console.log(intersects);
				var selectedMesh = intersects[0].object;
				this.moveCameraToMesh(selectedMesh);
			}
		},		
		moveCameraToMesh: function(selectedMesh){
			this.swapSelectedItemMaterial(selectedMesh);
			
			var newTargetPos = new THREE.Vector3();
			newTargetPos.getPositionFromMatrix(selectedMesh.matrixWorld);
			var newCameraPos = newTargetPos.clone();
			newCameraPos.z = 2000;

			var cameraPos = camera.position;
			var target = controls.target;
			var fromPos = {tx: target.x, ty: target.y, tz: target.z, cx: cameraPos.x, cy: cameraPos.y, cz: cameraPos.z};
			var toPos = {tx: newTargetPos.x, ty: newTargetPos.y, tz: newTargetPos.z, cx: newCameraPos.x, cy: newCameraPos.y, cz: newCameraPos.z};
			var tween = new TWEEN.Tween(fromPos).to(toPos, 1500);
			tween.easing(TWEEN.Easing.Quadratic.Out);				
			tween.onUpdate(function(){
				var tweenTargetPos = new THREE.Vector3(this.tx, this.ty, this.tz);
				var tweenCameraPos = new THREE.Vector3(this.cx, this.cy, this.cz);
				controls.object.position = tweenCameraPos;
				controls.target = tweenTargetPos;
			});
			tween.start();
		},
		swapSelectedItemMaterial: function(mesh){
			var currentMaterial = mesh.material;
			if(this.selectedMeshMaterialBeforeSelection) {
				//set the material of the current selected mesh to what it was
				this.selectedMesh.material = this.selectedMeshMaterialBeforeSelection;
			}
			this.selectedItemId = mesh.name;
			this.selectedMesh = mesh;
			this.selectedMeshMaterialBeforeSelection = currentMaterial;
			var highlightMaterial = new THREE.MeshLambertMaterial({color: 0xFFFF33});			
			mesh.material = highlightMaterial;
			//===============================
			//var materials = [
			//	new THREE.MeshLambertMaterial( { color: 0x0000ff, shading: THREE.FlatShading, vertexColors: THREE.VertexColors } ),
			//	new THREE.MeshBasicMaterial( { color: 0x000000, shading: THREE.FlatShading, wireframe: true, transparent: true } )
			//];
	    	//var cube = THREE.SceneUtils.createMultiMaterialObject( cubeGeometry, materials );				
			//===============================

		},
		startup: function(){
			//this.resize();
			var pane = registry.byId('tab'+this.tabId);
			pane.resize();
			this.loadingMessage();
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
			animate();
			this.inherited(arguments);
		},		
		onHide: function(){
			cancelAnimation();
			this.inherited(arguments);
		},		
		*/
		destroy: function(){
			cancelAnimation();
			for ( var i = scene.children.length - 1; i >= 0 ; i -- ) {
			    var obj = scene.children[ i ];
			    scene.remove(obj);
			}
			this.inherited(arguments);
		},
		clearScene: function(){
			// clear the scene
			this.selectableObjects = [];
			// the first object contains the boilerplate, so leave it.
			for ( var i = scene.children.length - 1; i >= 1 ; i -- ) {
			    var obj = scene.children[ i ];
			    scene.remove(obj);
			}
			render();
		},
		addToScene: function(object3D, headerOrBody){
			switch(headerOrBody){
			case 'rowHeader':
				this.rowHeaderObject = object3D;
				scene.add(object3D);
				break;
			case 'columnHeader':
				this.columnHeaderObject = object3D;
				scene.add(object3D);
				break;
			default:
				this.bodyObject = object3D;
				scene.add(object3D);
				break;
			}
			render();
		},
		loadingMessage: function(){
			var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
	        //'Loading...'
			var text3d = new THREE.TextGeometry('Loading...', {size: 50, font: 'helvetiker'});
			text3d.computeBoundingBox();
			var xOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
			var yOffset = -0.5 * ( text3d.boundingBox.max.y - text3d.boundingBox.min.y );
			var textMesh = new THREE.Mesh(text3d, textMaterial);
			textMesh.position.x = xOffset;
			textMesh.position.y = 400;
			textMesh.position.z = 0;
			textMesh.rotation.x = 0;
			textMesh.rotation.y = Math.PI * 2;
			textMesh.name = 'Loading Message';
			scene.add(textMesh);
			render();
		},
		getMeshByName: function(name){
			for(var i=0;i<this.selectableObjects.length;i++){
				var selectableObject = this.selectableObjects[i];
				if(selectableObject.name == name){
					return selectableObject;
				}				
			}			
		} 
	});
	function render(){
		//console.log(camera.position.x);
		camera.rotation.z = 0;// this is used to keep the camera level
		renderer.render( scene, camera );		
	}
	function animate(){
		requestId = requestAnimationFrame( animate.bind(this) );
		TWEEN.update();
		controls.update();
		if(this.displayFPS) stats.update();
	}
	function cancelAnimation(){
		if(requestId) cancelAnimationFrame(requestId);
		requestId = undefined;
	}
});
