function Game () {
  this.bullets = [];
  this.meteors = [];
  this.assets  = {};
  this.blur    = true;
  this.score   = 0;
};

_.extend(Game, {

});

_.extend(Game.prototype, {
  initialize: function () {
    this.canvas  = document.getElementById('game');
    this.context = this.canvas.getContext('2d');

    this.setCanvasSize();
    this.setCanvasCoordinates();
    this.setCanvasResizer();

    this.ship = new Ship( this );

    this.setKeyListeners();
  },

  loadAssets: function () {
    var game   = this;
    var assets = game.assets;
    var assetsLoaded = 0;

    function finishLoading () {
      assetsLoaded += 1;

      if (assetsLoaded == 3) {
        $(game).trigger('ready');
      };
    };

    assets.ship = new Image();
    assets.meteor = new Image();
    assets.bullet = new Image();

    $(assets.ship).on("load", finishLoading);
    $(assets.meteor).on("load", finishLoading);
    $(assets.bullet).on("load", finishLoading);

    assets.ship.src = "img/ship.png";
    assets.meteor.src = "img/meteor_2.png";
    assets.bullet.src = "img/bullet.png";
  },

  add: function (obj) {
    var collection = (obj.class == 'bullet') ? this.bullets : this.meteors;

    collection.push( obj );
  },

  remove: function (obj) {
    var collection = (obj.class == 'bullet') ? this.bullets : this.meteors;

    var index = collection.indexOf( obj );
    if (index > -1) { collection.splice(index, 1); };
  },

  setMeteorEmitter: function () {
    var game = this;

    this.meteorInterval = setInterval(function () {
      new Meteor(game);
    }, 1200);
  },

  setKeyListeners: function () {
    var game = this;

    $(window).keydown(function (event) {
      var code = event.keyCode;
      game.ship.activate(code);
    });

    $(window).keyup(function (event) {
      var code = event.keyCode;
      game.ship.deactivate(code);
    });
  },

  clearCanvas: function () {
    var c = this.context;

    c.clearRect(-this.width/2, -this.height/2, this.width, this.height);
  },

  setGameInterval: function () {
    var game        = this;
    var ship        = this.ship;
    var collections = [this.bullets, this.meteors];

    this.runInterval = setInterval(function () {
      // build the next frame
      ship.tick();
      _.each(collections, function (coll) {
        for (var i = coll.length - 1; i >= 0; i--) {
          coll[i].tick();
        };
      });


      _.each(game.meteors, function (meteor) {
        if (ship.collide(meteor)) {
          game.stop();
        };
      });


      // this checks for bullet / meteor collision
      // and acts appropriately
      for (var i = game.bullets.length - 1; i >= 0; i--) {
        var bullet = game.bullets[i];

        for (var j = game.meteors.length -1; j >= 0; j--) {
          var meteor = game.meteors[j];

          if (bullet.collide(meteor)) {
            j = 0;

            game.score += meteor.points();
            
            game.remove(bullet);
            game.remove(meteor);
            Meteor.divide(game, meteor);
          };
        };
      };

      // provide a blank canvas
      game.clearCanvas();

      // render the objects to the blank canvas
      ship.render();
      _.each(collections, function (coll) {
        for (var i = coll.length - 1; i >= 0; i--) {
          coll[i].render();
        };
      });
      game.render();
    }, 30);
  },

  render: function () {
    var c = this.context;
    var message = "Score : " + this.score;

    c.save()
    c.font      = "24px sans-serif";
    c.fillStyle = "#fff";
    c.scale(1, -1);
    c.fillText(message, 12-this.width/2, 36-this.height/2);
    c.restore();
  },

  run: function () {
    this.setMeteorEmitter();
    this.setGameInterval();
  },

  stop: function () {
    var loseMessage = this.setLoseMessage.bind(this);

    clearInterval( this.meteorInterval );
    clearInterval( this.runInterval );

    this.runInterval = this.meteorInterval = undefined;

    setTimeout(loseMessage, 60);
  },

  setLoseMessage: function () {
    var message = "You've lost!";
    var c       = this.context;

    c.save();
    this.clearCanvas();
    c.font      = "48px sans-serif";
    c.textAlign = "center";
    c.fillStyle = "#fff";
    c.scale(1, -1);
    c.fillText(message, 0, 0);
    c.restore();
  },

  setCanvasCoordinates: function () {
    this.context.translate(this.width / 2, this.height / 2);
    this.context.scale(1, -1);
  },

  setCanvasSize: function () {
    this.width = $(window).width();
    this.height = $(window).height();

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    $(this.canvas).css('left', 0).css('top', 0);
  },

  setCanvasResizer: function () {
    var game = this;
    $(window).resize(function (event) {
      game.setCanvasSize();
      game.setCanvasCoordinates();
      game.ship.render();
    });
  }
});
