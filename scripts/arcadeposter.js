elation.require('engine.things.generic', function() {
  elation.component.add('engine.things.arcadeposter', function() {
    this.setPosterTexture = function(texurl) {
      var tex = elation.engine.materials.getTexture(texurl);
      if (tex) {
        if (!this.parts['poster']) {
          elation.events.add(this, 'thing_load', elation.bind(this, this.setPosterTexture, texurl));
        } else {
          var oldmat = this.parts['poster'].children[0].material;
          this.parts['poster'].children[0].material = new THREE.MeshPhongMaterial({
            map: tex,
            normalMap: oldmat.normalMap,
            lightMap: oldmat.lightMap
          });
        }
      }
    }
  }, elation.engine.things.generic);
});
