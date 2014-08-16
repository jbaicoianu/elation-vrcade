elation.require('engine.external.jsmess.jsmess-webaudio', function() {
  elation.component.add('vrcade.standalone', function() {
    this.init = function() {
      var gamename = prompt('Game name?');
      if (gamename) {
        elation.require('vrcade.games.' + gamename + '.messloader');
      }
    }
  });
});
