elation.require(['engine.things.player'], function() {
  elation.component.add('engine.things.vrcadeplayer', function() {
    this.postinit = function() {
      elation.engine.things.vrcadeplayer.extendclass.postinit.call(this);
      this.activegame = 0;
    }
  }, elation.engine.things.player);
});
