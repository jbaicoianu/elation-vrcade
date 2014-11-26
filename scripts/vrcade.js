elation.require(["ui.panel", "ui.spinner", "ui.loader", "engine.engine", "engine.external.three.tween", "engine.things.player", "engine.things.pathtracker", "engine.things.camera"], function() {

  elation.template.add('vrcade.intro', '<div data-elation-component="ui.spinner" data-elation-args.label="loading" data-elation-args.type="dark"></div>');

  elation.component.add('vrcade', function() {
    this.init = function() {
      this.initEngine();

      this.loader = elation.ui.loader({
        append: this,
        right: true,
        bottom: true
      });
    }
    this.initEngine = function() {
      this.engine = elation.engine.create("vrcade", ["physics", "controls", "sound", "ai", "world", "admin", "render"], elation.bind(this, this.startEngine));
    }
    this.startEngine = function(engine) {
      elation.require(['engine.things.light', 'engine.things.terrain', 'vrcade.arcadecabinet'], elation.bind(this, function() {
        engine.systems.world.load({
          type: 'vrcade',
          name: 'vrcade',
          properties: {
          }
        });
        this.view = elation.engine.systems.render.view("main", elation.html.create({ tag: 'div', append: document.body }), { fullsize: 1, picking: 1, engine: 'vrcade', showstats: true } );
        this.engine.systems.world.children.vrcade.setview(this.view);
        engine.start();
      }));

    }
  });

  elation.component.add('engine.things.vrcade', function() {
    this.gamegroups = [
      {
        position: [10,0,0],
        //scale: [1.5, 1.5, 1.5],
        games: [
          { name: 'pacman', model: 'pacman', gamename: 'pacman' },
          { name: 'galaxian', model: 'galaga', gamename: 'galaxian' },
          { name: 'moonpatrol', model: 'moon-patrol', gamename: 'mpatrol' },
          { name: 'joust', model: 'joust', gamename: 'joust' },
        ]
      },
/*
      {
        position: [10,0,10],
        //scale: [1.5, 1.5, 1.5],
        games: [ 
          { name: 'stargate', model: 'stargate', gamename: 'stargate' },
          { name: 'joust', model: 'joust', gamename: 'joust' },
        ]
      }
*/
    ];
    this.gamenum = 0;

    this.cabinets = {};

    this.postinit = function() {
    }
    this.createObject3D = function() {
      return new THREE.Object3D();
    }

    this.thing_create = function() {
      this.lights = this.create_lights();
      this.collidermesh = this.spawn('generic', 'collider', {
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-collider.dae",
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
/*
      this.theater = this.spawn('generic', 'theater', {
        //"render.gltf": "/media/vrcade/models/flynnstheater/flynnstheater.json",
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-theater.dae",
        "position": [0,.1,0]
      });
*/
/*
      this.theaterscreen = this.spawn('theaterscreen', 'screen', {
        "position": [10,16,78],
        "orientation": [0,0.7071067811865474,0,0.7071067811865474]
      });
*/

      this.engine.systems.world.setFog(1, 50, 0x111111);
      this.engine.systems.world.setSky('/media/space/textures/nightskybox', 'jpg', ['p', 'n']);

/*
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
*/
//console.log(this.pathtracker);
      //this.pathtracker.setPathPoint(0);
/*
      this.pathedit = this.spawn('pathedit', null, {
        'path': this.cameraspline
      });
*/

      this.player = this.spawn('vrcadeplayer', 'player', { "position":[0,2.4,0], mass: 50 });
      if (this.view) {
        this.setview(this.view);
      }


/*
      this.jukebox = elation.html.create({tag: 'audio', append: document.body});
      this.jukebox.src = '/media/vrcade/music/Journey-SeparateWays.mp3';
      this.jukebox.preload = 'auto';
*/



      elation.events.add(this.neighborhood, 'thing_load', elation.bind(this, this.create_games));
    }
    this.create_ui = function() {
/*
      this.introcontent = elation.ui.panel({append: this.container});
      this.introwindow = elation.ui.window({
        append: document.body,
        classname: 'vrcade_intro',
        center: true,
        resizable: false,
        title: 'VRcade.io',
        controls: false,
        content: elation.template.get('vrcade.intro')
      });
*/
    }
    this.create_lights = function() {
      var lights = [];
/*
      lights.push(this.spawn('light', 'sun', {
        "position":[50,30,30],
        "persist":false,
        "type":"directional",
        "intensity":0.2,
        //"velocity":[0,0,0.05]
      }));
*/
      lights.push(this.spawn('light', 'ambient', {
        "position":[0,0,0],
        "persist":false,
        "type":"ambient",
        "color":0xcccccc,
      }));

      return lights;
    }
    this.create_games = function() {
      this.create_ui();

      this.gamesloading = 0;
      var groups = [];
      for (var i = 0; i < this.gamegroups.length; i++) {
        var group = this.spawn('vrcadegamegroup', 'group_' + i, this.gamegroups[i]);
console.log('new group!', group);
        elation.events.add(group, 'thing_load', elation.bind(this, this.handlegroupload));
        groups.push(this);
      }

/*
      this.spawn('generic', 'changemachine', {
        'render.collada': '/media/vrcade/models/pacman/pacman.dae',
        'position': [0,0,0],
        'orientation': [0,1,0,0],
        //scale: [1.4, 1.4, 1.4],
        //scale: [.3048,.3048,.3048],
      });
*/
    }
    this.setview = function(view) {
      this.view = view;
      if (this.player) {
        this.view.setactivething(this.player);
      }
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
    this.handlegroupload = function() {
      console.log('new group loaded');
    }
  }, elation.engine.things.generic);

  elation.component.add('engine.things.vrcadegamegroup', function() {
    this.postinit = function() {
      this.defineProperties({
        'layout': { type: 'string', default: 'line' },
        'games': { type: 'array', default: [] }
      });
      this.layout = this.properties.layout;
      this.games = this.properties.games;

      setTimeout(elation.bind(this, this.create_games), 10);
    }
    this.createObject3D = function() {
      return new THREE.Object3D();
    }
    this.create_games = function() {
      //this.create_ui();

      this.gamesloading = 0;
      this.cabinets = {};

      var scale = .5; //.3048;

      for (var i = 0; i < this.games.length; i++) {
        var name = this.games[i].name;
        var gameargs = {
          'name': name,
          'gamename': this.games[i].gamename,
          'loader': 'messloadergl',
          //'render.gltf': '/media/vrcade/models/' + this.games[i].model + '/' + this.games[i].model + '.json',
          'render.collada': '/media/vrcade/models/' + this.games[i].model + '/' + this.games[i].model + '.dae',
          'scale': [scale, scale, scale],
          mass: 0
        };
        this.cabinets[name] = this.spawn('arcadecabinet', name, gameargs);
        this.gamesloading++;
        elation.events.add(this.cabinets[name], 'thing_load', elation.bind(this, this.handlethingload));
      }

      var cabwidth = 4.2 * scale;
      var cabspacing = 0;
      if (this.layout == 'circle') {
        var gamespacing = -(2 * Math.PI) / this.games.length;
        var radius = (cabwidth * this.games.length) / (2 * Math.PI) * .8;
        for (var i = 0; i < this.games.length; i++) {
          var cabinet = this.cabinets[this.games[i].name];
          cabinet.properties.position.set(radius * Math.cos(gamespacing * i), 0, radius * Math.sin(gamespacing * i));
          cabinet.properties.orientation.setFromEuler(new THREE.Euler(0, -gamespacing * i + Math.PI/2, 0));
          cabinet.refresh();
        }
      } else {
        var totalcabwidth = cabwidth + cabspacing;
        var totalwidth = totalcabwidth * this.games.length;
        for (var i = 0; i < this.games.length; i++) {
          var cabinet = this.cabinets[this.games[i].name];
          cabinet.properties.position.set((totalcabwidth * i) - (totalwidth / 2), 0, 0);
        }
      }

/*
      setTimeout(elation.bind(this, function() {
        this.setgame(this.gamenum);
      }), 10);
*/
    }
    this.handlethingload = function() {
      this.refresh();
      if (--this.gamesloading == 0) {
        this.loadcomplete();
      }
    }
    this.loadcomplete = function() {
      //this.introwindow.hide();
      setTimeout(elation.bind(this, function() {
        elation.events.fire({type: 'thing_load', element: this});
      }), 0);
    }
    this.getgameposition = function(n, offset) {
      var game = this.games[n % this.games.length];
      var cab = this.cabinets[game.name];
      var gamepos = new THREE.Vector3();
      if (offset) gamepos.copy(offset);
      gamepos = cab.localToWorld(gamepos);
      return gamepos;
    }
  }, elation.engine.things.generic);
  elation.component.add('engine.things.vrcadeplayer', function() {
    this.postinit = function() {
      elation.engine.things.vrcadeplayer.extendclass.postinit.call(this);
      this.activegame = 0;
    }
    this.initForces = function() {
      
    }
  }, elation.engine.things.player);
  elation.component.add('engine.things.vrcadecollider', function() {
    this.postinit = function() {
      elation.events.add(this, 'resource_load_finish', this);
    }
    this.resource_load_finish = function(ev) {
      var obj = this.objects['3d'].children[0];
      this.objects['3d'].remove(obj);
      console.log('BURP finished load', obj);
    }
  }, elation.engine.things.generic);

});
