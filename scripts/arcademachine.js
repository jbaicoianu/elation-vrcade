elation.require(['vrcade.emulatedmachine'], function() {
  elation.component.add('engine.things.arcademachine', function() {
    // Static class member variables, one instance of this.system for all games
    this.system = false;

    this.postinit = function() {
      elation.engine.things.arcademachine.extendclass.postinit.call(this);
      if (!elation.engine.things.arcademachine.system) {
        //console.log('create new system for arcademachine', this.id);
        elation.engine.things.arcademachine.system = this.createsystem();
      }
      this.system = elation.engine.things.arcademachine.system;
    }
  }, elation.engine.things.emulatedmachine);
});
