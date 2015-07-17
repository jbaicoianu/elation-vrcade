elation.require([
    "ui.spinner", "ui.loader", "ui.tabbedcontent", "ui.slider", "ui.toggle", "ui.list", "ui.label",
    "engine.engine", "engine.external.three.tween", "engine.things.camera", "engine.things.menu",
    "vrcade.vrcadeplayer", "vrcade.arcadecabinet", "vrcade.arcademachine", "vrcade.arcadeposter",
    "share.share", "share.targets.imgur", "share.targets.dropbox", "share.targets.google"
  ], function() {

  //elation.template.add('vrcade.intro', '<div data-elation-component="ui.spinner" data-elation-args.label="loading" data-elation-args.type="dark"></div>');

  elation.component.add('vrcade', function() {
    this.initWorld = function() {
      this.world.setFog(1, 50, 0x111111);
      this.world.setSky('/media/vrcade/textures/skybox', 'jpg', ['p', 'n']);

      this.vrcade = this.world.spawn('vrcade', 'vrcade');

      var playerpos = [-16.941,0,-24.576];
      //var playerpos = [0,2.4,0];
      this.player = this.vrcade.spawn('vrcadeplayer', 'player', { 
        position: playerpos,
        startposition: playerpos,
        orientation: [0, 0.93664, 0, -0.35030], 
        mass: 20, 
        height: 2 
      });

      this.view.setactivething(this.player);
      this.loader = elation.ui.loader({
        append: this,
        right: true,
        bottom: true
      });

      this.showMenu();
      //elation.events.add(this.loader, 'ui_loader_finish', elation.bind(this.gameobj, this.gameobj.handleLoaderFinished));
    }
    this.startGame = function() {
      if (!this.started) {
        this.vrcade.loadGame();  
        this.started = true;
      }
      this.hideMenu();
    }
    this.showAbout = function() {
    }
  }, elation.engine.client);

  elation.component.add('engine.things.vrcade', function() {
    this.gamenum = 0;
    this.cabinets = {};
    this.started = false;
    this.loaded = false;

    this.postinit = function() {
      this.defineProperties({
        view: { type: 'object' }
      });
      if (this.properties.view) this.view = this.properties.view;
    }
    this.createObject3D = function() {
      return new THREE.Object3D();
    }

    this.createChildren = function() {

      this.lights = this.create_lights();
      elation.engine.geometries.loadMeshFromURL('cabinet-default', '/media/vrcade/models/cabinet/cabinet.dae');

      this.vrcadesign = this.spawn('generic', 'vrcadesign', {
        "position": [0,0,0],
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-sign.dae",
        "scale": [.3048, .3048, .3048]
      });

    }
    this.create_lights = function() {
      var lights = [];
/*
      lights.push(this.spawn('light', 'sun', {
        "position":[50,30,-30],
        "persist":false,
        "type":"directional",
        "intensity":0.6,
        //"velocity":[0,0,0.05]
      }));
*/
      /*
      lights.push(this.spawn('light', 'sun2', {
        "position":[-50,-30,-30],
        "persist":false,
        "type":"directional",
        "intensity":0.2,
        //"velocity":[0,0,0.05]
      }));
      */
      lights.push(this.spawn('light', 'point01', {
        "position":[-10,20,10],
        "persist":false,
        "type":"point",
        "intensity": .4,
        "color":0xffffff,
      }));
      lights.push(this.spawn('light', 'point02', {
        "position":[20,10,32],
        "persist":false,
        "type":"point",
        "intensity": .4,
        "color":0xcccccc,
      }));
      lights.push(this.spawn('light', 'point03', {
        "position":[0,10,-30],
        "persist":false,
        "type":"point",
        "intensity": .4,
        "color":0xcccccc,
      }));
      lights.push(this.spawn('light', 'ambient', {
        "position":[0,0,0],
        "persist":false,
        "type":"ambient",
        "color":0xffffff,
      }));

      return lights;
    }
    this.load_games = function() {
      this.gamepack = '/media/vrcade/gamepack/NewRetroArcade/Content';
      this.engine.systems.world.loadSceneFromURL('/media/vrcade/models/flynns-v5/vrcade-things.json', elation.bind(this, function() {
        elation.net.get(this.gamepack + '/ArcadeMachines.xml', null, { onload: this.process_games.bind(this) });
        elation.net.get(this.gamepack + '/ArcadePosters.xml', null, { onload: this.process_posters.bind(this) });
      }));
    }
    this.process_games = function(d) {
      var xmldoc = d.target.responseXML;
      var expr = xmldoc.evaluate('//ArcadeMachines', xmldoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
      var container = expr.iterateNext();

      if (container) {
        var games = container.children;
        for (var i = 0; i < games.length; i++) {
          var name = games[i].nodeName;
          var foo = elation.utils.parseXML(games[i]);
          var gamedata = foo[name]._children;
          var machine = elation.engine.things.arcademachine(name);
          if (machine) {
            if (gamedata.ArtFrontPanel && gamedata.ArtFrontPanel.Texture) {
              var frontpath = this.gamepack + '/Arcades/' + gamedata.ArtFrontPanel.Texture.replace('.dds', '.png');
              machine.setFrontTexture(frontpath);
            }
            if (gamedata.ArtSidePanel && gamedata.ArtSidePanel.Texture) {
              var sidepath = this.gamepack + '/Arcades/' + gamedata.ArtSidePanel.Texture.replace('.dds', '.png');
              machine.setSideTexture(sidepath);
            }
            if (gamedata.Game) {
              var gamename = gamedata.Game._content.substr(0, gamedata.Game._content.indexOf('.'));
              machine.setGame(gamename)
            }
            if (gamedata.GameImage) {
              var screenpath = this.gamepack + '/Roms/' + gamedata.GameImage._content;
              machine.setDefaultScreenTexture(screenpath);
            }
          } else {
            console.log("couldn't find machine:", name);
          }
        }
        this.refresh();
      }
    }
    this.process_posters = function(d) {
      var xmldoc = d.target.responseXML;
      var expr = xmldoc.evaluate('//ArcadePosters', xmldoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
      var container = expr.iterateNext();
      if (container) {
        var posters = container.children;
        for (var i = 0; i < posters.length; i++) {
          var name = posters[i].nodeName;
          var posterdata = elation.utils.parseXML(posters[i])[name];
          var poster = elation.engine.things.arcadeposter(name);
          if (poster) {
            if (posterdata.Texture) {
              var posterfile = this.gamepack + '/Posters/' + posterdata.Texture.replace('.dds', '.png');
              poster.setPosterTexture(posterfile);
            }
          } else {
            console.log("couldn't find poster:", name);
          }
        }
        this.refresh();
      }
    }
    this.loadGame = function() {
      this.collidermesh = this.spawn('generic', 'collider', {
        //"render.collada": "/media/vrcade/models/flynns-v5/flynns-collider.dae",
        "render.scene": "/media/vrcade/models/flynns-v5/flynns-collider.json",
        "scale": [.3048, .3048, .3048]
      });
      this.neighborhood = this.spawn('generic', 'neighborhood', {
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-neighborhood.dae",
        "scale": [.3048, .3048, .3048]
      });
      this.exterior = this.spawn('generic', 'exterior', {
        "position": [0,0,0],
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-exterior.dae",
        "scale": [.3048, .3048, .3048]
      });
      this.interior = this.spawn('generic', 'interior', {
        "position": [0,0,0],
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-interior.dae",
        "scale": [.3048, .3048, .3048]
      });

      elation.events.add(this.interior, 'thing_load', elation.bind(this, this.load_games));
    }
    this.loadTheater = function() {
      this.theater = this.spawn('generic', 'theater', {
        //"render.gltf": "/media/vrcade/models/flynnstheater/flynnstheater.json",
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-theater.dae",
        "position": [0,.1,0]
      });
      this.theaterscreen = this.spawn('theaterscreen', 'screen', {
        "position": [10,16,78],
        "orientation": [0,0.7071067811865474,0,0.7071067811865474]
      });
    }

    this.startIntro = function() {
      var camerapoints = [
        new THREE.Vector3(-50,6,500),
        new THREE.Vector3(-60,6,100),
        new THREE.Vector3(-60,6,20),
        new THREE.Vector3(-30,6,-25), 
        new THREE.Vector3(-15,6,-20), 
      ];
      this.cameraspline = new THREE.CurvePath();
      this.cameraspline.add(new THREE.SplineCurve3(camerapoints));
      
      this.pathtracker = this.spawn('pathtracker', 'camera', {
        'path': this.cameraspline,
        'target': new THREE.Vector3(-3, 8, -10),
        'tracktime': 15.0,
        'autostart': false,
        'collidable': false,
        'physical': false
        //'position': camerapoints[0].toArray()
      });
//console.log(this.pathtracker);
      //this.pathtracker.setPathPoint(0);
/*
      this.pathedit = this.spawn('pathedit', null, {
        'path': this.cameraspline
      });
*/
/*
      this.jukebox = elation.html.create({tag: 'audio', append: document.body});
      this.jukebox.src = '/media/vrcade/music/Journey-SeparateWays.mp3';
      this.jukebox.preload = 'auto';
*/



    }
    this.setgame = function(n) {
      this.gamenum = (n + this.games.length) % this.games.length;
      var gamepos = this.getgameposition(this.gamenum);
      var playerpos = this.getgameposition(this.gamenum, new THREE.Vector3(0,0,5));
      var dir = new THREE.Vector3().subVectors(playerpos, gamepos).normalize();
      this.player.properties.position.copy(playerpos);
      //this.player.properties.orientation.setFromUnitVectors(new THREE.Vector3(0,0,1), dir);
      //this.player.lookAt(gamepos);

      var cab = this.cabinets[this.games[this.gamenum].name];
      this.player.properties.orientation.copy(cab.properties.orientation);
      //this.player.properties.orientation.setFromEuler(new THREE.Euler(-Math.PI/2.1, 0, 0));

      this.player.refresh();
    }

  }, elation.engine.things.generic);
});
