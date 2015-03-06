function Meteor (game, args) {
  this.game       = game;
  this.context    = game.context;

  this.class      = 'meteor';
  this.asset      = this.game.assets.meteor;

  this.spinTotal  = 0;
  this.spinSpeed  = (Math.random() - 0.5) * Math.PI / 180;

  this.initializeValues(args);

  this.game.add(this);
};

_.extend(Meteor, {
  divide: function (game, meteor) {
    if (meteor.hitRadius > 16) {
      new Meteor(game, {
        hitRadius: meteor.hitRadius/2,
        xPos: meteor.xPos,
        yPos: meteor.yPos,
        theta: meteor.theta + Math.PI/2 + (Math.random()/2 - 0.25),
        speed: meteor.speed + Math.random()
      });

      new Meteor(game, {
        hitRadius: meteor.hitRadius/2,
        xPos: meteor.xPos,
        yPos: meteor.yPos,
        theta: meteor.theta - Math.PI/2 + (Math.random()/2 - 0.25),
        speed: meteor.speed + Math.random()
      });
    };
  }
});

_.extend(Meteor.prototype, {
  points: function () {
    var points;

    switch (this.hitRadius) {
    case 64:
      points = 30;
      break;
    case 32:
      points = 10;
      break;
    default:
      points = 5;
      break;
    };

    return points;
  },

  initializeValues: function (args) {
    var args = args || {};

    this.hitRadius = args.hitRadius || 64;

    if (args.xPos && args.yPos) {
      this.xPos = args.xPos;
      this.yPos = args.yPos;
    } else {
      this.shipSafeRandom();
    };

    this.theta = args.theta || Math.random() * 2 * Math.PI;
    this.speed = args.speed || 0.25 + 2.75 * Math.random();
    this.rotation = 0;
  },

  shipSafeRandom: function () {
    this.xPos = this.game.width * (Math.random() - 0.5);
    this.yPos = this.game.height * (Math.random() - 0.5);

    var x1 = this.xPos, x2 = this.game.ship.xPos;
    var y1 = this.yPos, y2 = this.game.ship.yPos;

    var d = Math.sqrt( (x1-x2) * (x1-x2) + (y1-y2) * (y1-y2) );

    if (d < 128) {
      this.shipSafeRandom();
    };
  },

  render: function () {
    var c = this.context;
    var scale = this.hitRadius / 64;

    c.save();
    c.translate( this.xPos, this.yPos );
    c.rotate( Math.PI - this.theta - this.spinTotal );
    c.scale( scale, scale )
    c.drawImage( this.asset, -64 * scale, -64 * scale );

    c.restore();
  }
}, Tickable, Movable, Wrappable, Spinnable);
