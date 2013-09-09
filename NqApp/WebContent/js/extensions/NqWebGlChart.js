define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "dijit/_WidgetBase", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry", "dojo/Deferred"],
	function(declare, when, all, arrayUtil, _WidgetBase, domConstruct, lang, domGeom, Deferred){
	var renderer, camera, scene, controls, projector, stats, requestId;
	
	return declare("NqWebGlChartWidget", [_WidgetBase], {
		skyboxArray: [],
		selectableObjects: [],

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
				scene.add(mesh);	
			}
			if(location.href.indexOf('localhost')){
				stats = new Stats();
				stats.domElement.style.position = 'absolute';
				stats.domElement.style.top = '0px';
				this.domNode.appendChild( stats.domElement );
			}
			this.connect(this.domNode, "onclick", "gotoObject");
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
		setSelectedObjectId: function(objectId){
			for(var i=0;i<this.selectableObjects.length;i++){
				var selectableObject = this.selectableObjects[i];
				if(selectableObject.name == objectId){
					this.moveCameraToMesh(selectableObject);					
					break;
				}				
			}
		},
		moveCameraToMesh: function(selectedMesh){
			var highlightMaterial = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
			selectedMesh.material = highlightMaterial;
			render();
return;			
			var curPosition =  new THREE.Vector3( camera.postion );
			var slectedPosition = selectedMesh.parent.position;
			var newPosition =  new THREE.Vector3( slectedPosition.x, slectedPosition.y, slectedPosition.z );
			
//			var curPosition = { x : camera.position.x, y : camera.position.y, z : camera.position.z };
			var curPosition = { x : 0, y : 0, z : 0 };
			var newPosition = { x : slectedPosition.x, y : slectedPosition.y, z : slectedPosition.z };
			//controls.target.set( controls.target.set( 0, 0, 0 ) )
//			camera.lookAt(slectedPosition);
//			render();
//		return;	
			var tween = new TWEEN.Tween(curPosition).to(newPosition, 2000);
			tween.easing(TWEEN.Easing.Quadratic.Out);				
			tween.onUpdate(function(){
//				camera.position = curPosition;
//				controls.target.set( controls.target.set( 0, 0, 0 ) )
//				controls.target.set( this );
				camera.lookAt(this);
				render();
				console.log(this.x);
			});
			tween.start();
//			camera.lookAt(newPosition);
//			camera.position = newPosition;
		
		},
		startup: function(){
			this.resize();
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
			this.inherited(arguments);
		},
		clearScene: function(){
			// clear the scene
			this.selectableObjects = [];
			var obj, i;
			for ( i = scene.children.length - 1; i >= 5 ; i -- ) {
			    obj = scene.children[ i ];
			    //if ( obj !== plane && obj !== tabPane.threejs.camera) {
			    scene.remove(obj);
			    //}
			}
			render();
		},
		addToScene: function(sceneObject3D){
			scene.add(sceneObject3D);
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
			scene.add(textMesh);
			render();
		}
	});
	function render(){
		renderer.render( scene, camera );		
	}
	function animate(){
		requestId = requestAnimationFrame( animate.bind(this) );
		controls.update();
		if(stats) stats.update();
		TWEEN.update();
	}
	function cancelAnimation(){
		if(requestId) cancelAnimationFrame(requestId);
		requestId = undefined;
	}
});
