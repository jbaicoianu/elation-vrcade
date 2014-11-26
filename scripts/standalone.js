elation.require(['vrcade.external.jsmess-webaudio', 'vrcade.external.JSMESSLoader'], function() {
  elation.component.add('vrcade.standalone', function() {
    this.init = function() {
      var gamename = (document.location.hash ? document.location.hash.substr(1) : prompt('Game name?'));
      if (gamename) {
        elation.require('vrcade.games.' + gamename + '.messloader');
      }
    }
  });
});
