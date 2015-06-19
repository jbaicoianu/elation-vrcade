elation.require(['engine.things.player'], function() {
  elation.component.add('engine.things.vrcadeplayer', function() {
    this.postinit = function() {
      elation.engine.things.vrcadeplayer.extendclass.postinit.call(this);
      this.activegame = 0;
    }
    this.createObject3D = function() {
      this.objects['3d'] = new THREE.Object3D();
      //var light = new THREE.PointLight(0xffffff, .1);
      //this.objects['3d'].add(light);
      return this.objects['3d'];
    }
  }, elation.engine.things.player);
});
