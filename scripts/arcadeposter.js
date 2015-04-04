elation.require('engine.things.generic', function() {
  elation.component.add('engine.things.arcadeposter', function() {
    this.setPosterTexture = function(texurl) {
      var tex = elation.engine.materials.getTexture(texurl);
      if (tex) {
        var oldmat = this.parts['poster'].children[0].material;
        this.parts['poster'].children[0].material = new THREE.MeshPhongMaterial({
          map: tex,
        });
      }
    }
  }, elation.engine.things.generic);
});
